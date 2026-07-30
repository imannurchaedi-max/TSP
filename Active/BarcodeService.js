/**
 * Business logic scan barcode: klasifikasi induk/anak, penentuan shift, dan state machine
 * pergerakan material (lihat EVENTS di Config.js).
 *
 * Kode Unik dari WRM (label pallet fisik, mis. "DTA15M2708199") adalah kode OPAK -- tidak
 * mengandung MID/qty di dalamnya. MID/Deskripsi/Qty/status pallet di-LOOKUP dari sheet
 * "BARCODE INCOMING WRM" (lihat lookupWrmIncoming_ di SheetService.js), bukan diparsing dari
 * teks barcode-nya.
 *
 * Barcode reprint (dibuat TSP saat "Kirim ke Mesin") = KodeUnikInduk + "-" + urutan 2 digit,
 * mis. "DTA15M2708199-01". Klasifikasi induk vs anak (lihat classifyBarcode_) dilakukan
 * dengan mengecek pola suffix ini + apakah bagian sebelum suffix sudah terdaftar sebagai
 * baris induk -- BUKAN dengan asumsi format Kode Unik WRM (supaya tahan kalau WRM ganti
 * format kode-nya lagi).
 */

function padSeq_(n) {
  return (n < 10 ? '0' : '') + n;
}

/**
 * Klasifikasikan barcode yang discan: ANAK (kode reprint buatan TSP sendiri) atau
 * INDUK (Kode Unik mentah dari WRM, atau barcode apapun yang belum dikenali sebagai anak).
 */
function classifyBarcode_(raw) {
  var match = /^(.+)-(\d{2})$/.exec(raw);
  if (match) {
    var potentialParent = match[1];
    var parentRow = findBarcodeRow_(potentialParent);
    if (parentRow.rowIndex !== -1 && getCellValue_(parentRow, 'Diterima Oleh TSP dari WRM')) {
      return { raw: raw, isChild: true, isParent: false, parentBarcode: potentialParent };
    }
  }
  return { raw: raw, isChild: false, isParent: true, parentBarcode: null };
}

/**
 * Hitung nomor urut reprint berikutnya untuk 1 barcode induk, dengan menghitung
 * berapa baris ANAK yang sudah punya "Parent Barcode" = parentBarcode tsb.
 */
function getNextChildSequence_(parentBarcode) {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;

  var parentCol = headerMap['Parent Barcode'];
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
 * Return { shift, start, end } (Date objects) untuk shift yang mengandung `date`.
 * Shift 3 (22:00-06:00) membungkus tengah malam, jadi start/end bisa beda hari kalender.
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
  // hour < 6 -> masih bagian shift 3 yang mulai kemarin malam
  return { shift: 'Shift 3', start: new Date(y, mo, d - 1, 22, 0, 0), end: new Date(y, mo, d, 6, 0, 0) };
}

function formatTimestamp_(value) {
  if (!value) return '';
  var tz = Session.getScriptTimeZone();
  return Utilities.formatDate(new Date(value), tz, 'dd/MM/yyyy HH:mm');
}

function getCellValue_(rowResult, columnName) {
  var col = rowResult.headerMap[columnName];
  if (!col) return '';
  return rowResult.values[col - 1];
}

/**
 * Proses satu event scan. Melempar Error dengan pesan yang aman ditampilkan ke user
 * kalau validasi gagal; return objek hasil kalau sukses.
 */
function processScan_(barcodeText, eventCode, mesinCode, jumlah, actorEmail, role) {
  ensureSheetsReady_();

  var eventDef = EVENTS[eventCode];
  if (!eventDef) {
    throw new Error('Event "' + eventCode + '" tidak dikenali.');
  }
  if (eventDef.role !== role) {
    throw new Error('Aksi "' + eventDef.label + '" bukan untuk role ini.');
  }

  var now = new Date();
  var raw = String(barcodeText).trim();

  if (eventCode === 'terima_wrm') {
    return handleTerimaWrm_(raw, now);
  }
  if (eventCode === 'kirim_mesin') {
    return handleKirimMesin_(raw, mesinCode, jumlah, now);
  }

  var classified = classifyBarcode_(raw);
  return handleChildCheckpoint_(classified, eventDef, now);
}

/**
 * Scan Kode Unik mentah dari WRM -> bikin baris induk baru.
 * MID/Deskripsi/Jumlah/status pallet SEMUA di-lookup dari sheet "BARCODE INCOMING WRM"
 * (fungsi `lookupWrmIncoming_` di SheetService.js) -- tidak ada input manual, dan tidak ada
 * parsing teks barcode, sesuai tujuan "otomatis lewat scan, tanpa catat manual".
 */
function handleTerimaWrm_(raw, now) {
  var existing = findBarcodeRow_(raw);
  if (existing.rowIndex !== -1) {
    throw new Error('Barcode "' + raw + '" sudah pernah diterima dari WRM pada ' +
      formatTimestamp_(getCellValue_(existing, 'Diterima Oleh TSP dari WRM')) + '.');
  }

  var wrmData = lookupWrmIncoming_(raw);
  if (!wrmData) {
    throw new Error('Kode Unik "' + raw + '" tidak ditemukan di data WRM (BARCODE INCOMING WRM).');
  }
  if (String(wrmData.aksi).trim() !== 'VERIFIED') {
    throw new Error('Pallet ini belum diverifikasi WRM (status: ' + wrmData.aksi + ').');
  }
  if (/^HOLD/i.test(String(wrmData.keterangan || '').trim())) {
    throw new Error('Pallet ini sedang "' + wrmData.keterangan + '", tidak bisa diterima.');
  }

  appendBarcodeRow_({
    'Tanggal': now,
    'Shift': getShift_(now),
    'Barcode': raw,
    'MID': wrmData.mid,
    'Material Description': wrmData.deskripsi,
    'Jumlah': wrmData.qty,
    'Diterima Oleh TSP dari WRM': now
  });

  return {
    message: 'Terima dari WRM berhasil: ' + wrmData.deskripsi + ' (' + wrmData.qty + ' ' + wrmData.uom + ')'
  };
}

/**
 * Scan Kode Unik WRM yang sama (induk) untuk mengirim sebagian qty ke mesin.
 * Sistem generate kode reprint (anak) baru & bikin baris baru untuk pecahan ini.
 */
function handleKirimMesin_(raw, mesinCode, jumlah, now) {
  if (!mesinCode || MESIN_LIST.indexOf(mesinCode) === -1) {
    throw new Error('Pilih mesin tujuan yang valid.');
  }
  var qtyNum = Number(jumlah);
  if (!jumlah || isNaN(qtyNum) || qtyNum <= 0) {
    throw new Error('Isi jumlah yang dikirim (angka lebih dari 0).');
  }

  var parentRow = findBarcodeRow_(raw);
  if (parentRow.rowIndex === -1 || !getCellValue_(parentRow, 'Diterima Oleh TSP dari WRM')) {
    throw new Error('Barcode "' + raw + '" belum diterima dari WRM. Scan "Terima dari WRM" dulu.');
  }

  var seq = getNextChildSequence_(raw);
  var childBarcode = raw + '-' + padSeq_(seq);
  var mid = getCellValue_(parentRow, 'MID');
  var deskripsi = getCellValue_(parentRow, 'Material Description');

  appendBarcodeRow_({
    'Tanggal': now,
    'Shift': getShift_(now),
    'Barcode': childBarcode,
    'Parent Barcode': raw,
    'MID': mid,
    'Material Description': deskripsi,
    'Jumlah': qtyNum,
    'Mesin': mesinCode,
    'Dikirim Oleh TSP ke Mesin': now
  });

  return {
    message: 'Kirim ke Mesin berhasil: ' + deskripsi + ' (' + qtyNum + ') ke ' + mesinCode +
      '. Cetak label baru dengan kode: ' + childBarcode,
    childBarcode: childBarcode
  };
}

/**
 * Event terminal (retur_dari_mesin, retur_ke_wrm, terima_operator, consume_operator):
 * beroperasi pada baris ANAK yang sudah ada, discan pakai kode reprint.
 */
function handleChildCheckpoint_(classified, eventDef, now) {
  if (!classified.isChild) {
    throw new Error('Untuk aksi ini, scan kode REPRINT dari TSP (bukan Kode Unik asli WRM).');
  }

  var rowResult = findBarcodeRow_(classified.raw);
  if (rowResult.rowIndex === -1) {
    throw new Error('Kode reprint "' + classified.raw + '" belum terdaftar di sistem.');
  }

  var prereqDef = EVENTS[eventDef.prerequisite];
  var prereqValue = getCellValue_(rowResult, prereqDef.column);
  if (!prereqValue) {
    throw new Error('Barcode ini belum melewati tahap "' + prereqDef.label + '".');
  }

  var currentValue = getCellValue_(rowResult, eventDef.column);
  if (currentValue) {
    throw new Error('Barcode ini sudah "' + eventDef.label + '" pada ' + formatTimestamp_(currentValue) + '.');
  }

  updateBarcodeCell_(rowResult.rowIndex, eventDef.column, now);

  var deskripsi = getCellValue_(rowResult, 'Material Description');
  var jumlahVal = getCellValue_(rowResult, 'Jumlah');
  return {
    message: eventDef.label + ' berhasil: ' + deskripsi + ' (' + jumlahVal + ')'
  };
}
