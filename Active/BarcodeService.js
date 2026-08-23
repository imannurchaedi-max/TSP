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
  var match = /^(.+)-(?:\d{2}|R\d*)$/.exec(raw);
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

  var barcodeCol = headerMap['BARCODE'] || headerMap['barcode'];
  if (!barcodeCol) return 1;

  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var highest = 0;
  var expression = new RegExp('^' + escapeRegex_(parentBarcode) + '-(\\d+)$');
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][parentCol - 1]).trim() !== parentBarcode) continue;
    var match = expression.exec(String(values[i][barcodeCol - 1]).trim());
    if (match) highest = Math.max(highest, Number(match[1]) || 0);
  }
  return highest + 1;
}

function escapeRegex_(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  var parentQty = Number(getCellValue_(parentRow, 'JUMLAH')) || 0;
  if (parentQty === 0) {
    try {
      var wrmRow = lookupWrmIncoming_(parentStr);
      if (wrmRow && wrmRow.rowIndex !== -1) {
        parentQty = Number(getCellValue_(wrmRow, 'QTY')) || 0;
      }
    } catch (e) {
      // Ignore
    }
  }

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

  return { history: history, parentQty: parentQty };
}

/**
 * REPRINT MODULE: Menyimpan sejumlah label reprint ke REPRINT BARCODE 
 * dan mendaftarkannya ke BARCODE MATERIAL PRODUKSI.
 */
function saveBatchReprint_(requestedLabels) {
  if (!Array.isArray(requestedLabels) || requestedLabels.length === 0) {
    throw new Error('Tidak ada label yang dicetak.');
  }
  if (requestedLabels.length > 20) throw new Error('Maksimum 20 label per proses reprint.');

  var parentBarcode = String(requestedLabels[0].barcodeInduk || '').trim();
  if (!parentBarcode) throw new Error('Kode induk wajib diisi.');
  var isRetur = requestedLabels[0].isRetur === true;
  var requestedQty = [];
  for (var i = 0; i < requestedLabels.length; i++) {
    var item = requestedLabels[i] || {};
    if (String(item.barcodeInduk || '').trim() !== parentBarcode) {
      throw new Error('Semua label harus menggunakan kode induk yang sama.');
    }
    if ((item.isRetur === true) !== isRetur) {
      throw new Error('Mode label reprint tidak boleh dicampur dengan mode retur.');
    }
    var qty = Number(item.jumlah);
    if (!isFinite(qty) || qty <= 0) throw new Error('Jumlah setiap label harus lebih besar dari 0.');
    requestedQty.push(qty);
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    var reprintData = getReprintData_(parentBarcode);
    var parent = reprintData.history[0];
    var alreadyPrinted = 0;
    for (var j = 0; j < reprintData.history.length; j++) {
      if (!/-00$/.test(String(reprintData.history[j].barcodeAnak || ''))) {
        alreadyPrinted += Number(reprintData.history[j].jumlah) || 0;
      }
    }
    var totalRequested = requestedQty.reduce(function(sum, qty) { return sum + qty; }, 0);
    var remainingQty = Math.max(0, (Number(reprintData.parentQty) || 0) - alreadyPrinted);
    if (totalRequested > remainingQty) {
      throw new Error('Jumlah reprint (' + totalRequested + ') melebihi sisa stok induk (' + remainingQty + ').');
    }

    var nextSequence = getNextChildSequence_(parentBarcode);
    var nextReturSequence = 1;
    var returPattern = new RegExp('^' + escapeRegex_(parentBarcode) + '-R(\\d*)$');
    for (var h = 0; h < reprintData.history.length; h++) {
      var returMatch = returPattern.exec(String(reprintData.history[h].barcodeAnak || ''));
      if (returMatch) nextReturSequence = Math.max(nextReturSequence, (Number(returMatch[1]) || 0) + 1);
    }

    var labels = [];
    for (var k = 0; k < requestedQty.length; k++) {
      var suffix = isRetur ? '-R' + padSeq_(nextReturSequence + k) : '-' + padSeq_(nextSequence + k);
      labels.push({
        barcodeInduk: parentBarcode,
        barcodeAnak: parentBarcode + suffix,
        mid: parent.mid,
        deskripsi: parent.deskripsi,
        jumlah: requestedQty[k],
        isRetur: isRetur
      });
    }

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

    for (var l = 0; l < labels.length; l++) {
      var lbl = labels[l];
      if (findBarcodeRow_(lbl.barcodeAnak).rowIndex !== -1) {
        throw new Error('Barcode reprint ' + lbl.barcodeAnak + ' sudah terdaftar. Coba ulangi proses.');
      }
      var rRow = new Array(maxColRep).fill('');
      if (reprintHm['tanggal']) rRow[reprintHm['tanggal'] - 1] = ts;
      if (reprintHm['shift']) rRow[reprintHm['shift'] - 1] = shift;
      if (reprintHm['barcode']) rRow[reprintHm['barcode'] - 1] = lbl.barcodeInduk;
      if (reprintHm['mid']) rRow[reprintHm['mid'] - 1] = lbl.mid;
      if (reprintHm['material description']) rRow[reprintHm['material description'] - 1] = lbl.deskripsi;
      if (reprintHm['barcode reprint']) rRow[reprintHm['barcode reprint'] - 1] = lbl.barcodeAnak;
      if (reprintHm['jumlah']) rRow[reprintHm['jumlah'] - 1] = lbl.jumlah;
      repRowsToAppend.push(rRow);

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

    reprintSheet.getRange(reprintSheet.getLastRow() + 1, 1, repRowsToAppend.length, maxColRep).setValues(repRowsToAppend);
    prodSheet.getRange(prodSheet.getLastRow() + 1, 1, prodRowsToAppend.length, maxColProd).setValues(prodRowsToAppend);
    return { success: true, message: labels.length + ' label reprint berhasil direkam ke database.', data: { labels: labels } };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/**
 * Kolom checkpoint hilir di BARCODE MATERIAL PRODUKSI yang menandakan sebuah barcode anak
 * SUDAH dipakai di lantai produksi. Kalau salah satu terisi, barcode itu bukan lagi label
 * salah cetak -- menghapusnya berarti membuang riwayat transaksi aktif dan merusak neraca
 * stok. Kolom 'DITERIMA OLEH TSP DARI WRM' dan 'DIKIRIM OLEH TSP KE MESIN' sengaja TIDAK
 * masuk daftar ini karena keduanya sudah terisi sejak barcode anak diterbitkan.
 */
var REPRINT_DELETE_BLOCKING_COLUMNS_ = [
  'DITERIMA OLEH OPERATOR DARI TSP',
  'DICONSUME OLEH OPERATOR',
  'RETUR DITARIK OLEH TSP DARI MESIN',
  'RETUR DIKIRIM KEMBALI OLEH TSP KE WRM'
];

/**
 * REPRINT MODULE: Menghapus barcode reprint (anak) dari REPRINT BARCODE
 * dan dari BARCODE MATERIAL PRODUKSI.
 *
 * Tiga pengaman yang wajib ada:
 *  1. Barcode HARUS terdaftar di kolom "BARCODE REPRINT" sheet REPRINT BARCODE. Tanpa cek ini
 *     barcode induk (atau barcode produksi apa pun) bisa ikut terhapus, karena pencarian di
 *     sheet produksi berjalan independen dari pencarian di sheet reprint.
 *  2. Barcode anak yang sudah punya checkpoint operator ditolak. Role spv boleh override
 *     (force = true) untuk kasus koreksi data, dan override-nya dicatat di Log Aktivitas.
 *  3. Seluruh operasi dibungkus script lock + rollback kompensasi: kalau penghapusan baris
 *     kedua gagal, baris pertama dikembalikan supaya kedua sheet tidak pernah berbeda isi.
 *
 * @param {string} barcodeAnak Kode anak yang mau dihapus.
 * @param {{nik: string, nama: string, role: string}=} actor Hasil requireRole_() dari pemanggil.
 * @param {boolean=} force Override checkpoint, hanya berlaku untuk role spv.
 */
function deleteReprintBarcode_(barcodeAnak, actor, force) {
  var target = String(barcodeAnak == null ? '' : barcodeAnak).trim();
  if (!target) throw new Error('Barcode anak tidak valid.');

  var actorRole = (actor && actor.role) ? String(actor.role) : '';
  var actorLabel = (actor && actor.nik) ? (actor.nik + ' - ' + (actor.nama || '')) : '';

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // --- 1. Barcode wajib terdaftar sebagai barcode anak di REPRINT BARCODE ---
    var reprintSheet = getSheet_(SHEET_NAMES.REPRINT);
    var repHm = getHeaderMap_(reprintSheet);
    var colRepAnak = repHm['barcode reprint'];
    if (!colRepAnak) {
      throw new Error('Kolom "BARCODE REPRINT" tidak ditemukan di sheet ' + SHEET_NAMES.REPRINT + '.');
    }

    var repData = reprintSheet.getDataRange().getValues();
    var repRowIndex = -1;
    for (var i = repData.length - 1; i >= 1; i--) {
      if (String(repData[i][colRepAnak - 1]).trim() === target) {
        repRowIndex = i + 1; // 1-based row di sheet
        break;
      }
    }
    if (repRowIndex === -1) {
      throw new Error('Barcode "' + target + '" tidak terdaftar sebagai Barcode Reprint. ' +
        'Hanya barcode anak hasil reprint yang boleh dihapus dari riwayat.');
    }

    // --- 2. Tolak kalau barcode anak sudah dipakai di lantai produksi ---
    var prodRow = findBarcodeRow_(target);
    var blocking = [];
    if (prodRow.rowIndex !== -1) {
      for (var c = 0; c < REPRINT_DELETE_BLOCKING_COLUMNS_.length; c++) {
        if (getCellValue_(prodRow, REPRINT_DELETE_BLOCKING_COLUMNS_[c])) {
          blocking.push(REPRINT_DELETE_BLOCKING_COLUMNS_[c]);
        }
      }
    }

    var forced = false;
    if (blocking.length > 0) {
      if (force === true && actorRole === 'spv') {
        forced = true;
      } else {
        // Dikembalikan sebagai kegagalan terstruktur (bukan throw) supaya client bisa
        // membedakan "ditolak karena checkpoint" dari error lain, lalu menawarkan override
        // ke role spv. Untuk role lain requiresForce tetap false -> tidak ada jalan override.
        return {
          success: false,
          blocked: true,
          requiresForce: actorRole === 'spv',
          blockingColumns: blocking,
          message: 'Barcode "' + target + '" sudah dipakai di produksi (' + blocking.join(', ') +
            ') sehingga tidak boleh dihapus. Batalkan/koreksi checkpoint-nya dulu' +
            (actorRole === 'spv' ? ', atau lakukan penghapusan paksa.' : ', atau minta SPV melakukan penghapusan paksa.')
        };
      }
    }

    // --- 3. Hapus dua sheet dengan rollback kompensasi ---
    var prodSheet = getSheet_(SHEET_NAMES.BARCODE);
    var prodRowValues = null;
    var deletedProd = false;
    if (prodRow.rowIndex !== -1) {
      prodRowValues = prodRow.values;
      prodSheet.deleteRow(prodRow.rowIndex);
      deletedProd = true;
    }

    try {
      reprintSheet.deleteRow(repRowIndex);
    } catch (delErr) {
      // Baris produksi sudah terhapus tapi baris reprint gagal -> kembalikan baris produksi
      // supaya tidak ada data yang terhapus sebelah. Urutan baris bisa berubah, isinya tidak.
      if (deletedProd && prodRowValues) {
        try {
          prodSheet.appendRow(prodRowValues);
        } catch (restoreErr) {
          throw new Error('KRITIS: baris "' + target + '" terhapus dari ' + SHEET_NAMES.BARCODE +
            ' tapi gagal dihapus dari ' + SHEET_NAMES.REPRINT + ' dan gagal dipulihkan (' +
            restoreErr.message + '). Hubungi Admin TSP untuk perbaikan manual.');
        }
      }
      throw new Error('Gagal menghapus "' + target + '" dari ' + SHEET_NAMES.REPRINT +
        ' (' + delErr.message + '). Tidak ada data yang berubah.');
    }

    var message = 'Barcode ' + target + ' berhasil dihapus dari riwayat.';
    if (forced) {
      message += ' (Penghapusan paksa oleh SPV walaupun checkpoint ' + blocking.join(', ') + ' sudah terisi.)';
    }

    // Audit trail -- best effort, kegagalan log tidak boleh membatalkan penghapusan yang sudah terjadi.
    try {
      appendLog_({
        'Timestamp': new Date(),
        'Barcode': target,
        'Event': forced ? 'hapus_reprint_force' : 'hapus_reprint',
        'Actor': actorLabel,
        'Role': actorRole,
        'Mesin': '',
        'Hasil': 'SUKSES',
        'Pesan': message
      });
    } catch (logErr) {
      // abaikan
    }

    return { success: true, message: message, forced: forced };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
