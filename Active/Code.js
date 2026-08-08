/**
 * Entry point web app TSP Modul.
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.appUrl = ScriptApp.getService().getUrl();
  return template.evaluate()
    .setTitle('TSP Modul')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Dipanggil dari client saat submit form login.
 */
function login(nik, password) {
  try {
    var user = login_(nik, password);
    return { success: true, message: 'Login berhasil', user: user };
  } catch (err) {
    return { success: false, message: err.message, user: null };
  }
}

/**
 * Dipanggil dari client (google.script.run) saat barcode berhasil discan.
 */
function submitScan(barcodeText, eventCode, mesinCode, jumlah, noReservasi, nik) {
  var actor;
  try {
    actor = resolveRole_(nik);
  } catch (err) {
    return { success: false, message: err.message, childBarcode: null };
  }

  var actorLabel = actor.nik + ' - ' + actor.nama;
  var result;
  try {
    result = processScan_(barcodeText, eventCode, mesinCode, jumlah, noReservasi, actorLabel, actor.role);
    appendLog_({
      'Timestamp': new Date(),
      'Barcode': barcodeText,
      'Event': eventCode,
      'Actor': actorLabel,
      'Role': actor.role,
      'Mesin': mesinCode || '',
      'Hasil': 'SUKSES',
      'Pesan': result.message
    });
    return {
      success: true,
      message: result.message,
      childBarcode: result.childBarcode || null,
      details: result.details || null
    };
  } catch (err) {
    appendLog_({
      'Timestamp': new Date(),
      'Barcode': barcodeText,
      'Event': eventCode,
      'Actor': actorLabel,
      'Role': actor.role,
      'Mesin': mesinCode || '',
      'Hasil': 'GAGAL',
      'Pesan': err.message
    });
    return { success: false, message: err.message, childBarcode: null, details: null };
  }
}

function getMesinList() {
  return MESIN_LIST;
}

/** Ambil semua daftar nomor reservasi dari tab RESERVASI. */
function getReservasiOptions() {
  try {
    return { success: true, data: getReservasiList_() };
  } catch (err) {
    return { success: false, message: err.message, data: [] };
  }
}

/** Stock yang sedang dipegang TSP (semua mesin), untuk dashboard tab "Stock". */
function getTspStock() {
  try {
    return { success: true, data: computeTspStock_(new Date()) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Data monitoring stok 6 Mesin (BHP 1..5, AHP 1) & notifikasi stok rendah untuk dashboard TSP. */
function getTspMesinMonitoring() {
  try {
    return { success: true, data: computeTspMesinMonitoring_(new Date()) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Stock yang sedang ada di 1 mesin (dipilih Operator lewat dropdown). */
function getMesinStock(mesinCode) {
  try {
    if (MESIN_LIST.indexOf(mesinCode) === -1) {
      throw new Error('Mesin tidak valid.');
    }
    return { success: true, data: computeMesinStock_(mesinCode, new Date()) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Bandingkan Masuk hasil scan vs MB51 untuk shift aktif. */
function getValidatorData() {
  try {
    return { success: true, data: computeValidator_(new Date()) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Panel "Penerimaan Shift Ini" di tab Stock (role TSP). */
function getShiftReceipts() {
  try {
    return { success: true, data: computeShiftReceipts_(new Date()) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Panel "Pengiriman Shift Ini" di tab Stock (role TSP). */
function getShiftDispatches() {
  try {
    return { success: true, data: computeShiftDispatches_(new Date()) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Panel "Terima dari TSP" di tab Stock (role Operator). */
function getOperatorReceipts(mesin) {
  try {
    return { success: true, data: computeOperatorReceipts_(new Date(), mesin) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Panel "Konsumsi Material" di tab Stock (role Operator). */
function getOperatorConsumption(mesin) {
  try {
    return { success: true, data: computeOperatorConsumption_(new Date(), mesin) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}


/** Aksi resmi Admin TSP untuk menarik stok akhir dari shift sebelumnya ke shift aktif. */
function tarikStokAwalShift(nik) {
  try {
    var actor = { nik: '-', nama: 'Admin TSP' };
    try { actor = resolveRole_(nik); } catch(e) {}
    var res = tarikStokAwalShift_(actor.nik, actor.nama);
    return res;
  } catch (err) {
    return { success: false, message: 'Gagal menarik stok awal: ' + err.message };
  }
}

/** Aksi resmi Admin TSP untuk mengunci neraca stok sesudah verifikasi fisik keliling. */
function konfirmasiNeracaStokShift(nik, aktualData) {
  try {
    var actor = { nik: '-', nama: 'Admin TSP' };
    try { actor = resolveRole_(nik); } catch(e) {}
    var res = konfirmasiStokShift_(actor.nik, actor.nama, aktualData);
    return res;
  } catch (err) {
    return { success: false, message: 'Gagal konfirmasi stok: ' + err.message };
  }
}

/** Aksi resmi Admin TSP untuk konfirmasi atau revisi aktual per item material saat keliling lapangan. */
function konfirmasiItemStokShift(nik, mid, aktualValue, statusType) {
  try {
    var actor = { nik: '-', nama: 'Admin TSP' };
    try { actor = resolveRole_(nik); } catch(e) {}
    var res = konfirmasiItemStokShift_(actor.nik, actor.nama, mid, aktualValue, statusType);
    return res;
  } catch (err) {
    return { success: false, message: 'Gagal konfirmasi item: ' + err.message };
  }
}

/** Endpoint API Riwayat Stok untuk TSP Admin */
function getHistoricalTspStock(dateStr, shiftNum) {
  try {
    return { success: true, data: computeHistoricalTspStock_(dateStr, shiftNum) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Endpoint API Riwayat Stok untuk Operator Mesin */
function getHistoricalMesinStock(mesinCode, dateStr, shiftNum) {
  try {
    return { success: true, data: computeHistoricalMesinStock_(mesinCode, dateStr, shiftNum) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Endpoint API Riwayat Format Portal per Jam untuk Operator Mesin */
function getPortalHistory(mesinCode, dateStr, shiftNum) {
  try {
    return { success: true, data: computePortalHistory_(mesinCode, dateStr, shiftNum) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/**
 * Endpoint Reprint Barcode — cari kode anak di tab REPRINT BARCODE.
 * query: Kode Induk atau Kode Anak (substring, case-insensitive)
 */
function getReprintData(query) {
  try {
    if (!query || String(query).trim() === '') {
      return { success: false, message: 'Query tidak boleh kosong.', data: [] };
    }
    var rows = getReprintData_(String(query).trim());
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, message: err.message, data: [] };
  }
}

/**
 * REPRINT MODULE: Menyimpan sejumlah label reprint ke REPRINT BARCODE
 * dan mendaftarkannya ke BARCODE MATERIAL PRODUKSI.
 */
function saveBatchReprint(labels) {
  try {
    var res = saveBatchReprint_(labels);
    return res;
  } catch (err) {
    return { success: false, message: 'Gagal merekam reprint: ' + err.message };
  }
}

/** Endpoint API Pengaturan Min/Max Stock (SPV) */
function getMinMaxSettingsApi() {
  try {
    return getMinMaxSettings();
  } catch (err) {
    return { success: false, message: err.message, data: [] };
  }
}

/** Endpoint API Simpan Min/Max Stock (SPV) */
function saveMinMaxSettingApi(nik, mid, deskripsi, lokasi, minStock, maxStock, uom, supplier) {
  try {
    return saveMinMaxSetting(nik, mid, deskripsi, lokasi, minStock, maxStock, uom, supplier);
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan min/max: ' + err.message };
  }
}

/** Endpoint API Simpan Batch CSV Min/Max Stock (SPV) */
function saveMinMaxBatchApi(nik, items) {
  try {
    return saveMinMaxBatch_(nik, items);
  } catch (err) {
    return { success: false, message: 'Gagal mengimpor batch min/max: ' + err.message };
  }
}

/** Endpoint API Hapus Pengaturan Min/Max Stock (SPV / TSP via tombol Tambah Material) */
function deleteMinMaxSettingApi(nik, mid, lokasi) {
  try {
    return deleteMinMaxSetting_(nik, mid, lokasi);
  } catch (err) {
    return { success: false, message: 'Gagal menghapus: ' + err.message };
  }
}
