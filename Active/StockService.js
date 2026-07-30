/**
 * Perhitungan stock real-time dari sheet "Barcode Material Produksi" (ledger on-the-fly,
 * tanpa sheet snapshot tambahan) + validator vs MB51.
 *
 * MB51 di sini HANYA validator pembanding, bukan sumber angka "Masuk" -- angka Masuk/Keluar
 * di dashboard murni dari checkpoint timestamp+Jumlah hasil scan barcode (lihat
 * BarcodeService.js / Config.js EVENTS).
 */

function toDateOrNull_(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

/** Baca seluruh sheet Barcode Material Produksi sekali, parse jadi array baris ringkas. */
function readAllBarcodeRows_() {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var col = headerMap;

  return data.map(function (row) {
    return {
      barcode: row[col['Barcode'] - 1],
      mid: String(row[col['MID'] - 1] || '').trim(),
      deskripsi: row[col['Material Description'] - 1],
      jumlah: Number(row[col['Jumlah'] - 1]) || 0,
      mesin: row[col['Mesin'] - 1],
      tsTerimaWrm: toDateOrNull_(row[col['Diterima Oleh TSP dari WRM'] - 1]),
      tsKirimMesin: toDateOrNull_(row[col['Dikirim Oleh TSP ke Mesin'] - 1]),
      tsRetDariMesin: toDateOrNull_(row[col['Retur Ditarik Oleh TSP dari Mesin'] - 1]),
      tsTerimaOperator: toDateOrNull_(row[col['Diterima Oleh Operator dari TSP'] - 1]),
      tsConsume: toDateOrNull_(row[col['Diconsume Oleh Operator'] - 1]),
      tsRetKeWrm: toDateOrNull_(row[col['Retur Dikirim Kembali Oleh TSP ke WRM'] - 1])
    };
  }).filter(function (r) { return r.mid; });
}

/**
 * Inisialisasi accumulator dari SELURUH material master ("MID EXISTING", via
 * `getMaterialMap_()` di MaterialService.js), nilai 0 semua -- supaya tabel Stock selalu
 * menampilkan semua material yang ditangani TSP/Operator, bukan cuma yang sudah ada
 * aktivitas scan.
 */
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
  var key = field + (before ? 'b' : 's'); // mis. 'm'+'b' -> 'mb', 'm'+'s' -> 'ms'... lihat map di bawah
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

/** Stock yang sedang ada di 1 mesin tertentu, per MID, untuk shift aktif. */
function computeMesinStock_(mesinCode, now) {
  var bounds = getShiftBounds_(now);
  var rows = readAllBarcodeRows_().filter(function (r) { return r.mesin === mesinCode; });
  var acc = seedAccFromMaterialMap_();

  rows.forEach(function (r) {
    if (r.tsTerimaOperator) bucketAdd_(acc, r.mid, r.deskripsi, 'm', r.jumlah, r.tsTerimaOperator, bounds.start);
    if (r.tsConsume) bucketAdd_(acc, r.mid, r.deskripsi, 'k', r.jumlah, r.tsConsume, bounds.start);
    if (r.tsRetDariMesin) bucketAdd_(acc, r.mid, r.deskripsi, 'k', r.jumlah, r.tsRetDariMesin, bounds.start);
  });

  var result = [];
  Object.keys(acc).forEach(function (mid) {
    var e = acc[mid];
    var stockAwal = e.mb - e.kb;
    var masuk = e.ms, keluar = e.ks;
    var stockAkhir = stockAwal + masuk - keluar;
    result.push({ mid: mid, deskripsi: e.deskripsi, stockAwal: stockAwal, masuk: masuk, keluar: keluar, stockAkhir: stockAkhir });
  });
  result.sort(function (a, b) { return String(a.deskripsi).localeCompare(String(b.deskripsi)); });
  return { shift: bounds.shift, date: formatDateLabel_(now), mesin: mesinCode, rows: result };
}

function formatDateLabel_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/**
 * N baris penerimaan terakhir (baris INDUK dengan "Diterima Oleh TSP dari WRM" terisi),
 * diurutkan dari yang paling baru, buat panel "Penerimaan Terakhir" di tab Stock (role TSP).
 */
function computeRecentReceipts_(limit) {
  var tz = Session.getScriptTimeZone();
  var rows = readAllBarcodeRows_()
    .filter(function (r) { return r.tsTerimaWrm; })
    .sort(function (a, b) { return b.tsTerimaWrm - a.tsTerimaWrm; })
    .slice(0, limit)
    .map(function (r) {
      return {
        waktu: Utilities.formatDate(r.tsTerimaWrm, tz, 'dd/MM HH:mm'),
        barcode: r.barcode,
        deskripsi: r.deskripsi,
        jumlah: r.jumlah
      };
    });
  return rows;
}

/**
 * Gabungkan tanggal (bisa Date atau teks "DD.MM.YYYY") dengan jam dari cell Time (Date)
 * jadi 1 timestamp lengkap, dalam timezone script.
 */
function parseMb51Timestamp_(dateCell, timeCell, tz) {
  if (!dateCell || !timeCell) return null;

  var y, mo, d;
  if (dateCell instanceof Date) {
    y = parseInt(Utilities.formatDate(dateCell, tz, 'yyyy'), 10);
    mo = parseInt(Utilities.formatDate(dateCell, tz, 'M'), 10) - 1;
    d = parseInt(Utilities.formatDate(dateCell, tz, 'd'), 10);
  } else {
    var parts = String(dateCell).trim().split('.'); // DD.MM.YYYY
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

/** Bandingkan Masuk (hasil scan, shift aktif) vs total Quantity MB51 di window shift yang sama. */
function computeValidator_(now) {
  var bounds = getShiftBounds_(now);
  var tz = Session.getScriptTimeZone();

  var masukByMid = {};
  computeTspStock_(now).rows.forEach(function (r) { masukByMid[r.mid] = r.masuk; });

  var mb51Sheet = getSheet_(SHEET_NAMES.MB51);
  var lastRow = mb51Sheet.getLastRow();
  var mb51ByMid = {};
  if (lastRow >= 3) {
    var data = mb51Sheet.getRange(3, 1, lastRow - 2, 13).getValues(); // kolom A..M
    data.forEach(function (row) {
      var mid = row[0];
      if (mid === '' || mid === null) return;
      var qty = Number(row[3]) || 0; // D = Quantity
      var ts = parseMb51Timestamp_(row[11], row[12], tz); // L=Posting Date, M=Time
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
