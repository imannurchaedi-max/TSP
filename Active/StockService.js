/**
 * Perhitungan stock real-time dari sheet "BARCODE MATERIAL PRODUKSI" (ledger on-the-fly)
 * + Validator vs MB51.
 *
 * Alur Perhitungan Dual Level:
 * 1. Stock TSP: Mutasi stok area TSP (Terima WRM, Kirim Mesin, Retur dari Mesin, Retur ke WRM).
 * 2. Stock Mesin: Mutasi stok 6 area Mesin (BHP 1..5, AHP 1) per Operator & Consume.
 */

function toDateOrNull_(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

/** Baca seluruh sheet BARCODE MATERIAL PRODUKSI. */
function readAllBarcodeRows_() {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var col = headerMap;

  return data.map(function (row) {
    return {
      barcode: row[(col['BARCODE'] || col['Barcode']) - 1],
      parentBarcode: row[(col['NO RESERVASI'] || col['Parent Barcode']) - 1],
      mid: String(row[(col['MID'] || col['mid']) - 1] || '').trim(),
      deskripsi: row[(col['MATERIAL DESCRIPTION'] || col['Material Description']) - 1],
      jumlah: Number(row[(col['JUMLAH'] || col['Jumlah']) - 1]) || 0,
      mesin: row[(col['MESIN'] || col['Mesin']) - 1],
      tsTerimaWrm: toDateOrNull_(row[(col['DITERIMA OLEH TSP DARI WRM'] || col['Diterima Oleh TSP dari WRM']) - 1]),
      tsKirimMesin: toDateOrNull_(row[(col['DIKIRIM OLEH TSP KE MESIN'] || col['Dikirim Oleh TSP ke Mesin']) - 1]),
      tsRetDariMesin: toDateOrNull_(row[(col['RETUR DITARIK OLEH TSP DARI MESIN'] || col['Retur Ditarik Oleh TSP dari Mesin']) - 1]),
      tsTerimaOperator: toDateOrNull_(row[(col['DITERIMA OLEH OPERATOR DARI TSP'] || col['Diterima Oleh Operator dari TSP']) - 1]),
      tsConsume: toDateOrNull_(row[(col['DICONSUME OLEH OPERATOR'] || col['Diconsume Oleh Operator']) - 1]),
      tsRetKeWrm: toDateOrNull_(row[(col['RETUR DIKIRIM KEMBALI OLEH TSP KE WRM'] || col['Retur Dikirim Kembali Oleh TSP ke WRM']) - 1])
    };
  }).filter(function (r) { return r.mid; });
}

function seedAccFromMaterialMap_() {
  var acc = {};
  var materialMap = getMaterialMap_();
  Object.keys(materialMap).forEach(function (mid) {
    acc[mid] = { deskripsi: materialMap[mid].deskripsi, mb: 0, kb: 0, rib: 0, rob: 0, ms: 0, ks: 0, ris: 0, ros: 0 };
  });
  return acc;
}

function bucketAdd_(acc, mid, deskripsi, field, qty, ts, shiftStart) {
  if (!acc[mid]) {
    acc[mid] = { deskripsi: deskripsi, mb: 0, kb: 0, rib: 0, rob: 0, ms: 0, ks: 0, ris: 0, ros: 0 };
  }
  var before = ts < shiftStart;
  var key = field + (before ? 'b' : 's');
  acc[mid][key] += qty;
}

/** Stock yang sedang dipegang TSP (semua mesin digabung), per MID, untuk shift aktif. */
function computeTspStock_(now) {
  var bounds = getShiftBounds_(now);
  var rows = readAllBarcodeRows_();
  var acc = seedAccFromMaterialMap_();

  rows.forEach(function (r) {
    if (r.tsTerimaWrm) bucketAdd_(acc, r.mid, r.deskripsi, 'm', r.jumlah, r.tsTerimaWrm, bounds.start);
    if (r.tsKirimMesin) bucketAdd_(acc, r.mid, r.deskripsi, 'k', r.jumlah, r.tsKirimMesin, bounds.start);
    if (r.tsRetDariMesin) bucketAdd_(acc, r.mid, r.deskripsi, 'ri', r.jumlah, r.tsRetDariMesin, bounds.start);
    if (r.tsRetKeWrm) bucketAdd_(acc, r.mid, r.deskripsi, 'ro', r.jumlah, r.tsRetKeWrm, bounds.start);
  });

  var result = [];
  Object.keys(acc).forEach(function (mid) {
    var e = acc[mid];
    var stockAwal = e.mb - e.kb + e.rib - e.rob;
    var masuk = e.ms, keluar = e.ks, returIn = e.ris, returOut = e.ros;
    var stockAkhir = stockAwal + masuk - keluar + returIn - returOut;
    result.push({
      mid: mid, deskripsi: e.deskripsi,
      stockAwal: stockAwal, masuk: masuk, keluar: keluar, returIn: returIn, returOut: returOut,
      stockAkhir: stockAkhir
    });
  });
  result.sort(function (a, b) { return String(a.deskripsi).localeCompare(String(b.deskripsi)); });
  return { shift: bounds.shift, date: formatDateLabel_(now), rows: result };
}

/** Perhitungan 39 Kolom STOCK MESIN untuk 6 area Mesin (BHP 1..5, AHP 1). */
function computeMesinStockBreakdown_(now) {
  var bounds = getShiftBounds_(now);
  var rows = readAllBarcodeRows_();
  var materialMap = getMaterialMap_();

  var acc = {};
  Object.keys(materialMap).forEach(function (mid) {
    acc[mid] = {
      mid: mid,
      deskripsi: materialMap[mid].deskripsi,
      uom: materialMap[mid].uom || 'KG',
      machines: {}
    };
    MESIN_LIST.forEach(function (m) {
      acc[mid].machines[m] = { stockAwal: 0, terima: 0, consume: 0, return: 0, stockAkhir: 0 };
    });
  });

  rows.forEach(function (r) {
    var m = r.mesin;
    if (!m || !acc[r.mid] || !acc[r.mid].machines[m]) return;
    var targetMachine = acc[r.mid].machines[m];

    if (r.tsTerimaOperator) {
      if (r.tsTerimaOperator < bounds.start) targetMachine.stockAwal += r.jumlah;
      else targetMachine.terima += r.jumlah;
    }
    if (r.tsConsume) {
      if (r.tsConsume < bounds.start) targetMachine.stockAwal -= r.jumlah;
      else targetMachine.consume += r.jumlah;
    }
    if (r.tsRetDariMesin) {
      if (r.tsRetDariMesin < bounds.start) targetMachine.stockAwal -= r.jumlah;
      else targetMachine.return += r.jumlah;
    }
  });

  Object.keys(acc).forEach(function (mid) {
    MESIN_LIST.forEach(function (m) {
      var tm = acc[mid].machines[m];
      tm.stockAkhir = tm.stockAwal + tm.terima - tm.consume - tm.return;
    });
  });

  return { shift: bounds.shift, date: formatDateLabel_(now), data: acc };
}

function formatDateLabel_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/** Bandingkan Penerimaan TSP vs MB51 SAP. */
function computeValidator_(now) {
  var bounds = getShiftBounds_(now);
  var tz = Session.getScriptTimeZone();

  var masukByMid = {};
  computeTspStock_(now).rows.forEach(function (r) { masukByMid[r.mid] = r.masuk; });

  var mb51Sheet = getSheet_(SHEET_NAMES.MB51);
  var lastRow = mb51Sheet.getLastRow();
  var mb51ByMid = {};
  if (lastRow >= 3) {
    var data = mb51Sheet.getRange(3, 1, lastRow - 2, 13).getValues();
    data.forEach(function (row) {
      var mid = row[0];
      if (mid === '' || mid === null) return;
      var qty = Number(row[3]) || 0;
      var ts = parseMb51Timestamp_(row[11], row[12], tz);
      if (!ts || ts < bounds.start || ts >= bounds.end) return;
      var midKey = String(mid).trim();
      mb51ByMid[midKey] = (mb51ByMid[midKey] || 0) + qty;
    });
  }

  var allMids = {};
  Object.keys(masukByMid).forEach(function (m) { allMids[m] = true; });
  Object.keys(mb51ByMid).forEach(function (m) { allMids[m] = true; });

  var materialMap = getMaterialMap_();
  var result = [];
  Object.keys(allMids).forEach(function (mid) {
    var masukScan = masukByMid[mid] || 0;
    var masukMb51 = mb51ByMid[mid] || 0;
    var selisih = masukScan - masukMb51;
    var material = materialMap[mid];
    result.push({
      mid: mid,
      deskripsi: material ? material.deskripsi : '(MID tidak dikenal)',
      masukScan: masukScan,
      masukMb51: masukMb51,
      selisih: selisih,
      status: selisih === 0 ? 'OK' : 'SELISIH'
    });
  });
  result.sort(function (a, b) { return String(a.deskripsi).localeCompare(String(b.deskripsi)); });
  return { shift: bounds.shift, rows: result };
}

function parseMb51Timestamp_(dateCell, timeCell, tz) {
  if (!dateCell || !timeCell) return null;
  var y, mo, d;
  if (dateCell instanceof Date) {
    y = parseInt(Utilities.formatDate(dateCell, tz, 'yyyy'), 10);
    mo = parseInt(Utilities.formatDate(dateCell, tz, 'M'), 10) - 1;
    d = parseInt(Utilities.formatDate(dateCell, tz, 'd'), 10);
  } else {
    var parts = String(dateCell).trim().split('.');
    if (parts.length !== 3) return null;
    d = parseInt(parts[0], 10);
    mo = parseInt(parts[1], 10) - 1;
    y = parseInt(parts[2], 10);
  }
  var timeStr = timeCell instanceof Date ? Utilities.formatDate(timeCell, tz, 'HH:mm:ss') : String(timeCell);
  var timeParts = timeStr.split(':');
  var h = parseInt(timeParts[0], 10) || 0;
  var mi = parseInt(timeParts[1], 10) || 0;
  var s = parseInt(timeParts[2], 10) || 0;
  return new Date(y, mo, d, h, mi, s);
}
