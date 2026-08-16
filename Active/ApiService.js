/**
 * JSON HTTP API untuk client native (app Android/Flutter TSP Modul).
 *
 * Prinsip: file ini TIDAK menduplikasi business logic. doPost() cuma jadi transport JSON
 * di atas fungsi publik yang sudah ada di Code.js (login, submitScan, getTspStock, dst) --
 * fungsi-fungsi itu sudah murni menerima parameter & mengembalikan { success, message, data },
 * jadi aman dipanggil ulang dari sini tanpa mengubah satu pun perilaku web app (google.script.run)
 * yang sudah berjalan.
 *
 * doGet(e) di Code.js tetap melayani HTML web app seperti biasa -- doPost(e) di sini KHUSUS
 * jalur JSON API (dipanggil dari app native lewat HTTP POST), jadi tidak ada konflik routing.
 *
 * Auth: token-based, bukan NIK+password di tiap request. login (action="login") tidak perlu
 * token; semua action lain wajib sertakan token hasil login yang masih valid.
 */

var API_TOKEN_TTL_SECONDS = 6 * 60 * 60; // 6 jam -- batas maksimum TTL CacheService Apps Script
var API_IDEMPOTENCY_TTL_SECONDS = 2 * 60 * 60; // 2 jam, cukup untuk menutup celah retry offline-sync

function doPost(e) {
  var response;
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(raw);
    var action = body.action;
    if (!action) throw new Error('Field "action" wajib diisi.');

    if (action === 'login') {
      response = apiLogin_(body.nik, body.password);
    } else {
      var session = validateApiToken_(body.token);
      response = dispatchApiAction_(action, body, session);
    }
  } catch (err) {
    response = { success: false, message: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Login untuk API: pakai login_() yang sudah ada (AuthService.js, tidak diubah), lalu terbitkan
 * token sesi baru. Token disimpan di CacheService, bukan NIK/password, supaya request berikutnya
 * tidak perlu kirim ulang password.
 */
function apiLogin_(nik, password) {
  var user = login_(nik, password); // bisa throw -- ditangkap di doPost, pesan aman utk ditampilkan
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('api_session_' + token, String(user.nik), API_TOKEN_TTL_SECONDS);
  return { success: true, message: 'Login berhasil', user: user, token: token };
}

/**
 * Validasi token sesi API + sliding window (TTL direfresh tiap request valid, supaya sesi aktif
 * tidak habis di tengah shift). Role SELALU diverifikasi ulang dari sheet KARYAWAN lewat
 * resolveRole_() yang sudah ada -- konsisten dengan pola submitScan() yang tidak percaya klaim
 * role dari client.
 */
function validateApiToken_(token) {
  if (!token) throw new Error('Token API wajib diisi.');
  var cache = CacheService.getScriptCache();
  var key = 'api_session_' + token;
  var nik = cache.get(key);
  if (!nik) throw new Error('Sesi API tidak valid atau kadaluarsa, silakan login ulang.');
  cache.put(key, nik, API_TOKEN_TTL_SECONDS); // sliding window

  var actor = resolveRole_(nik);
  return { nik: actor.nik, nama: actor.nama, role: actor.role, token: token };
}

/**
 * submitScan dibungkus idempotency check: client (app offline-sync) mengirim clientRequestId
 * unik per scan. Kalau request dengan id yang sama pernah sukses diproses (mis. respons
 * sebelumnya hilang karena koneksi putus saat sinkron), kembalikan hasil yang sudah tercatat
 * TANPA memanggil submitScan() lagi -- supaya tidak dobel-scan / dobel-reprint / dobel log.
 */
function apiSubmitScanIdempotent_(body, session) {
  var clientRequestId = body.clientRequestId;
  var cache = CacheService.getScriptCache();
  var cacheKey = clientRequestId ? ('req_' + clientRequestId) : null;

  if (cacheKey) {
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  var result = submitScan(body.barcodeText, body.eventCode, body.mesinCode, body.jumlah, body.noReservasi, session.nik);

  if (cacheKey) {
    try { cache.put(cacheKey, JSON.stringify(result), API_IDEMPOTENCY_TTL_SECONDS); } catch (e) {
      // Caching idempotency bersifat best-effort -- kalau gagal, request tetap sudah berhasil diproses.
    }
  }
  return result;
}

/**
 * Peta action -> handler. Setiap handler memanggil fungsi publik Code.js yang sudah ada
 * (nama sama persis dengan yang dipakai google.script.run di web app). Aksi yang menulis data
 * (submitScan, tarikStokAwalShift, konfirmasi*, saveMaterial*, saveMinMax*, deleteMaterial*,
 * deleteMinMax*) pakai session.nik hasil verifikasi token, BUKAN nik yang dikirim client --
 * lebih aman daripada jalur google.script.run lama yang percaya nik dari client.
 */
var API_ACTIONS_ = {
  submitScan: function (body, session) { return apiSubmitScanIdempotent_(body, session); },
  getMesinList: function () { return { success: true, data: getMesinList() }; },
  getReservasiOptions: function () { return getReservasiOptions(); },
  getTspStock: function () { return getTspStock(); },
  getTspMesinMonitoring: function () { return getTspMesinMonitoring(); },
  getMesinStock: function (body) { return getMesinStock(body.mesinCode); },
  getValidatorData: function () { return getValidatorData(); },
  getShiftReceipts: function () { return getShiftReceipts(); },
  getShiftDispatches: function () { return getShiftDispatches(); },
  getOperatorReceipts: function (body) { return getOperatorReceipts(body.mesin); },
  getOperatorConsumption: function (body) { return getOperatorConsumption(body.mesin); },

  tarikStokAwalShift: function (body, session) { return tarikStokAwalShift(session.nik); },
  konfirmasiNeracaStokShift: function (body, session) { return konfirmasiNeracaStokShift(session.nik, body.aktualData); },
  konfirmasiItemStokShift: function (body, session) { return konfirmasiItemStokShift(session.nik, body.mid, body.aktualValue, body.statusType); },

  getHistoricalTspStock: function (body) { return getHistoricalTspStock(body.dateStr, body.shiftNum); },
  getHistoricalMesinStock: function (body) { return getHistoricalMesinStock(body.mesinCode, body.dateStr, body.shiftNum); },
  getPortalHistory: function (body) { return getPortalHistory(body.mesinCode, body.dateStr, body.shiftNum); },

  getReprintData: function (body) { return getReprintData(body.query); },
  saveBatchReprint: function (body, session) { return saveBatchReprint(session.nik, body.labels); },
  deleteReprintBarcode: function (body, session) { return deleteReprintBarcode(session.nik, body.barcodeAnak); },

  getMinMaxSettings: function () { return getMinMaxSettingsApi(); },
  saveMinMaxSetting: function (body, session) { return saveMinMaxSettingApi(session.nik, body.mid, body.lokasi, body.minStock, body.maxStock); },
  saveMinMaxBatch: function (body, session) { return saveMinMaxBatchApi(session.nik, body.items); },
  deleteMinMaxSetting: function (body, session) { return deleteMinMaxSettingApi(session.nik, body.mid, body.lokasi); },

  getMaterialList: function () { return getMaterialListApi(); },
  saveMaterial: function (body, session) { return saveMaterialApi(session.nik, body.mid, body.deskripsi, body.uom, body.supplier, body.status); },
  saveMaterialBatch: function (body, session) { return saveMaterialBatchApi(session.nik, body.items); },
  deleteMaterial: function (body, session) { return deleteMaterialApi(session.nik, body.mid); }
};

function dispatchApiAction_(action, body, session) {
  var handler = API_ACTIONS_[action];
  if (!handler) throw new Error('Action "' + action + '" tidak dikenal.');
  return handler(body, session);
}
