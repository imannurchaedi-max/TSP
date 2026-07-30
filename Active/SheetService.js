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
 * Mendukung pencarian kolom 'BARCODE' atau 'Barcode'.
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
 * Append 1 baris log penerbitan kode reprint ke sheet REPRINT BARCODE.
 */
function appendReprintRow_(reprintObject) {
  var sheet = getSheet_(SHEET_NAMES.REPRINT);
  var headerMap = getHeaderMap_(sheet);
  var lastCol = sheet.getLastColumn();
  var rowValues = new Array(lastCol);

  for (var i = 0; i < lastCol; i++) rowValues[i] = '';

  Object.keys(reprintObject).forEach(function (colName) {
    var colIndex = headerMap[colName] || headerMap[String(colName).toLowerCase()];
    if (colIndex) {
      rowValues[colIndex - 1] = reprintObject[colName];
    }
  });

  sheet.appendRow(rowValues);
}

/**
 * Update 1 sel spesifik di sheet Barcode.
 */
function updateBarcodeCell_(rowIndex, columnName, value) {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var col = headerMap[columnName] || headerMap[String(columnName).toLowerCase()];
  if (!col) throw new Error('Kolom "' + columnName + '" tidak ditemukan di sheet Barcode.');

  sheet.getRange(rowIndex, col).setValue(value);
}

/**
 * Append 1 baris ke sheet Log Aktivitas Barcode.
 */
function appendLog_(logObject) {
  try {
    var sheet = getSheet_(SHEET_NAMES.LOG);
    var rowValues = [
      new Date(),
      logObject.barcode || '',
      logObject.event || '',
      logObject.actor || '',
      logObject.role || '',
      logObject.mesin || '',
      logObject.hasil || '',
      logObject.pesan || ''
    ];
    sheet.appendRow(rowValues);
  } catch (e) {
    Logger.log('Gagal menulis log: ' + e.message);
  }
}
