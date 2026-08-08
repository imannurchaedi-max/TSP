/**
 * Lookup master material dari sheet "MID EXISTING" (MID -> Deskripsi, UOM).
 * Di-cache per eksekusi (variable global) supaya tidak baca sheet berkali-kali
 * dalam satu request.
 */

var materialCache_ = null;
var materialListCache_ = null;
var supplierMapCache_ = null;

// Prioritas Supplier: transaksi BARCODE OUTBOUND WRM (data riil terbaru) menang atas
// Supplier default di Material Master (MID EXISTING) -- Material Master hanya dipakai
// sebagai fallback untuk MID yang belum pernah punya transaksi WRM sama sekali.
function getSupplierMap_() {
  if (supplierMapCache_) return supplierMapCache_;

  var map = {};

  var materialMap = getMaterialMap_();
  Object.keys(materialMap).forEach(function (mid) {
    var supp = materialMap[mid].supplier;
    if (supp) map[mid] = supp;
  });

  var sheet = getSheet_(SHEET_NAMES.WRM_INCOMING);
  var lastRow = sheet.getLastRow();
  var headerMap = getHeaderMap_(sheet);

  var midCol = headerMap['MID '];
  if (!midCol) midCol = headerMap['MID']; // fallback just in case
  var suppCol = headerMap['Supplier'] || headerMap['SUPPLIER'];

  if (lastRow >= 2 && midCol && suppCol) {
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    // iterate forward, so later rows overwrite earlier ones (keeping latest)
    for (var i = 0; i < data.length; i++) {
      var mid = String(data[i][midCol - 1] || '').trim();
      var supp = String(data[i][suppCol - 1] || '').trim();
      if (mid && supp && supp !== '-' && supp !== '#N/A') {
        map[mid] = supp;
      }
    }
  }

  supplierMapCache_ = map;
  return map;
}

function getMaterialList_() {
  if (materialListCache_) return materialListCache_;

  var sheet = getSheet_(SHEET_NAMES.MATERIAL_MASTER);
  var lastRow = sheet.getLastRow();
  var headerMap = getHeaderMap_(sheet);
  var midCol = headerMap['MID'];
  var deskripsiCol = headerMap['Deskripsi'];
  var uomCol = headerMap['UOM'];
  var suppCol = headerMap['Supplier'] || headerMap['supplier'];

  var list = [];
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    data.forEach(function (row) {
      var mid = row[midCol - 1];
      if (mid === '' || mid === null) return;
      list.push({
        mid: String(mid).trim(),
        deskripsi: row[deskripsiCol - 1] || '',
        uom: row[uomCol - 1] || 'KG',
        supplier: suppCol ? String(row[suppCol - 1] || '').trim() : ''
      });
    });
  }

  materialListCache_ = list;
  return list;
}

function getMaterialMap_() {
  if (materialCache_) return materialCache_;

  var sheet = getSheet_(SHEET_NAMES.MATERIAL_MASTER);
  var lastRow = sheet.getLastRow();
  var headerMap = getHeaderMap_(sheet);
  var midCol = headerMap['MID'];
  var deskripsiCol = headerMap['Deskripsi'];
  var uomCol = headerMap['UOM'];
  var suppCol = headerMap['Supplier'] || headerMap['supplier'];

  var map = {};
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    data.forEach(function (row) {
      var mid = row[midCol - 1];
      if (mid === '' || mid === null) return;
      map[String(mid).trim()] = {
        deskripsi: row[deskripsiCol - 1],
        uom: row[uomCol - 1],
        supplier: suppCol ? String(row[suppCol - 1] || '').trim() : ''
      };
    });
  }

  materialCache_ = map;
  return map;
}

/**
 * Insert atau update 1 baris di Material Master (sheet "MID EXISTING"): MID, Deskripsi, UOM, Supplier.
 * Menambahkan kolom "Supplier" ke header sheet secara otomatis kalau belum ada.
 * Tidak pernah menimpa field yang sudah terisi dengan data baru -- hanya mengisi field yang
 * masih kosong, atau membuat baris baru kalau MID belum terdaftar sama sekali.
 */
function upsertMaterialMaster_(mid, deskripsi, uom, supplier) {
  var targetMid = normalizeMid_(mid);
  if (!targetMid) return { created: false, updated: false };

  var sheet = getSheet_(SHEET_NAMES.MATERIAL_MASTER);
  var headerMap = getHeaderMap_(sheet);
  var midCol = headerMap['MID'] || headerMap['mid'] || 1;
  var deskCol = headerMap['Deskripsi'] || headerMap['deskripsi'] || 2;
  var uomCol = headerMap['UOM'] || headerMap['uom'] || 3;
  var suppCol = headerMap['Supplier'] || headerMap['supplier'];

  if (!suppCol) {
    suppCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, suppCol).setValue('Supplier').setFontWeight('bold').setBackground('#f1f5f9');
  }

  var lastRow = sheet.getLastRow();
  var targetRow = -1;
  if (lastRow >= 2) {
    var midValues = sheet.getRange(2, midCol, lastRow - 1, 1).getValues();
    for (var i = 0; i < midValues.length; i++) {
      if (normalizeMid_(midValues[i][0]) === targetMid) { targetRow = i + 2; break; }
    }
  }

  var descVal = String(deskripsi || '').trim();
  var uomVal = String(uom || '').trim();
  var suppVal = String(supplier || '').trim();
  var result;

  if (targetRow === -1) {
    var maxCol = Math.max(midCol, deskCol, uomCol, suppCol);
    var newRow = [];
    for (var c = 1; c <= maxCol; c++) newRow.push('');
    newRow[midCol - 1] = targetMid;
    newRow[deskCol - 1] = descVal;
    newRow[uomCol - 1] = uomVal || 'KG';
    newRow[suppCol - 1] = suppVal;
    sheet.appendRow(newRow);
    result = { created: true, updated: false };
  } else {
    var changed = false;
    if (descVal) {
      var curDesc = String(sheet.getRange(targetRow, deskCol).getValue() || '').trim();
      if (!curDesc) { sheet.getRange(targetRow, deskCol).setValue(descVal); changed = true; }
    }
    if (uomVal) {
      var curUom = String(sheet.getRange(targetRow, uomCol).getValue() || '').trim();
      if (!curUom) { sheet.getRange(targetRow, uomCol).setValue(uomVal); changed = true; }
    }
    if (suppVal) {
      var curSupp = String(sheet.getRange(targetRow, suppCol).getValue() || '').trim();
      if (!curSupp) { sheet.getRange(targetRow, suppCol).setValue(suppVal); changed = true; }
    }
    result = { created: false, updated: changed };
  }

  materialCache_ = null;
  materialListCache_ = null;
  supplierMapCache_ = null;
  return result;
}

/**
 * Cek apakah MID pernah dipakai di transaksi stok/barcode manapun (Stock TSP, Stock Mesin,
 * Barcode Material Produksi, Barcode Outbound WRM). Dipakai sebagai guard sebelum menghapus
 * MID dari Material Master, supaya tidak menghapus material yang datanya masih dirujuk oleh
 * riwayat transaksi (yang akan membuat lookup deskripsi/UOM di riwayat itu jadi kosong).
 */
function isMidUsedAnywhere_(mid) {
  var targetMid = normalizeMid_(mid);
  if (!targetMid) return false;

  var sheetsToCheck = [SHEET_NAMES.STOCK_TSP, SHEET_NAMES.STOCK_MESIN, SHEET_NAMES.BARCODE, SHEET_NAMES.WRM_INCOMING];

  for (var s = 0; s < sheetsToCheck.length; s++) {
    var sheet = getSheet_(sheetsToCheck[s]);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    var headerMap = getHeaderMap_(sheet);
    var col = headerMap['MID'] || headerMap['mid'];
    if (!col) continue;
    var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      if (normalizeMid_(values[i][0]) === targetMid) return true;
    }
  }
  return false;
}

/**
 * Hapus 1 baris material dari Material Master (sheet "MID EXISTING"). Hanya dipanggil
 * setelah dipastikan MID tidak lagi dipakai di transaksi stok/barcode manapun.
 */
function deleteMaterialMaster_(mid) {
  var targetMid = normalizeMid_(mid);
  if (!targetMid) return false;

  var sheet = getSheet_(SHEET_NAMES.MATERIAL_MASTER);
  var headerMap = getHeaderMap_(sheet);
  var midCol = headerMap['MID'] || headerMap['mid'] || 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var midValues = sheet.getRange(2, midCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < midValues.length; i++) {
    if (normalizeMid_(midValues[i][0]) === targetMid) {
      sheet.deleteRow(i + 2);
      materialCache_ = null;
      materialListCache_ = null;
      supplierMapCache_ = null;
      return true;
    }
  }
  return false;
}


