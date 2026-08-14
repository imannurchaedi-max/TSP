/**
 * Lookup master material dari sheet Material Master (MID -> Deskripsi, UOM, Supplier).
 * Di-cache per eksekusi (variable global) supaya tidak baca sheet berkali-kali
 * dalam satu request.
 */

var materialCache_ = null;
var materialListCache_ = null;
var supplierMapCache_ = null;

// Nama sheet Material Master versi lama, sebelum dipindah ke SHEET_NAMES.MATERIAL_MASTER
// ('MATERIAL MASTER'). Dipakai satu kali oleh migrateMaterialMasterIfEmpty_ untuk menyalin
// data lama ke sheet baru; tidak dipakai lagi setelah migrasi selesai.
var OLD_MATERIAL_MASTER_SHEET_NAME_ = 'MID EXISTING';

// Kolom "Deskripsi" di sheet Material Master kadang ditulis sebagai "MATERIAL DESCRIPTION"
// (mengikuti header template CSV) -- terima kedua penamaan supaya sheet manapun yang dipakai
// user tetap kebaca dengan benar.
function resolveDeskCol_(headerMap) {
  return headerMap['Deskripsi'] || headerMap['deskripsi'] ||
         headerMap['MATERIAL DESCRIPTION'] || headerMap['material description'];
}

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
  var midCol = headerMap['MID'] || headerMap['mid'] || 1;
  var deskripsiCol = resolveDeskCol_(headerMap) || 2;
  var uomCol = headerMap['UOM'] || headerMap['uom'] || 3;
  var suppCol = headerMap['Supplier'] || headerMap['supplier'];
  var statusCol = headerMap['Status'] || headerMap['status'];

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
        supplier: suppCol ? String(row[suppCol - 1] || '').trim() : '',
        status: statusCol ? (String(row[statusCol - 1] || '').trim() || 'Aktif') : 'Aktif'
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
  var midCol = headerMap['MID'] || headerMap['mid'] || 1;
  var deskripsiCol = resolveDeskCol_(headerMap) || 2;
  var uomCol = headerMap['UOM'] || headerMap['uom'] || 3;
  var suppCol = headerMap['Supplier'] || headerMap['supplier'];
  var statusCol = headerMap['Status'] || headerMap['status'];

  var map = {};
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    data.forEach(function (row) {
      var mid = row[midCol - 1];
      if (mid === '' || mid === null) return;
      map[String(mid).trim()] = {
        deskripsi: row[deskripsiCol - 1],
        uom: row[uomCol - 1],
        supplier: suppCol ? String(row[suppCol - 1] || '').trim() : '',
        status: statusCol ? (String(row[statusCol - 1] || '').trim() || 'Aktif') : 'Aktif'
      };
    });
  }

  materialCache_ = map;
  return map;
}

/**
 * Sesi "Material List": insert atau update 1 baris di Material Master (sheet "MID EXISTING") --
 * MID, Deskripsi, UOM, Supplier. Menambahkan kolom "Supplier" ke header sheet otomatis kalau
 * belum ada. Berbeda dari versi lama (upsertMaterialMaster_), fungsi ini SELALU menimpa field
 * dengan nilai baru (bukan cuma mengisi yang kosong) -- karena ini dipanggil dari aksi eksplisit
 * user "Tambah/Edit Material", jadi wajar kalau user memang mau mengubah deskripsi/UOM/supplier.
 */
function saveMaterialMaster_(nik, mid, deskripsi, uom, supplier, status) {
  try {
    var targetMid = normalizeMid_(mid);
    if (!targetMid) {
      return { success: false, message: 'MID wajib diisi.' };
    }

    var sheet = getSheet_(SHEET_NAMES.MATERIAL_MASTER);
    var headerMap = getHeaderMap_(sheet);
    var midCol = headerMap['MID'] || headerMap['mid'] || 1;
    var deskCol = resolveDeskCol_(headerMap) || 2;
    var uomCol = headerMap['UOM'] || headerMap['uom'] || 3;
    var suppCol = headerMap['Supplier'] || headerMap['supplier'];
    var statusCol = headerMap['Status'] || headerMap['status'];

    if (!suppCol) {
      suppCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, suppCol).setValue('Supplier').setFontWeight('bold').setBackground('#f1f5f9');
    }
    if (!statusCol) {
      statusCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, statusCol).setValue('Status').setFontWeight('bold').setBackground('#f1f5f9');
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
    var uomVal = String(uom || '').trim() || 'KG';
    var suppVal = String(supplier || '').trim();
    var statusVal = String(status || '').trim() || 'Aktif';

    if (targetRow === -1) {
      var maxCol = Math.max(midCol, deskCol, uomCol, suppCol, statusCol);
      var newRow = [];
      for (var c = 1; c <= maxCol; c++) newRow.push('');
      newRow[midCol - 1] = targetMid;
      newRow[deskCol - 1] = descVal;
      newRow[uomCol - 1] = uomVal;
      newRow[suppCol - 1] = suppVal;
      newRow[statusCol - 1] = statusVal;
      sheet.appendRow(newRow);
    } else {
      sheet.getRange(targetRow, deskCol).setValue(descVal);
      sheet.getRange(targetRow, uomCol).setValue(uomVal);
      sheet.getRange(targetRow, suppCol).setValue(suppVal);
      sheet.getRange(targetRow, statusCol).setValue(statusVal);
    }

    materialCache_ = null;
    materialListCache_ = null;
    supplierMapCache_ = null;
    return { success: true, message: 'Material ' + targetMid + ' berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan material: ' + err.message };
  }
}

/**
 * Sesi "Material List": bulk save / update material dari CSV Upload (MID, Deskripsi, UOM, Supplier).
 */
function saveMaterialBatch_(nik, items) {
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { success: false, message: 'Data import CSV kosong atau tidak valid.' };
    }

    var sheet = getSheet_(SHEET_NAMES.MATERIAL_MASTER);
    var headerMap = getHeaderMap_(sheet);
    var midCol = headerMap['MID'] || headerMap['mid'] || 1;
    var deskCol = resolveDeskCol_(headerMap) || 2;
    var uomCol = headerMap['UOM'] || headerMap['uom'] || 3;
    var suppCol = headerMap['Supplier'] || headerMap['supplier'];
    var statusCol = headerMap['Status'] || headerMap['status'];

    if (!suppCol) {
      suppCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, suppCol).setValue('Supplier').setFontWeight('bold').setBackground('#f1f5f9');
    }
    if (!statusCol) {
      statusCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, statusCol).setValue('Status').setFontWeight('bold').setBackground('#f1f5f9');
    }

    var lastRow = sheet.getLastRow();
    var rowMap = {};
    if (lastRow >= 2) {
      var midValues = sheet.getRange(2, midCol, lastRow - 1, 1).getValues();
      for (var i = 0; i < midValues.length; i++) {
        var m = normalizeMid_(midValues[i][0]);
        if (m) rowMap[m] = i + 2;
      }
    }

    var importedCount = 0;
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      var mid = normalizeMid_(item.mid);
      if (!mid) continue;

      var descVal = String(item.deskripsi || '').trim();
      var uomVal = String(item.uom || '').trim() || 'KG';
      var suppVal = String(item.supplier || '').trim();
      var statusVal = String(item.status || '').trim() || 'Aktif';

      if (rowMap[mid]) {
        var rIdx = rowMap[mid];
        sheet.getRange(rIdx, deskCol).setValue(descVal);
        sheet.getRange(rIdx, uomCol).setValue(uomVal);
        sheet.getRange(rIdx, suppCol).setValue(suppVal);
        sheet.getRange(rIdx, statusCol).setValue(statusVal);
      } else {
        var maxCol = Math.max(midCol, deskCol, uomCol, suppCol, statusCol);
        var newRow = [];
        for (var c = 1; c <= maxCol; c++) newRow.push('');
        newRow[midCol - 1] = mid;
        newRow[deskCol - 1] = descVal;
        newRow[uomCol - 1] = uomVal;
        newRow[suppCol - 1] = suppVal;
        newRow[statusCol - 1] = statusVal;
        sheet.appendRow(newRow);
        rowMap[mid] = sheet.getLastRow();
      }
      importedCount++;
    }

    materialCache_ = null;
    materialListCache_ = null;
    supplierMapCache_ = null;
    return { success: true, message: 'Berhasil mengimpor / memperbarui ' + importedCount + ' material.' };
  } catch (err) {
    return { success: false, message: 'Gagal mengimpor batch material: ' + err.message };
  }
}

/**
 * Sesi "Material List": hapus 1 material dari Material Master. Ditolak kalau MID pernah dipakai
 * di transaksi stok/barcode manapun (lihat isMidUsedAnywhere_), supaya lookup deskripsi/UOM di
 * riwayat lama tidak rusak. Kalau berhasil dihapus, seluruh baris Min/Max Stock terkait MID ini
 * ikut dihapus (cascade) supaya tidak ada pengaturan Min/Max yang jadi yatim piatu.
 */
function deleteMaterial_(nik, mid) {
  try {
    var targetMid = normalizeMid_(mid);
    if (!targetMid) {
      return { success: false, message: 'MID wajib diisi.' };
    }

    if (isMidUsedAnywhere_(targetMid)) {
      return { success: false, message: 'Material ' + targetMid + ' tidak bisa dihapus karena sudah pernah dipakai di transaksi stok/barcode.' };
    }

    var removed = deleteMaterialMaster_(targetMid);
    if (!removed) {
      return { success: false, message: 'Material tidak ditemukan di Material List.' };
    }

    // Cascade: hapus semua baris Min/Max Stock terkait MID ini juga.
    var mmSheet = getMinMaxSheet_();
    var lastRow = mmSheet.getLastRow();
    if (lastRow >= 2) {
      var data = mmSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = data.length - 1; i >= 0; i--) {
        if (normalizeMid_(data[i][0]) === targetMid) mmSheet.deleteRow(i + 2);
      }
    }

    return { success: true, message: 'Material ' + targetMid + ' berhasil dihapus.' };
  } catch (err) {
    return { success: false, message: 'Gagal menghapus material: ' + err.message };
  }
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

/**
 * Migrasi sekali-jalan: kalau sheet Material Master baru (SHEET_NAMES.MATERIAL_MASTER,
 * 'MATERIAL MASTER') masih kosong, salin semua data dari sheet lama
 * (OLD_MATERIAL_MASTER_SHEET_NAME_, 'MID EXISTING') ke situ. Aman dipanggil berkali-kali --
 * setelah baris pertama berhasil ditulis, sheet baru tidak lagi kosong sehingga fungsi ini
 * langsung return di percobaan berikutnya. Kalau sheet lama sudah tidak ada (mis. sudah
 * dihapus manual setelah migrasi selesai), fungsi ini diam saja -- tidak ada yang perlu
 * dimigrasikan lagi.
 */
function migrateMaterialMasterIfEmpty_() {
  var sheet;
  try {
    sheet = getSheet_(SHEET_NAMES.MATERIAL_MASTER);
  } catch (e) {
    return; // sheet baru belum dibuat -- tidak ada yang bisa dimigrasikan ke situ
  }
  if (sheet.getLastRow() >= 2) return;

  var oldSheet;
  try {
    oldSheet = getSheet_(OLD_MATERIAL_MASTER_SHEET_NAME_);
  } catch (e) {
    return;
  }
  if (oldSheet.getSheetId() === sheet.getSheetId()) return;

  var oldLastRow = oldSheet.getLastRow();
  if (oldLastRow < 2) return;

  var oldHeaderMap = getHeaderMap_(oldSheet);
  var oldMidCol = oldHeaderMap['MID'] || oldHeaderMap['mid'] || 1;
  var oldDeskCol = resolveDeskCol_(oldHeaderMap) || 2;
  var oldUomCol = oldHeaderMap['UOM'] || oldHeaderMap['uom'] || 3;
  var oldSuppCol = oldHeaderMap['Supplier'] || oldHeaderMap['supplier'];

  var oldData = oldSheet.getRange(2, 1, oldLastRow - 1, oldSheet.getLastColumn()).getValues();

  var newHeaderMap = getHeaderMap_(sheet);
  var newMidCol = newHeaderMap['MID'] || newHeaderMap['mid'] || 1;
  var newDeskCol = resolveDeskCol_(newHeaderMap) || 2;
  var newUomCol = newHeaderMap['UOM'] || newHeaderMap['uom'] || 3;
  var newSuppCol = newHeaderMap['Supplier'] || newHeaderMap['supplier'];
  if (!newSuppCol) {
    newSuppCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, newSuppCol).setValue('SUPPLIER').setFontWeight('bold').setBackground('#f1f5f9');
  }

  var maxCol = Math.max(newMidCol, newDeskCol, newUomCol, newSuppCol);
  var rowsToWrite = oldData.map(function (r) {
    var row = [];
    for (var c = 0; c < maxCol; c++) row.push('');
    row[newMidCol - 1] = r[oldMidCol - 1];
    row[newDeskCol - 1] = r[oldDeskCol - 1];
    row[newUomCol - 1] = r[oldUomCol - 1];
    if (oldSuppCol) row[newSuppCol - 1] = r[oldSuppCol - 1];
    return row;
  });

  sheet.getRange(2, 1, rowsToWrite.length, maxCol).setValues(rowsToWrite);

  materialCache_ = null;
  materialListCache_ = null;
  supplierMapCache_ = null;
}


