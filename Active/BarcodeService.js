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

/**
 * ALLOCATOR BARCODE ANAK -- SATU-SATUNYA jalan penerbitan kode anak/reprint.
 *
 * Sebelumnya ada dua jalur terpisah: handleKirimMesin_() (scan reguler) mengambil sequence lalu
 * menulis dua sheet tanpa lock, tanpa cek barcode ganda, dan tanpa validasi sisa kuantitas induk;
 * sementara saveBatchReprint_() (reprint batch) sudah aman. Akibatnya dua scan "Kirim ke Mesin"
 * yang berbarengan bisa memakai sequence yang sama (barcode anak ganda) dan total kirim bisa
 * melebihi qty induk. Keduanya sekarang memakai fungsi ini supaya aturan alokasi cuma punya satu
 * sumber kebenaran.
 *
 * Jaminan:
 *  1. Script lock -- perhitungan sequence, cek duplikat, dan penulisan ada di satu bagian kritis.
 *  2. Total kuantitas yang diterbitkan tidak pernah melebihi sisa kuantitas induk.
 *  3. Barcode anak yang sudah terdaftar ditolak (pengaman kedua kalau sequence terlanjur meleset).
 *  4. Penulisan REPRINT BARCODE + BARCODE MATERIAL PRODUKSI punya rollback kompensasi, jadi tidak
 *     pernah ada baris yang cuma masuk ke satu sheet.
 *
 * @param {string} parentBarcode Kode induk.
 * @param {Array<number>} quantities Kuantitas per label yang mau diterbitkan.
 * @param {{isRetur?: boolean, mesinCode?: string, markSentToMesin?: boolean, now?: Date}=} options
 * @return {{labels: Array<Object>, mid: string, deskripsi: string, remainingQty: number}}
 */
function allocateChildBarcodes_(parentBarcode, quantities, options) {
  var opts = options || {};
  var parentStr = String(parentBarcode == null ? '' : parentBarcode).trim();
  if (!parentStr) throw new Error('Kode induk wajib diisi.');
  if (!Array.isArray(quantities) || quantities.length === 0) {
    throw new Error('Tidak ada label yang dicetak.');
  }
  if (quantities.length > 20) throw new Error('Maksimum 20 label per proses reprint.');

  var qtyList = [];
  for (var q = 0; q < quantities.length; q++) {
    var qty = Number(quantities[q]);
    if (!isFinite(qty) || qty <= 0) throw new Error('Jumlah setiap label harus lebih besar dari 0.');
    qtyList.push(qty);
  }

  var isRetur = opts.isRetur === true;
  var now = (opts.now instanceof Date) ? opts.now : new Date();
  var mesinCode = opts.mesinCode ? String(opts.mesinCode).trim() : '';
  var markSentToMesin = opts.markSentToMesin === true;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // --- 1. Induk wajib ada & sudah dikonfirmasi diterima dari WRM (dilempar getReprintData_) ---
    var reprintData = getReprintData_(parentStr);
    var parent = reprintData.history[0];

    // --- 2. Sisa kuantitas induk: berlaku untuk SEMUA jalur, termasuk kirim_mesin ---
    var alreadyPrinted = 0;
    for (var j = 0; j < reprintData.history.length; j++) {
      if (!/-00$/.test(String(reprintData.history[j].barcodeAnak || ''))) {
        alreadyPrinted += Number(reprintData.history[j].jumlah) || 0;
      }
    }
    var totalRequested = qtyList.reduce(function (sum, v) { return sum + v; }, 0);
    var parentQty = Number(reprintData.parentQty) || 0;
    var remainingQty = Math.max(0, parentQty - alreadyPrinted);
    if (totalRequested > remainingQty) {
      throw new Error('Jumlah (' + totalRequested + ') melebihi sisa kuantitas induk "' + parentStr +
        '" (sisa ' + remainingQty + ' dari total ' + parentQty + ').');
    }

    // --- 3. Nomor urut (reguler -01, -02... / retur -R01, -R02...) ---
    var nextSequence = getNextChildSequence_(parentStr);
    var nextReturSequence = 1;
    var returPattern = new RegExp('^' + escapeRegex_(parentStr) + '-R(\\d*)$');
    for (var h = 0; h < reprintData.history.length; h++) {
      var returMatch = returPattern.exec(String(reprintData.history[h].barcodeAnak || ''));
      if (returMatch) nextReturSequence = Math.max(nextReturSequence, (Number(returMatch[1]) || 0) + 1);
    }

    var labels = [];
    for (var k = 0; k < qtyList.length; k++) {
      var suffix = isRetur ? '-R' + padSeq_(nextReturSequence + k) : '-' + padSeq_(nextSequence + k);
      labels.push({
        barcodeInduk: parentStr,
        barcodeAnak: parentStr + suffix,
        mid: parent.mid,
        deskripsi: parent.deskripsi,
        jumlah: qtyList[k],
        isRetur: isRetur
      });
    }

    // --- 4. Susun baris kedua sheet, tolak barcode anak yang sudah terdaftar ---
    var ts = formatTimestamp_(now);
    var shift = getShift_(now);
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
      if (prodHm['mesin'] && mesinCode) pRow[prodHm['mesin'] - 1] = mesinCode;
      if (prodHm['diterima oleh tsp dari wrm']) pRow[prodHm['diterima oleh tsp dari wrm'] - 1] = ts;
      if (markSentToMesin && prodHm['dikirim oleh tsp ke mesin']) {
        pRow[prodHm['dikirim oleh tsp ke mesin'] - 1] = ts;
      }
      prodRowsToAppend.push(pRow);
    }

    // --- 5. Tulis dua sheet dengan rollback kompensasi ---
    var repStartRow = reprintSheet.getLastRow() + 1;
    reprintSheet.getRange(repStartRow, 1, repRowsToAppend.length, maxColRep).setValues(repRowsToAppend);
    try {
      prodSheet.getRange(prodSheet.getLastRow() + 1, 1, prodRowsToAppend.length, maxColProd)
        .setValues(prodRowsToAppend);
    } catch (prodErr) {
      try {
        reprintSheet.deleteRows(repStartRow, repRowsToAppend.length);
      } catch (rollbackErr) {
        throw new Error('KRITIS: ' + labels.length + ' baris reprint untuk induk "' + parentStr +
          '" sudah tertulis di ' + SHEET_NAMES.REPRINT + ' tapi gagal ditulis ke ' + SHEET_NAMES.BARCODE +
          ' dan gagal di-rollback (' + rollbackErr.message + '). Hubungi Admin TSP untuk perbaikan manual.');
      }
      throw new Error('Gagal menerbitkan barcode anak untuk induk "' + parentStr + '" (' + prodErr.message +
        '). Tidak ada data yang berubah.');
    }

    return {
      labels: labels,
      mid: parent.mid,
      deskripsi: parent.deskripsi,
      remainingQty: remainingQty - totalRequested
    };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/**
 * Cari mesin terakhir yang tercatat untuk 1 barcode di Log Aktivitas -- fallback terakhir untuk
 * barcode lama yang diterbitkan sebelum kolom MESIN ada.
 *
 * Catatan: versi lama membaca 500 baris tetap (getRange(start, 1, 500, 6)) sehingga melempar error
 * kalau sheet log lebih pendek dari itu; di sini jumlah baris dihitung dari lastRow.
 */
function lookupMesinFromLog_(barcodeText) {
  try {
    var target = String(barcodeText).trim();
    var logSheet = getSheet_(SHEET_NAMES.LOG);
    var lastRow = logSheet.getLastRow();
    if (lastRow < 2) return '';

    var startRow = Math.max(2, lastRow - 500);
    var numRows = lastRow - startRow + 1;
    var logData = logSheet.getRange(startRow, 1, numRows, 6).getValues();
    for (var n = logData.length - 1; n >= 0; n--) {
      if (String(logData[n][1]).trim() !== target) continue;
      var ev = String(logData[n][2]).trim();
      if ((ev === 'terima_operator' || ev === 'kirim_mesin') && logData[n][5]) {
        return String(logData[n][5]).trim();
      }
    }
  } catch (e) {
    // Log cuma fallback -- kegagalan baca tidak boleh menggagalkan scan.
  }
  return '';
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
 *
 * Penerbitan barcode anak didelegasikan ke allocateChildBarcodes_() -- allocator terkunci yang
 * dipakai bersama dengan reprint batch. Jalur ini dulu menulis dua sheet sendiri tanpa lock,
 * tanpa cek duplikat, dan tanpa validasi sisa kuantitas induk.
 */
function handleKirimMesin_(raw, mesinCode, jumlah, now) {
  if (!mesinCode) throw new Error('Mesin harus dipilih untuk event Kirim ke Mesin.');
  var mesin = String(mesinCode).trim();
  if (MESIN_LIST.indexOf(mesin) === -1) {
    throw new Error('Mesin "' + mesin + '" tidak dikenal.');
  }
  var qtyNum = Number(jumlah);
  if (isNaN(qtyNum) || qtyNum <= 0) throw new Error('Jumlah yang dikirim harus lebih besar dari 0.');

  var parentStr = String(raw).trim();
  var allocation = allocateChildBarcodes_(parentStr, [qtyNum], {
    isRetur: false,
    mesinCode: mesin,
    markSentToMesin: true,
    now: now
  });

  var childBarcode = allocation.labels[0].barcodeAnak;
  var childRow = {
    'TANGGAL': formatTimestamp_(now),
    'SHIFT': getShift_(now),
    'BARCODE': childBarcode,
    'NO RESERVASI': parentStr,
    'MID': allocation.mid,
    'MATERIAL DESCRIPTION': allocation.deskripsi,
    'JUMLAH': qtyNum,
    'MESIN': mesin,
    'DITERIMA OLEH TSP DARI WRM': formatTimestamp_(now),
    'DIKIRIM OLEH TSP KE MESIN': formatTimestamp_(now)
  };

  var stockSynced = true;
  try {
    stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_TSP, allocation.mid, 'Kirim ' + mesin, qtyNum, now);
  } catch(e) {
    stockSynced = false;
  }

  var msg = 'Berhasil reprint Kode Anak "' + childBarcode + '" (Qty: ' + qtyNum + ') dikirim ke ' + mesin +
    '\n\u2022 Sisa kuantitas induk: ' + allocation.remainingQty;
  if (!stockSynced) {
    msg += '\n\n\u26a0\ufe0f PERHATIAN: Barcode berhasil dicatat, TAPI Stock TSP BELUM tersinkron untuk shift ini ' +
      '(kemungkinan "Tarik Stok Awal Shift" belum dilakukan). Hubungi Admin TSP untuk Tarik Stok Awal, ' +
      'lalu minta Admin TSP memverifikasi ulang transaksi ini agar tercatat di Stock TSP.';
  }

  return {
    success: true,
    warning: !stockSynced,
    barcode: childBarcode,
    childBarcode: childBarcode,
    parentBarcode: parentStr,
    mesin: mesin,
    event: 'kirim_mesin',
    message: msg,
    details: childRow
  };
}

/**
 * Event 3, 4, 5, 6 -> Operasi pada Barcode Reprint / Kode Anak.
 *
 * Atribusi mesin: kolom MESIN di BARCODE MATERIAL PRODUKSI adalah sumber kebenarannya. TSP
 * menguncinya saat kirim_mesin; operator mengisinya saat terima_operator untuk label reprint
 * yang belum punya tujuan. consume_operator dan retur_dari_mesin tinggal membacanya, jadi tidak
 * ada lagi mutasi STOCK MESIN yang hilang diam-diam karena client mengirim mesinCode = null.
 * Kalau mesin tetap tidak ketemu untuk event yang butuh, hasilnya ditandai warning -- BUKAN
 * sukses polos seperti sebelumnya.
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

  // --- Resolusi mesin SEBELUM ada penulisan apa pun, supaya mismatch tidak setengah tercatat ---
  var recordedMesin = String(getCellValue_(barcodeRow, 'MESIN') || '').trim();
  var requestedMesin = mesinCode ? String(mesinCode).trim() : '';

  if (requestedMesin && MESIN_LIST.indexOf(requestedMesin) === -1) {
    throw new Error('Mesin "' + requestedMesin + '" tidak dikenal.');
  }

  // Kolom MESIN adalah catatan resmi tujuan barcode. Kalau client mengirim mesin lain, itu
  // tanda label salah scan -- ditolak untuk SEMUA event, bukan cuma terima_operator, supaya
  // mutasi stok tidak pernah dibebankan ke mesin yang salah.
  if (requestedMesin && recordedMesin && requestedMesin !== recordedMesin) {
    throw new Error('Barcode "' + raw + '" tercatat di mesin ' + recordedMesin + ', bukan ' + requestedMesin +
      '. Periksa kembali label yang discan atau minta TSP mengoreksi data mesinnya.');
  }

  if (eventCode === 'terima_operator' && !requestedMesin && !recordedMesin) {
    throw new Error('Mesin wajib dipilih untuk event "' + eventDef.label + '" supaya mutasi Stock Mesin tercatat.');
  }

  var activeMesin = requestedMesin || recordedMesin || lookupMesinFromLog_(raw);

  updateBarcodeCell_(barcodeRow.rowIndex, eventDef.column, formatTimestamp_(now));

  // Kunci mesin ke baris barcode begitu diketahui, supaya consume/retur tidak perlu menebak lagi.
  if (activeMesin && !recordedMesin && barcodeRow.headerMap['MESIN']) {
    try {
      updateBarcodeCell_(barcodeRow.rowIndex, 'MESIN', activeMesin);
    } catch (e) {
      // Bukan kegagalan fatal: checkpoint-nya sudah tercatat, mutasi stok di bawah tetap jalan.
    }
  }

  var MESIN_REQUIRED_EVENTS = ['terima_operator', 'consume_operator', 'retur_dari_mesin'];
  var mesinMissing = !activeMesin && MESIN_REQUIRED_EVENTS.indexOf(eventCode) !== -1;

  var stockSynced = true;
  try {
    var mid = getCellValue_(barcodeRow, 'MID');
    var qty = Number(getCellValue_(barcodeRow, 'JUMLAH')) || 0;

    if (mesinMissing) {
      // Tidak ada mesin -> mutasi stok mesin tidak mungkin benar. Ditandai supaya operator dan
      // Admin TSP tahu harus koreksi manual, bukan dibiarkan lewat sebagai sukses.
      stockSynced = false;
    } else if (eventCode === 'terima_operator') {
      stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_MESIN, mid, 'Terima ' + activeMesin, qty, now);
    } else if (eventCode === 'consume_operator') {
      stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_MESIN, mid, 'Consume ' + activeMesin, qty, now);
    } else if (eventCode === 'retur_dari_mesin') {
      var syncedTsp = incrementStockCell_(SHEET_NAMES.STOCK_TSP, mid, 'Return ' + activeMesin, qty, now);
      var syncedMesin = incrementStockCell_(SHEET_NAMES.STOCK_MESIN, mid, 'Return ' + activeMesin, qty, now);
      stockSynced = syncedTsp && syncedMesin;
    } else if (eventCode === 'retur_ke_wrm') {
      stockSynced = incrementStockCell_(SHEET_NAMES.STOCK_TSP, mid, 'MATCLAIM WRM', qty, now);
    }
  } catch(e) {
    stockSynced = false;
  }

  var msg = 'Berhasil mencatat checkpoint "' + eventDef.label + '" untuk barcode ' + raw +
    (activeMesin ? ' (' + activeMesin + ')' : '');
  if (mesinMissing) {
    msg += '\n\n\u26a0\ufe0f PERHATIAN: Checkpoint tercatat, TAPI mesin untuk barcode ini tidak diketahui ' +
      'sehingga mutasi Stock Mesin TIDAK dicatat. Minta Admin TSP mengisi kolom MESIN pada barcode ini ' +
      'lalu memverifikasi ulang mutasi stoknya.';
  } else if (!stockSynced) {
    msg += '\n\n\u26a0\ufe0f PERHATIAN: Checkpoint berhasil dicatat, TAPI Stock TSP/Stock Mesin BELUM tersinkron untuk shift ini ' +
      '(kemungkinan "Tarik Stok Awal Shift" belum dilakukan). Hubungi Admin TSP untuk Tarik Stok Awal, ' +
      'lalu minta Admin TSP memverifikasi ulang transaksi ini agar tercatat di Stock.';
  }

  return {
    success: true,
    warning: !stockSynced,
    barcode: raw,
    mesin: activeMesin || '',
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
 *
 * Validasi bentuk request ada di sini; alokasi nomor + penulisan dua sheet (lock, cek sisa
 * kuantitas, cek duplikat, rollback) dilakukan allocateChildBarcodes_() yang dipakai bersama
 * dengan jalur scan "Kirim ke Mesin".
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

  var allocation = allocateChildBarcodes_(parentBarcode, requestedQty, {
    isRetur: isRetur,
    markSentToMesin: false,
    now: new Date()
  });

  return {
    success: true,
    message: allocation.labels.length + ' label reprint berhasil direkam ke database.',
    data: { labels: allocation.labels }
  };
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
