/**
 * Helper generik akses Google Sheet untuk TSP Modul.
 */

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Ambil sheet by name. Coba exact match, lalu case-insensitive trim.
 */
function getSheet_(name) {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(name);
  if (sheet) return sheet;

  var target = String(name).trim().toLowerCase();
  var all = spreadsheet.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getName().trim().toLowerCase() === target) return all[i];
  }

  throw new Error('Sheet "' + name + '" tidak ditemukan di spreadsheet.');
}

/**
 * Pastikan sheet BARCODE MATERIAL PRODUKSI, REPRINT BARCODE, dan LOG siap pakai.
 */
function ensureSheetsReady_() {
  var barcodeSheet = getSheet_(SHEET_NAMES.BARCODE);
  var lastCol = Math.max(barcodeSheet.getLastColumn(), 1);
  var currentHeaders = barcodeSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  var isEmpty = currentHeaders.every(function (h) { return h === '' || h === null; });
  if (isEmpty) {
    barcodeSheet.getRange(1, 1, 1, BARCODE_COLUMNS.length).setValues([BARCODE_COLUMNS]);
  } else {
    var missing = BARCODE_COLUMNS.filter(function (col) {
      return !currentHeaders.some(function (ch) {
        return String(ch).trim().toLowerCase() === String(col).trim().toLowerCase();
      });
    });
    if (missing.length > 0) {
      barcodeSheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    }
  }

  var spreadsheet = getSpreadsheet_();

  // Pastikan sheet LOG ada
  if (!spreadsheet.getSheetByName(SHEET_NAMES.LOG)) {
    var logSheet = spreadsheet.insertSheet(SHEET_NAMES.LOG);
    logSheet.getRange(1, 1, 1, LOG_COLUMNS.length).setValues([LOG_COLUMNS]);
  }

  // Pastikan sheet REPRINT BARCODE ada
  if (!spreadsheet.getSheetByName(SHEET_NAMES.REPRINT)) {
    var reprintSheet = spreadsheet.insertSheet(SHEET_NAMES.REPRINT);
    reprintSheet.getRange(1, 1, 1, REPRINT_COLUMNS.length).setValues([REPRINT_COLUMNS]);
  }
}

/**
 * Ambil map { namaKolom: indexKolom (1-based) } dari baris header sheet.
 */
function getHeaderMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function (h, i) {
    if (h) {
      var cleanName = String(h).trim();
      map[cleanName] = i + 1;
      // Simpan juga versi lowercase untuk matching fleksibel
      map[cleanName.toLowerCase()] = i + 1;
    }
  });
  return map;
}

/**
 * Cari 1 baris di `sheet` yang kolom `columnName`-nya persis sama dengan `value`.
 */
function findRowByColumnValue_(sheet, columnName, value) {
  var headerMap = getHeaderMap_(sheet);
  var cleanName = String(columnName).trim();
  var col = headerMap[cleanName] || headerMap[cleanName.toLowerCase()];
  if (!col) throw new Error('Kolom "' + columnName + '" tidak ditemukan di sheet "' + sheet.getName() + '".');

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rowIndex: -1, values: null, headerMap: headerMap, sheet: sheet };

  var target = String(value).trim();
  var colValues = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  for (var i = 0; i < colValues.length; i++) {
    if (String(colValues[i][0]).trim() === target) {
      var rowIndex = i + 2;
      var rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
      return { rowIndex: rowIndex, values: rowValues, headerMap: headerMap, sheet: sheet };
    }
  }
  return { rowIndex: -1, values: null, headerMap: headerMap, sheet: sheet };
}

/**
 * Cari baris di sheet BARCODE MATERIAL PRODUKSI berdasarkan kode barcode.
 */
function findBarcodeRow_(barcodeText) {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var col = headerMap['BARCODE'] || headerMap['Barcode'] || headerMap['barcode'];
  if (!col) return { rowIndex: -1, values: null, headerMap: headerMap, sheet: sheet };

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rowIndex: -1, values: null, headerMap: headerMap, sheet: sheet };

  var target = String(barcodeText).trim();
  var colValues = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  for (var i = 0; i < colValues.length; i++) {
    if (String(colValues[i][0]).trim() === target) {
      var rowIndex = i + 2;
      var rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
      return { rowIndex: rowIndex, values: rowValues, headerMap: headerMap, sheet: sheet };
    }
  }
  return { rowIndex: -1, values: null, headerMap: headerMap, sheet: sheet };
}

/**
 * Lookup data Pallet dari sheet BARCODE OUTBOUND WRM berdasarkan Kode Unik.
 */
function lookupWrmIncoming_(kodeUnik) {
  var sheet = getSheet_(SHEET_NAMES.WRM_INCOMING);
  return findRowByColumnValue_(sheet, 'Kode Unik', kodeUnik);
}

/**
 * Helper parsing tanggal dari tab BARCODE OUTBOUND WRM (Format Excel serial, Date object, DD-MMM-YYYY, YYYY-MM-DD, atau DD/MM/YYYY).
 * Mengembalikan object: { key: 'YYYY-MM-DD', display: 'DD/MM/YYYY', rawDate: Date }
 */
function parseSapDate_(val, tz) {
  if (!tz) tz = Session.getScriptTimeZone();
  if (val === null || val === undefined || val === '') return null;

  var y = 0, m = 0, d = 0, rawDate = null;

  // Cek jika val adalah angka serial tanggal dari Google Sheets/Excel (misalnya 46204 untuk 1 Juli 2026)
  if (typeof val === 'number' || (typeof val === 'string' && /^\d{5}$/.test(String(val).trim()))) {
    var numVal = Number(val);
    if (numVal > 30000 && numVal < 80000) {
      // Konversi serial Excel (base 1899-12-30) ke JS Date di timezone UTC
      rawDate = new Date(Math.round((numVal - 25569) * 86400 * 1000));
      y = rawDate.getUTCFullYear();
      m = rawDate.getUTCMonth() + 1;
      d = rawDate.getUTCDate();
    }
  } else if (val instanceof Date) {
    rawDate = val;
    // Gunakan Utilities.formatDate untuk menghindari pergeseran tanggal akibat zona waktu
    var isoStr = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
    var dateParts = isoStr.split('-');
    y = parseInt(dateParts[0], 10);
    m = parseInt(dateParts[1], 10);
    d = parseInt(dateParts[2], 10);
  } else {
    var sVal = String(val).trim();
    if (!sVal) return null;

    function parseMonth_(mStr) {
      var num = parseInt(mStr, 10);
      if (!isNaN(num) && String(num) === mStr && num >= 1 && num <= 12) return num;
      var str = String(mStr).trim().toLowerCase().substring(0, 3);
      var monthMap = {
        'jan': 1, 'feb': 2, 'peb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'mei': 5,
        'jun': 6, 'jul': 7, 'aug': 8, 'agu': 8, 'sep': 9, 'oct': 10, 'okt': 10, 'nov': 11, 'nop': 11, 'dec': 12, 'des': 12
      };
      return monthMap[str] || 0;
    }

    // Cek format YYYY-MM-DD atau YYYY-MMM-DD (misal: "2026-07-31" atau "2026-Jul-31")
    var isoParts = sVal.match(/^(\d{4})[\s\/-]([a-zA-Z]+|\d{1,2})[\s\/-](\d{1,2})/);
    if (isoParts) {
      y = parseInt(isoParts[1], 10);
      m = parseMonth_(isoParts[2]);
      d = parseInt(isoParts[3], 10);
      rawDate = new Date(y, m - 1, d);
    } else {
      // Cek format DD-MMM-YYYY / DD/MM/YYYY / MM/DD/YYYY (misal: "31-Jul-2026", "01/07/2026", "7/1/2026")
      var parts = sVal.match(/^([a-zA-Z]+|\d{1,2})[\s\/-]([a-zA-Z]+|\d{1,2})[\s\/,-]+(\d{4})/);
      if (parts) {
        var p1Str = parts[1];
        var p2Str = parts[2];
        y = parseInt(parts[3], 10);

        if (/[a-zA-Z]/.test(p2Str)) {
          d = parseInt(p1Str, 10);
          m = parseMonth_(p2Str);
        } else if (/[a-zA-Z]/.test(p1Str)) {
          m = parseMonth_(p1Str);
          d = parseInt(p2Str, 10);
        } else {
          var p1 = parseInt(p1Str, 10);
          var p2 = parseInt(p2Str, 10);
          // Jika p1 > 12 -> DD/MM/YYYY
          // Jika p2 > 12 -> MM/DD/YYYY
          // Secara default untuk Indonesia -> DD/MM/YYYY
          if (p1 > 12 || p2 <= 12) {
            d = p1;
            m = p2;
          } else {
            m = p1;
            d = p2;
          }
        }
        rawDate = new Date(y, m - 1, d);
      } else {
        var fallbackDate = new Date(sVal);
        if (!isNaN(fallbackDate.getTime())) {
          y = fallbackDate.getFullYear();
          m = fallbackDate.getMonth() + 1;
          d = fallbackDate.getDate();
          rawDate = fallbackDate;
        } else {
          return { key: sVal, display: sVal, rawDate: null, y: 0, m: 0, d: 0 };
        }
      }
    }
  }

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var key = y + '-' + pad(m) + '-' + pad(d);
  var display = pad(d) + '/' + pad(m) + '/' + y;

  return { key: key, display: display, rawDate: rawDate, y: y, m: m, d: d };
}

/**
 * Baca semua daftar Reservasi dari sheet BARCODE OUTBOUND WRM.
 * Menguraikan tanggal outbound dan mengembalikan daftar reservasi lengkap.
 */
function getReservasiList_() {
  try {
    var sheet = getSheet_(SHEET_NAMES.RESERVASI);
    var headerMap = getHeaderMap_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    var tz = Session.getScriptTimeZone();
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    // Kolom BARCODE OUTBOUND WRM (prioritas) + fallback kolom RESERVASI lama
    var colTanggal = headerMap['Tanggal Outbound'] || headerMap['tanggal outbound'] || headerMap['TANGGAL'] || headerMap['Tanggal'] || headerMap['tanggal'];
    var colNoRes = headerMap['MATDOC RESERVASI'] || headerMap['matdoc reservasi'] || headerMap['NO RESERVASI'] || headerMap['No Reservasi'] || headerMap['no reservasi'];
    var colMid = headerMap['MID'] || headerMap['Mid'] || headerMap['mid'];
    var colDesc = headerMap['DESC'] || headerMap['desc'] || headerMap['MATERIAL DESCRIPTION'] || headerMap['Material Description'];
    var colQty = headerMap['QTY'] || headerMap['qty'] || headerMap['JUMLAH'] || headerMap['Jumlah'] || headerMap['jumlah'];
    var colUnit = headerMap['UOM'] || headerMap['uom'] || headerMap['UNIT'] || headerMap['Unit'] || headerMap['unit'];
    var colShift = headerMap['Shift'] || headerMap['shift'] || headerMap['SHIFT'];

    var list = [];
    var seenIndexMap = {};

    data.forEach(function (row) {
      if (!colNoRes) return;
      var noRes = String(row[colNoRes - 1] || '').trim();
      if (!noRes) return;

      var rawDate = colTanggal ? row[colTanggal - 1] : null;
      var parsedDate = parseSapDate_(rawDate, tz);
      var dateDisplay = parsedDate ? parsedDate.display : '';
      var dateKey = parsedDate ? parsedDate.key : '';

      var midStr = colMid ? String(row[colMid - 1] || '').trim() : '';
      var descStr = colDesc ? String(row[colDesc - 1] || '').trim() : '';
      var qtyNum = colQty ? (Number(row[colQty - 1]) || 0) : 0;
      var unitStr = colUnit ? String(row[colUnit - 1] || '').trim() : '';
      var rawShift = colShift ? String(row[colShift - 1] || '').trim() : '';

      var itemData = {
        mid: midStr,
        desc: descStr,
        qty: qtyNum,
        uom: unitStr
      };

      var itemKey = noRes;
      if (seenIndexMap[itemKey] === undefined) {
        seenIndexMap[itemKey] = list.length;
        list.push({
          noReservasi: noRes,
          tanggal: dateDisplay,
          dateKey: dateKey,
          year: parsedDate ? parsedDate.y : 0,
          month: parsedDate ? parsedDate.m : 0,
          day: parsedDate ? parsedDate.d : 0,
          shift: rawShift,
          itemCount: 1,
          items: [itemData]
        });
      } else {
        var existingItem = list[seenIndexMap[itemKey]];
        existingItem.itemCount += 1;
        existingItem.items.push(itemData);
      }
    });

    return list;
  } catch (e) {
    return [];
  }
}

/**
 * Validasi bahwa MID material dari hasil scan terdaftar pada Nomor Reservasi yang diinput/dipilih.
 */
function validateMidInReservasi_(noReservasi, targetMid) {
  if (!noReservasi) {
    throw new Error('Nomor Reservasi harus diisi untuk penerimaan material ini.');
  }

  var reservasiList = getReservasiList_();
  var foundReservasi = null;
  var cleanNoRes = String(noReservasi).trim();
  
  for (var i = 0; i < reservasiList.length; i++) {
    if (String(reservasiList[i].noReservasi).trim() === cleanNoRes) {
      foundReservasi = reservasiList[i];
      break;
    }
  }

  if (!foundReservasi) {
    throw new Error('Nomor Reservasi "' + cleanNoRes + '" tidak terdaftar di data BARCODE OUTBOUND WRM.');
  }

  var allowedMids = [];
  var matchFound = false;
  for (var j = 0; j < foundReservasi.items.length; j++) {
    var itemMid = String(foundReservasi.items[j].mid).trim();
    if (itemMid) {
      allowedMids.push(itemMid + ' (' + (foundReservasi.items[j].desc || 'No Desc') + ')');
      if (itemMid === String(targetMid).trim()) {
        matchFound = true;
        break;
      }
    }
  }

  if (!matchFound) {
    throw new Error('MID Tidak Cocok! MID "' + targetMid + '" dari barcode yang discan tidak terdaftar pada Nomor Reservasi "' + cleanNoRes + '". MID yang terdaftar untuk reservasi ini: ' + allowedMids.join(', '));
  }

  return true;
}


/**
 * Append 1 baris baru ke sheet BARCODE MATERIAL PRODUKSI.
 */
function appendBarcodeRow_(rowObject) {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var lastCol = sheet.getLastColumn();
  var rowValues = new Array(lastCol);

  for (var i = 0; i < lastCol; i++) rowValues[i] = '';

  Object.keys(rowObject).forEach(function (colName) {
    var colIndex = headerMap[colName] || headerMap[String(colName).toLowerCase()];
    if (colIndex) {
      rowValues[colIndex - 1] = rowObject[colName];
    }
  });

  sheet.appendRow(rowValues);
}

/**
 * Append 1 baris baru ke sheet REPRINT BARCODE.
 */
function appendReprintRow_(rowObject) {
  var sheet = getSheet_(SHEET_NAMES.REPRINT);
  var headerMap = getHeaderMap_(sheet);
  var lastCol = sheet.getLastColumn();
  var rowValues = new Array(lastCol);

  for (var i = 0; i < lastCol; i++) rowValues[i] = '';

  Object.keys(rowObject).forEach(function (colName) {
    var colIndex = headerMap[colName] || headerMap[String(colName).toLowerCase()];
    if (colIndex) {
      rowValues[colIndex - 1] = rowObject[colName];
    }
  });

  sheet.appendRow(rowValues);
}

/**
 * Update nilai 1 cell di sheet BARCODE MATERIAL PRODUKSI pada baris `rowIndex` dan kolom `columnName`.
 */
function updateBarcodeCell_(rowIndex, columnName, value) {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var col = headerMap[columnName] || headerMap[String(columnName).toLowerCase()];

  if (!col) throw new Error('Kolom "' + columnName + '" tidak ditemukan di sheet Barcode.');

  sheet.getRange(rowIndex, col).setValue(value);
}

/**
 * Log aktivitas scan ke sheet "Log Aktivitas Barcode".
 */
function appendLog_(logData) {
  var sheet = getSheet_(SHEET_NAMES.LOG);
  var headerMap = getHeaderMap_(sheet);
  var lastCol = sheet.getLastColumn();
  var rowValues = new Array(lastCol);

  for (var i = 0; i < lastCol; i++) rowValues[i] = '';

  Object.keys(logData).forEach(function (colName) {
    var colIndex = headerMap[colName] || headerMap[String(colName).toLowerCase()];
    if (colIndex) {
      rowValues[colIndex - 1] = logData[colName];
    }
  });

  sheet.appendRow(rowValues);
}

/**
 * Cari baris di tab REPRINT BARCODE berdasarkan Kode Induk (BARCODE) atau Kode Anak (BARCODE REPRINT).
 * Query bisa berupa substring — pencarian case-insensitive.
 * Return: array of { tanggal, shift, barcodeInduk, mid, deskripsi, barcodeAnak, jumlah }
 */
function queryReprintSheet_(query) {
  var sheet = getSheet_(SHEET_NAMES.REPRINT);
  var lastRow = sheet.getLastRow();
  var result = [];
  if (lastRow < 2 || !query) return result;

  var hm = getHeaderMap_(sheet);
  var cTgl    = (hm['tanggal'] || 1) - 1;
  var cShift  = (hm['shift'] || 2) - 1;
  var cInduk  = (hm['barcode'] || 3) - 1;
  var cMid    = (hm['mid'] || 4) - 1;
  var cDesc   = (hm['material description'] || 5) - 1;
  var cAnak   = (hm['barcode reprint'] || 6) - 1;
  var cJml    = (hm['jumlah'] || 7) - 1;

  var maxCol  = sheet.getLastColumn();
  var data    = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();
  var q       = String(query).trim().toLowerCase();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var induk = String(row[cInduk] || '').trim();
    var anak  = String(row[cAnak] || '').trim();
    if (!anak) continue;
    if (induk.toLowerCase().indexOf(q) === -1 && anak.toLowerCase().indexOf(q) === -1) continue;

    var tgl = row[cTgl];
    if (tgl instanceof Date) {
      tgl = Utilities.formatDate(tgl, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    } else {
      tgl = String(tgl || '').trim();
    }

    result.push({
      tanggal:      tgl,
      shift:        String(row[cShift] || '').trim(),
      barcodeInduk: induk,
      mid:          String(row[cMid]  || '').trim(),
      deskripsi:    String(row[cDesc] || '').trim(),
      barcodeAnak:  anak,
      jumlah:       Number(row[cJml]) || 0
    });
  }

  // Urutkan terbaru dulu (descending by row position)
  result.reverse();
  return result;
}
