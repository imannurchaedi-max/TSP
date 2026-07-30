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
 * Pastikan sheet BARCODE MATERIAL PRODUKSI, REPRINT BARCODE, RESERVASI, dan LOG siap pakai.
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
  var col = headerMap[columnName] || headerMap[String(columnName).toLowerCase()];
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
 * Lookup data Pallet dari sheet BARCODE INCOMING WRM berdasarkan Kode Unik.
 */
function lookupWrmIncoming_(kodeUnik) {
  var sheet = getSheet_(SHEET_NAMES.WRM_INCOMING);
  return findRowByColumnValue_(sheet, 'Kode Unik', kodeUnik);
}

/**
 * Helper parsing tanggal dari tab RESERVASI (Format SAP MM/DD/YYYY, M/D/YYYY, atau Date object).
 * Mengembalikan object: { key: 'YYYY-MM-DD', display: 'DD/MM/YYYY', rawDate: Date }
 */
function parseSapDate_(val, tz) {
  if (!tz) tz = Session.getScriptTimeZone();
  if (!val) return null;

  var y = 0, m = 0, d = 0, rawDate = null;

  if (val instanceof Date) {
    rawDate = val;
    y = val.getFullYear();
    m = val.getMonth() + 1;
    d = val.getDate();
  } else {
    var sVal = String(val).trim();
    if (!sVal) return null;

    // Cek format SAP MM/DD/YYYY atau M/D/YYYY (misal: "7/1/2026" -> Month 7, Day 1, Year 2026)
    var parts = sVal.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (parts) {
      m = parseInt(parts[1], 10);
      d = parseInt(parts[2], 10);
      y = parseInt(parts[3], 10);
      rawDate = new Date(y, m - 1, d);
    } else {
      // Cek format YYYY-MM-DD
      var isoParts = sVal.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
      if (isoParts) {
        y = parseInt(isoParts[1], 10);
        m = parseInt(isoParts[2], 10);
        d = parseInt(isoParts[3], 10);
        rawDate = new Date(y, m - 1, d);
      } else {
        return { key: sVal, display: sVal, rawDate: null, y: 0, m: 0, d: 0 };
      }
    }
  }

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var key = y + '-' + pad(m) + '-' + pad(d);
  var display = pad(d) + '/' + pad(m) + '/' + y;

  return { key: key, display: display, rawDate: rawDate, y: y, m: m, d: d };
}

/**
 * Baca semua daftar Reservasi dari sheet RESERVASI.
 * Menguraikan tanggal SAP (MM/DD/YYYY) dan mengembalikan daftar reservasi lengkap.
 */
function getReservasiList_() {
  try {
    var sheet = getSheet_(SHEET_NAMES.RESERVASI);
    var headerMap = getHeaderMap_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    var tz = Session.getScriptTimeZone();
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    var colTanggal = headerMap['TANGGAL'] || headerMap['Tanggal'] || headerMap['tanggal'];
    var colNoRes = headerMap['NO RESERVASI'] || headerMap['No. Reservasi'] || headerMap['No Reservasi'] || headerMap['no reservasi'];
    var colMid = headerMap['MID'] || headerMap['Mid'] || headerMap['mid'];
    var colDesc = headerMap['MATERIAL DESCRIPTION'] || headerMap['Material Description'] || headerMap['Material description'];
    var colMvt = headerMap['MOVEMENT TYPE'] || headerMap['Movement Type'] || headerMap['movement type'] || headerMap['MOVEMENT'] || headerMap['Movement'] || headerMap['mvt'];
    var colQty = headerMap['JUMLAH'] || headerMap['Jumlah'] || headerMap['jumlah'] || headerMap['Qty'];
    var colUnit = headerMap['UNIT'] || headerMap['Unit'] || headerMap['unit'];
    var colShift = headerMap['SHIFT'] || headerMap['Shift'] || headerMap['shift'];

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
      var mvtStr = colMvt ? String(row[colMvt - 1] || '').trim() : '';
      var qtyNum = colQty ? (Number(row[colQty - 1]) || 0) : 0;
      var unitStr = colUnit ? String(row[colUnit - 1] || '').trim() : '';
      var rawShift = colShift ? String(row[colShift - 1] || '').trim() : '';

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
          movementType: mvtStr,
          shift: rawShift,
          itemCount: 1
        });
      } else {
        list[seenIndexMap[itemKey]].itemCount += 1;
      }
    });

    return list;
  } catch (e) {
    return [];
  }
}

/**
 * Backward compatibility.
 */
function getReservasiListForShift_(now) {
  return getReservasiList_();
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
