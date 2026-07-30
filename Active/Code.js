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
 * Dipanggil dari client saat submit form login. Selalu return { success, message, user }.
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
 * Selalu return objek { success, message }, tidak pernah throw ke client,
 * supaya UI bisa selalu menampilkan pesan yang jelas.
 *
 * Role TIDAK dipercaya dari client -- selalu di-derive ulang dari NIK (resolveRole_)
 * supaya user tidak bisa memalsukan role lewat sessionStorage/console.
 */
function submitScan(barcodeText, eventCode, mesinCode, jumlah, nik) {
  var actor;
  try {
    actor = resolveRole_(nik);
  } catch (err) {
    return { success: false, message: err.message, childBarcode: null };
  }

  var actorLabel = actor.nik + ' - ' + actor.nama;
  var result;
  try {
    result = processScan_(barcodeText, eventCode, mesinCode, jumlah, actorLabel, actor.role);
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
    return { success: true, message: result.message, childBarcode: result.childBarcode || null };
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
    return { success: false, message: err.message, childBarcode: null };
  }
}

function getMesinList() {
  return MESIN_LIST;
}

/** Stock yang sedang dipegang TSP (semua mesin), untuk dashboard tab "Stock". */
function getTspStock() {
  try {
    return { success: true, data: computeTspStock_(new Date()) };
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

/** Bandingkan Masuk hasil scan vs MB51 untuk shift aktif (tab "Validasi", khusus role TSP). */
function getValidatorData() {
  try {
    return { success: true, data: computeValidator_(new Date()) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}

/** Panel "Penerimaan Terakhir" di tab Stock (role TSP). */
function getRecentReceipts() {
  try {
    return { success: true, data: computeRecentReceipts_(10) };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
}
