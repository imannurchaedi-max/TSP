/**
 * Lookup master material dari sheet "MID EXISTING" (MID -> Deskripsi, UOM).
 * Di-cache per eksekusi (variable global) supaya tidak baca sheet berkali-kali
 * dalam satu request.
 */

var materialCache_ = null;

function getMaterialMap_() {
  if (materialCache_) return materialCache_;

  var sheet = getSheet_(SHEET_NAMES.MATERIAL_MASTER);
  var lastRow = sheet.getLastRow();
  var headerMap = getHeaderMap_(sheet);
  var midCol = headerMap['MID'];
  var deskripsiCol = headerMap['Deskripsi'];
  var uomCol = headerMap['UOM'];

  var map = {};
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    data.forEach(function (row) {
      var mid = row[midCol - 1];
      if (mid === '' || mid === null) return;
      map[String(mid).trim()] = {
        deskripsi: row[deskripsiCol - 1],
        uom: row[uomCol - 1]
      };
    });
  }

  materialCache_ = map;
  return map;
}

function lookupMaterial_(mid) {
  var map = getMaterialMap_();
  return map[String(mid).trim()] || null;
}
