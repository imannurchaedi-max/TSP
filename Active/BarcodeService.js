/**
 * Business logic scan barcode: klasifikasi induk/anak (reprint), penentuan shift, dan state machine
 * pergerakan material (lihat EVENTS di Config.js).
 *
 * Alur Paralel 2 Level:
 * - Level 1 (WRM -> TSP): Scan Kode Unik (Mother Barcode) dari WRM gudang -> terima_wrm.
 * - Level 2 (TSP -> Mesin / Operator): Scan Kode Unik Induk untuk dikirim ke Mesin -> kirim_mesin
 *   (Sistem secara otomatis me-reprint Barcode Anak: <KodeInduk>-01, -02... dan mencatatnya ke REPRINT BARCODE).
 * - Operator Mesin scan Kode Reprint tersebut saat terima_operator dan consume_operator.
 */

function padSeq_(n) {
  return (n < 10 ? '0' : '') + n;
}

/**
 * Klasifikasikan barcode yang discan: Kode Reprint / Kode Anak (dibuat TSP) atau
 * Kode Induk (Mother Barcode dari WRM).
 */
function classifyBarcode_(raw) {
  var match = /^(.+)-(\d{2})$/.exec(raw);
  if (match) {
    var potentialParent = match[1];
    var parentRow = findBarcodeRow_(potentialParent);
    if (parentRow.rowIndex !== -1 && getCellValue_(parentRow, 'DITERIMA OLEH TSP DARI WRM')) {
      return { raw: raw, isChild: true, isParent: false, parentBarcode: potentialParent };
    }
  }
  return { raw: raw, isChild: false, isParent: true, parentBarcode: null };
}

/**
 * Hitung nomor urut reprint berikutnya untuk 1 barcode induk.
 */
function getNextChildSequence_(parentBarcode) {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;

  var parentCol = headerMap['NO RESERVASI'] || headerMap['Parent Barcode'] || headerMap['parent barcode'];
  if (!parentCol) return 1;

  var values = sheet.getRange(2, parentCol, lastRow - 1, 1).getValues();
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === parentBarcode) count++;
  }
  return count + 1;
}

function getShift_(date) {
  return getShiftBounds_(date).shift;
}

/**
 * Return { shift, start, end } untuk shift yang mengandung `date`.
 */
function getShiftBounds_(date) {
  var tz = Session.getScriptTimeZone();
  var hour = parseInt(Utilities.formatDate(date, tz, 'H'), 10);
  var y = parseInt(Utilities.formatDate(date, tz, 'yyyy'), 10);
  var mo = parseInt(Utilities.formatDate(date, tz, 'M'), 10) - 1;
  var d = parseInt(Utilities.formatDate(date, tz, 'd'), 10);

  if (hour >= 6 && hour < 14) {
    return { shift: 'Shift 1', start: new Date(y, mo, d, 6, 0, 0), end: new Date(y, mo, d, 14, 0, 0) };
  }
  if (hour >= 14 && hour < 22) {
    return { shift: 'Shift 2', start: new Date(y, mo, d, 14, 0, 0), end: new Date(y, mo, d, 22, 0, 0) };
  }
  if (hour >= 22) {
    return { shift: 'Shift 3', start: new Date(y, mo, d, 22, 0, 0), end: new Date(y, mo, d + 1, 6, 0, 0) };
  }
  return { shift: 'Shift 3', start: new Date(y, mo, d - 1, 22, 0, 0), end: new Date(y, mo, d, 6, 0, 0) };
}

function formatTimestamp_(value) {
  if (!value) return '';
  var tz = Session.getScriptTimeZone();
  return Utilities.formatDate(new Date(value), tz, 'dd/MM/yyyy HH:mm');
}

function getCellValue_(rowResult, columnName) {
  var col = rowResult.headerMap[columnName] || rowResult.headerMap[String(columnName).toLowerCase()];
  if (!col) return '';
  return rowResult.values[col - 1];
}

/**
 * Utama handler proses scan barcode.
 */
function processScan_(barcodeText, eventCode, mesinCode, jumlah, noReservasi, actorEmail, role) {
  ensureSheetsReady_();

  var eventDef = EVENTS[eventCode];
  if (!eventDef) throw new Error('Event code "' + eventCode + '" tidak dikenal.');

  if (eventDef.role !== role) {
    throw new Error('Akses ditolak: role "' + role + '" tidak berhak melakukan event "' + eventDef.label + '".');
  }

  var raw = String(barcodeText).trim();
  var now = new Date();

  if (eventCode === 'terima_wrm') {
    return handleTerimaWrm_(raw, noReservasi, now);
  }
  if (eventCode === 'kirim_mesin') {
    return handleKirimMesin_(raw, mesinCode, jumlah, now);
  }

  var classified = classifyBarcode_(raw);
  return handleChildCheckpoint_(classified, eventDef, now);
}

/**
 * Event 1: terima_wrm -> scan Kode Unik Mother dari WRM Gudang dengan No. Reservasi.
 */
function handleTerimaWrm_(raw, noReservasi, now) {
  var existingRow = findBarcodeRow_(raw);
  if (existingRow.rowIndex !== -1) {
    throw new Error('Barcode "' + raw + '" sudah terdaftar sebelumnya di sheet Barcode.');
  }

  var wrmRow = lookupWrmIncoming_(raw);
  if (wrmRow.rowIndex === -1) {
    throw new Error('Barcode "' + raw + '" tidak ditemukan di sheet BARCODE INCOMING WRM.');
  }

  var aksiStatus = getCellValue_(wrmRow, 'AKSI');
  if (aksiStatus && String(aksiStatus).trim().toUpperCase() === 'HOLD') {
    var reason = getCellValue_(wrmRow, 'Reason hold') || 'Dalam status HOLD di WRM';
    throw new Error('Barcode "' + raw + '" tidak dapat diterima: ' + reason);
  }

  var mid = getCellValue_(wrmRow, 'Mid');
  var deskripsi = getCellValue_(wrmRow, 'Description');
  var qtyPalet = Number(getCellValue_(wrmRow, 'Qty /Palet')) || Number(getCellValue_(wrmRow, 'Qty Kirim')) || 0;

  var newRow = {
    'TANGGAL': formatTimestamp_(now),
    'SHIFT': getShift_(now),
    'BARCODE': raw,
    'NO RESERVASI': noReservasi || '',
    'MID': mid,
    'MATERIAL DESCRIPTION': deskripsi,
    'JUMLAH': qtyPalet,
    'DITERIMA OLEH TSP DARI WRM': formatTimestamp_(now)
  };

  appendBarcodeRow_(newRow);

  var msg = 'Berhasil Menerima Material dari WRM:\n' +
    '• No. Reservasi: ' + (noReservasi || '-') + '\n' +
    '• MID: ' + mid + '\n' +
    '• Nama Material: ' + deskripsi + '\n' +
    '• Jumlah Diserahkan: ' + qtyPalet;

  return {
    success: true,
    barcode: raw,
    event: 'terima_wrm',
    message: msg,
    details: newRow
  };
}

/**
 * Event 2: kirim_mesin -> scan Kode Unik Induk, REPRINT Barcode Anak (<KodeInduk>-01), dan kirim ke Mesin.
 */
function handleKirimMesin_(raw, mesinCode, jumlah, now) {
  if (!mesinCode) throw new Error('Mesin harus dipilih untuk event Kirim ke Mesin.');
  var qtyNum = Number(jumlah);
  if (isNaN(qtyNum) || qtyNum <= 0) throw new Error('Jumlah yang dikirim harus lebih besar dari 0.');

  var parentRow = findBarcodeRow_(raw);
  if (parentRow.rowIndex === -1) {
    throw new Error('Barcode Induk "' + raw + '" belum diterima oleh TSP dari WRM.');
  }

  var tsTerima = getCellValue_(parentRow, 'DITERIMA OLEH TSP DARI WRM');
  if (!tsTerima) {
    throw new Error('Barcode Induk "' + raw + '" belum dikonfirmasi penerimaannya dari WRM.');
  }

  var parentMid = getCellValue_(parentRow, 'MID');
  var parentDesc = getCellValue_(parentRow, 'MATERIAL DESCRIPTION');

  // Generate Kode Reprint / Kode Anak
  var seq = getNextChildSequence_(raw);
  var childBarcode = raw + '-' + padSeq_(seq);

  var childRow = {
    'TANGGAL': formatTimestamp_(now),
    'SHIFT': getShift_(now),
    'BARCODE': childBarcode,
    'NO RESERVASI': raw,
    'MID': parentMid,
    'MATERIAL DESCRIPTION': parentDesc,
    'JUMLAH': qtyNum,
    'DITERIMA OLEH TSP DARI WRM': formatTimestamp_(now),
    'DIKIRIM OLEH TSP KE MESIN': formatTimestamp_(now)
  };

  appendBarcodeRow_(childRow);

  // Log penerbitan barcode reprint ke sheet REPRINT BARCODE
  var reprintLog = {
    'TANGGAL': formatTimestamp_(now),
    'SHIFT': getShift_(now),
    'BARCODE': raw,
    'MID': parentMid,
    'MATERIAL DESCRIPTION': parentDesc,
    'BARCODE REPRINT': childBarcode,
    'JUMLAH': qtyNum
  };
  appendReprintRow_(reprintLog);

  return {
    success: true,
    barcode: childBarcode,
    parentBarcode: raw,
    event: 'kirim_mesin',
    message: 'Berhasil reprint Kode Anak "' + childBarcode + '" (Qty: ' + qtyNum + ') dikirim ke ' + mesinCode,
    details: childRow
  };
}

/**
 * Event 3, 4, 5, 6 -> Operasi pada Barcode Reprint / Kode Anak.
 */
function handleChildCheckpoint_(classified, eventDef, now) {
  var raw = classified.raw;
  var barcodeRow = findBarcodeRow_(raw);

  if (barcodeRow.rowIndex === -1) {
    throw new Error('Kode Reprint "' + raw + '" tidak ditemukan di sistem.');
  }

  var prereqCol = eventDef.prerequisite ? EVENTS[eventDef.prerequisite].column : null;
  if (prereqCol) {
    var prereqVal = getCellValue_(barcodeRow, prereqCol);
    if (!prereqVal) {
      throw new Error('Prasyarat "' + EVENTS[eventDef.prerequisite].label + '" belum dilakukan untuk barcode "' + raw + '".');
    }
  }

  var currentVal = getCellValue_(barcodeRow, eventDef.column);
  if (currentVal) {
    throw new Error('Event "' + eventDef.label + '" sudah pernah dicatat sebelumnya untuk barcode "' + raw + '".');
  }

  updateBarcodeCell_(barcodeRow.rowIndex, eventDef.column, formatTimestamp_(now));

  return {
    success: true,
    barcode: raw,
    event: eventDef.label,
    message: 'Berhasil mencatat checkpoint "' + eventDef.label + '" untuk barcode ' + raw
  };
}
