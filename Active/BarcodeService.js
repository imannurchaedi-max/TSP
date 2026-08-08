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
    return { shift: '1', start: new Date(y, mo, d, 6, 0, 0), end: new Date(y, mo, d, 14, 0, 0) };
  }
  if (hour >= 14 && hour < 22) {
    return { shift: '2', start: new Date(y, mo, d, 14, 0, 0), end: new Date(y, mo, d, 22, 0, 0) };
  }
  if (hour >= 22) {
    return { shift: '3', start: new Date(y, mo, d, 22, 0, 0), end: new Date(y, mo, d + 1, 6, 0, 0) };
  }
  return { shift: '3', start: new Date(y, mo, d - 1, 22, 0, 0), end: new Date(y, mo, d, 6, 0, 0) };
}

function formatTimestamp_(value) {
  if (!value) return '';
  var tz = Session.getScriptTimeZone();
  return Utilities.formatDate(new Date(value), tz, 'dd/MM/yyyy HH:mm');
}

function getCellValue_(rowResult, columnName) {
  var cleanName = String(columnName).trim();
  var col = rowResult.headerMap[cleanName] || rowResult.headerMap[cleanName.toLowerCase()];
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

  if (eventDef.role !== role && role !== 'spv') {
    throw new Error('Akses ditolak: role "' + role + '" tidak berhak melakukan event "' + eventDef.label + '".');
  }

  var raw = String(barcodeText).trim();
  var now = new Date();

  var res;
  if (eventCode === 'terima_wrm') {
    res = handleTerimaWrm_(raw, noReservasi, now);
  } else if (eventCode === 'kirim_mesin') {
    res = handleKirimMesin_(raw, mesinCode, jumlah, now);
  } else {
    var classified = classifyBarcode_(raw);
    res = handleChildCheckpoint_(classified, eventDef, now, mesinCode, eventCode);
  }

  return res;
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
    throw new Error('Barcode "' + raw + '" tidak ditemukan di sheet BARCODE OUTBOUND WRM.');
  }

  var mid = getCellValue_(wrmRow, 'MID') || getCellValue_(wrmRow, 'MID ');
  var deskripsi = getCellValue_(wrmRow, 'DESC');
  var qtyPalet = Number(getCellValue_(wrmRow, 'QTY')) || 0;

  // Validasi / Kawinkan MID hasil scan dengan Nomor Reservasi (dari BARCODE OUTBOUND WRM)
  validateMidInReservasi_(noReservasi, mid);

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

  var stockSynced = true;
  try {
    stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_TSP, mid, 'Barang Masuk', qtyPalet, now);
  } catch(e) {
    stockSynced = false;
  }

  var msg = 'Berhasil Menerima Material dari WRM:\n' +
    '• No. Reservasi: ' + (noReservasi || '-') + '\n' +
    '• MID: ' + mid + '\n' +
    '• Nama Material: ' + deskripsi + '\n' +
    '• Jumlah Diserahkan: ' + qtyPalet;

  if (!stockSynced) {
    msg += '\n\n⚠️ PERHATIAN: Barcode berhasil dicatat, TAPI Stock TSP BELUM tersinkron untuk shift ini ' +
      '(kemungkinan "Tarik Stok Awal Shift" belum dilakukan). Hubungi Admin TSP untuk Tarik Stok Awal, ' +
      'lalu minta Admin TSP memverifikasi ulang transaksi ini agar tercatat di Stock TSP.';
  }

  return {
    success: true,
    warning: !stockSynced,
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

  var stockSynced = true;
  try {
    stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_TSP, parentMid, 'Kirim ' + mesinCode, qtyNum, now);
  } catch(e) {
    stockSynced = false;
  }

  var msg = 'Berhasil reprint Kode Anak "' + childBarcode + '" (Qty: ' + qtyNum + ') dikirim ke ' + mesinCode;
  if (!stockSynced) {
    msg += '\n\n⚠️ PERHATIAN: Barcode berhasil dicatat, TAPI Stock TSP BELUM tersinkron untuk shift ini ' +
      '(kemungkinan "Tarik Stok Awal Shift" belum dilakukan). Hubungi Admin TSP untuk Tarik Stok Awal, ' +
      'lalu minta Admin TSP memverifikasi ulang transaksi ini agar tercatat di Stock TSP.';
  }

  return {
    success: true,
    warning: !stockSynced,
    barcode: childBarcode,
    parentBarcode: raw,
    event: 'kirim_mesin',
    message: msg,
    details: childRow
  };
}

/**
 * Event 3, 4, 5, 6 -> Operasi pada Barcode Reprint / Kode Anak.
 */
function handleChildCheckpoint_(classified, eventDef, now, mesinCode, eventCode) {
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

  var stockSynced = true;
  try {
    var mid = getCellValue_(barcodeRow, 'MID');
    var qty = Number(getCellValue_(barcodeRow, 'JUMLAH')) || 0;

    // Fallback: cari mesinCode di barcodeRow jika undefined (kadang retur dari TSP tidak isi mesin dari frontend)
    var activeMesin = mesinCode;
    if (!activeMesin && eventCode === 'retur_dari_mesin') {
      var logSheet = getSheet_(SHEET_NAMES.LOG);
      var lastR = logSheet.getLastRow();
      if (lastR > 1) {
        var logData = logSheet.getRange(Math.max(2, lastR - 500), 1, 500, 6).getValues();
        for (var n = logData.length - 1; n >= 0; n--) {
          if (logData[n][1] === raw && logData[n][2] === 'terima_operator' && logData[n][5]) {
            activeMesin = logData[n][5];
            break;
          }
        }
      }
    }

    if (eventCode === 'terima_operator' && activeMesin) {
       stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_MESIN, mid, 'Terima ' + activeMesin, qty, now);
    } else if (eventCode === 'consume_operator' && activeMesin) {
       stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_MESIN, mid, 'Consume ' + activeMesin, qty, now);
    } else if (eventCode === 'retur_dari_mesin') {
       if (activeMesin) {
         var syncedTsp = incrementStockCell_(SHEET_NAMES.STOCK_TSP, mid, 'Return ' + activeMesin, qty, now);
         var syncedMesin = incrementStockCell_(SHEET_NAMES.STOCK_MESIN, mid, 'Return ' + activeMesin, qty, now);
         stockSynced = syncedTsp && syncedMesin;
       } else {
         // Fallback manual jika gagal lookup
         stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_TSP, mid, 'Return', qty, now);
       }
    } else if (eventCode === 'retur_ke_wrm') {
       stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_TSP, mid, 'MATCLAIM WRM', qty, now);
    }
  } catch(e) {
    stockSynced = false;
  }

  var msg = 'Berhasil mencatat checkpoint "' + eventDef.label + '" untuk barcode ' + raw;
  if (!stockSynced) {
    msg += '\n\n⚠️ PERHATIAN: Checkpoint berhasil dicatat, TAPI Stock TSP/Stock Mesin BELUM tersinkron untuk shift ini ' +
      '(kemungkinan "Tarik Stok Awal Shift" belum dilakukan). Hubungi Admin TSP untuk Tarik Stok Awal, ' +
      'lalu minta Admin TSP memverifikasi ulang transaksi ini agar tercatat di Stock.';
  }

  return {
    success: true,
    warning: !stockSynced,
    barcode: raw,
    event: eventDef.label,
    message: msg
  };
}

/**
 * REPRINT MODULE: Mengambil histori data reprint berdasarkan Kode Induk.
 */
function getReprintData_(parentBarcode) {
  var parentStr = String(parentBarcode).trim();
  if (!parentStr) throw new Error('Kode induk kosong.');

  // 1. Verifikasi Kode Induk ada di BARCODE MATERIAL PRODUKSI dan sudah diterima dari WRM
  var parentRow = findBarcodeRow_(parentStr);
  if (parentRow.rowIndex === -1) {
    throw new Error('Kode Induk "' + parentStr + '" belum pernah diterima/diregister di sistem TSP.');
  }

  var tsTerima = getCellValue_(parentRow, 'DITERIMA OLEH TSP DARI WRM');
  if (!tsTerima) {
    throw new Error('Kode Induk "' + parentStr + '" belum dikonfirmasi penerimaannya dari WRM (belum scan masuk).');
  }

  var mid = getCellValue_(parentRow, 'MID');
  var desc = getCellValue_(parentRow, 'MATERIAL DESCRIPTION');

  // 2. Kumpulkan Histori Reprint Anak dari REPRINT BARCODE
  var sheet = getSheet_(SHEET_NAMES.REPRINT);
  var hm = getHeaderMap_(sheet);
  var colInduk = hm['barcode'] || 3;
  var colAnak = hm['barcode reprint'] || 6;
  var colJumlah = hm['jumlah'] || 7;
  var colTanggal = hm['tanggal'] || 1;
  var colShift = hm['shift'] || 2;

  var lastRow = sheet.getLastRow();
  var history = [];

  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (String(row[colInduk - 1]).trim() === parentStr) {
        history.push({
          barcodeInduk: parentStr,
          barcodeAnak: String(row[colAnak - 1]).trim(),
          mid: mid,
          deskripsi: desc,
          jumlah: Number(row[colJumlah - 1]) || 0,
          tanggal: row[colTanggal - 1] instanceof Date ? formatTimestamp_(row[colTanggal - 1]) : row[colTanggal - 1],
          shift: row[colShift - 1]
        });
      }
    }
  }

  // Jika belum ada history, setidaknya kembalikan 1 record mock sebagai identifier induk
  if (history.length === 0) {
    history.push({
      barcodeInduk: parentStr,
      barcodeAnak: parentStr + '-00', // Pancingan untuk next sequence 01
      mid: mid,
      deskripsi: desc,
      jumlah: 0,
      tanggal: formatTimestamp_(new Date()),
      shift: getShift_(new Date())
    });
  }

  return history;
}

/**
 * REPRINT MODULE: Menyimpan sejumlah label reprint ke REPRINT BARCODE 
 * dan mendaftarkannya ke BARCODE MATERIAL PRODUKSI.
 */
function saveBatchReprint_(labels) {
  if (!labels || labels.length === 0) throw new Error('Tidak ada label yang dicetak.');
  
  var now = new Date();
  var shift = getShift_(now);
  var ts = formatTimestamp_(now);

  var reprintSheet = getSheet_(SHEET_NAMES.REPRINT);
  var prodSheet = getSheet_(SHEET_NAMES.BARCODE);
  
  var reprintHm = getHeaderMap_(reprintSheet);
  var prodHm = getHeaderMap_(prodSheet);

  var maxColRep = reprintSheet.getLastColumn();
  var maxColProd = prodSheet.getLastColumn();

  var repRowsToAppend = [];
  var prodRowsToAppend = [];

  for (var i = 0; i < labels.length; i++) {
    var lbl = labels[i];

    // 1. Row untuk REPRINT BARCODE
    var rRow = new Array(maxColRep).fill('');
    if (reprintHm['tanggal']) rRow[reprintHm['tanggal'] - 1] = ts;
    if (reprintHm['shift']) rRow[reprintHm['shift'] - 1] = shift;
    if (reprintHm['barcode']) rRow[reprintHm['barcode'] - 1] = lbl.barcodeInduk;
    if (reprintHm['mid']) rRow[reprintHm['mid'] - 1] = lbl.mid;
    if (reprintHm['material description']) rRow[reprintHm['material description'] - 1] = lbl.deskripsi;
    if (reprintHm['barcode reprint']) rRow[reprintHm['barcode reprint'] - 1] = lbl.barcodeAnak;
    if (reprintHm['jumlah']) rRow[reprintHm['jumlah'] - 1] = lbl.jumlah;
    repRowsToAppend.push(rRow);

    // 2. Row untuk BARCODE MATERIAL PRODUKSI (Agar bisa di-scan operator mesin nanti)
    var pRow = new Array(maxColProd).fill('');
    if (prodHm['tanggal']) pRow[prodHm['tanggal'] - 1] = ts;
    if (prodHm['shift']) pRow[prodHm['shift'] - 1] = shift;
    if (prodHm['barcode']) pRow[prodHm['barcode'] - 1] = lbl.barcodeAnak;
    if (prodHm['no reservasi']) pRow[prodHm['no reservasi'] - 1] = lbl.barcodeInduk;
    if (prodHm['mid']) pRow[prodHm['mid'] - 1] = lbl.mid;
    if (prodHm['material description']) pRow[prodHm['material description'] - 1] = lbl.deskripsi;
    if (prodHm['jumlah']) pRow[prodHm['jumlah'] - 1] = lbl.jumlah;
    if (prodHm['diterima oleh tsp dari wrm']) pRow[prodHm['diterima oleh tsp dari wrm'] - 1] = ts;
    prodRowsToAppend.push(pRow);
  }

  // Gunakan teknik batch append untuk performa Google Sheets
  if (repRowsToAppend.length > 0) {
    reprintSheet.getRange(reprintSheet.getLastRow() + 1, 1, repRowsToAppend.length, maxColRep).setValues(repRowsToAppend);
  }
  if (prodRowsToAppend.length > 0) {
    prodSheet.getRange(prodSheet.getLastRow() + 1, 1, prodRowsToAppend.length, maxColProd).setValues(prodRowsToAppend);
  }

  return { success: true, message: labels.length + ' label reprint berhasil direkam ke database.' };
}
