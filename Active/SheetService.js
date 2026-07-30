/**
 * Helper generik akses Google Sheet untuk TSP Modul.
 */

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Ambil sheet by name. Kalau exact match gagal, coba cari case-insensitive dulu
 * (jaga-jaga nama tab di Google Sheet live beda kapitalisasi dari yang dikonfigurasi,
 * mis. "Barcode Material Produksi" vs "BARCODE MATERIAL PRODUKSI") sebelum benar-benar gagal.
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
 * Pastikan sheet Barcode Material Produksi punya semua kolom di BARCODE_COLUMNS
 * (kolom yang belum ada ditambahkan di akhir), dan sheet Log Aktivitas Barcode ada.
 * Dipanggil sekali secara lazy setiap request masuk.
 */
function ensureSheetsReady_() {
  var barcodeSheet = getSheet_(SHEET_NAMES.BARCODE);
  var lastCol = Math.max(barcodeSheet.getLastColumn(), 1);
  var currentHeaders = barcodeSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  var isEmpty = currentHeaders.every(function (h) { return h === '' || h === null; });
  if (isEmpty) {
    barcodeSheet.getRange(1, 1, 1, BARCODE_COLUMNS.length).setValues([BARCODE_COLUMNS]);
  } else {
    var missing = BARCODE_COLUMNS.filter(function (col) { return currentHeaders.indexOf(col) === -1; });
    if (missing.length > 0) {
      barcodeSheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    }
  }

  var spreadsheet = getSpreadsheet_();
  if (!spreadsheet.getSheetByName(SHEET_NAMES.LOG)) {
    var logSheet = spreadsheet.insertSheet(SHEET_NAMES.LOG);
    logSheet.getRange(1, 1, 1, LOG_COLUMNS.length).setValues([LOG_COLUMNS]);
  }
}

/**
 * Ambil map { namaKolom: indexKolom (1-based) } dari baris header sheet.
 */
function getHeaderMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function (h, i) {
    if (h) map[h] = i + 1;
  });
  return map;
}

/**
 * Cari 1 baris di `sheet` yang kolom `columnName`-nya persis sama dengan `value` (setelah
 * di-trim). Return { rowIndex, values, headerMap, sheet }, `rowIndex` -1 kalau tidak ketemu.
 */
function findRowByColumnValue_(sheet, columnName, value) {
  var headerMap = getHeaderMap_(sheet);
  var col = headerMap[columnName];
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
 * Cari baris di sheet Barcode Material Produksi berdasarkan kode barcode.
 * Return { rowIndex, values, headerMap } atau null kalau tidak ketemu.
 */
function findBarcodeRow_(barcodeText) {
  return findRowByColumnValue_(getSheet_(SHEET_NAMES.BARCODE), 'Barcode', barcodeText);
}

/**
 * Lookup 1 pallet di registry "BARCODE INCOMING WRM" berdasarkan Kode Unik yang discan.
 * Return { mid, deskripsi, uom, qty, aksi, keterangan } atau null kalau tidak ketemu.
 */
function lookupWrmIncoming_(kodeUnik) {
  var sheet = getSheet_(SHEET_NAMES.WRM_INCOMING);
  var result = findRowByColumnValue_(sheet, 'Kode Unik', kodeUnik);
  if (result.rowIndex === -1) return null;

  var hm = result.headerMap;
  var v = result.values;
  return {
    mid: String(v[hm['Mid'] - 1]).trim(),
    deskripsi: v[hm['Description'] - 1],
    uom: v[hm['Uom'] - 1],
    qty: Number(v[hm['Qty /Palet'] - 1]) || 0,
    aksi: v[hm['AKSI'] - 1],
    keterangan: v[hm['Keterangan'] - 1]
  };
}

function appendBarcodeRow_(rowObject) {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var row = new Array(sheet.getLastColumn()).fill('');
  Object.keys(rowObject).forEach(function (key) {
    var col = headerMap[key];
    if (col) row[col - 1] = rowObject[key];
  });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function updateBarcodeCell_(rowIndex, columnName, value) {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var col = headerMap[columnName];
  if (!col) throw new Error('Kolom "' + columnName + '" tidak ditemukan.');
  sheet.getRange(rowIndex, col).setValue(value);
}

function appendLog_(logObject) {
  var sheet = getSheet_(SHEET_NAMES.LOG);
  var row = LOG_COLUMNS.map(function (col) {
    return logObject[col] !== undefined ? logObject[col] : '';
  });
  sheet.appendRow(row);
}
