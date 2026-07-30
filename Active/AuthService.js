/**
 * Login NIK+Password terhadap sheet KARYAWAN bersama (dipakai juga oleh DT SUMMARY).
 * Menggantikan otentikasi berbasis sesi Google (Session.getActiveUser()).
 */

var LOGIN_MAX_ATTEMPTS = 5;
var LOGIN_LOCKOUT_SECONDS = 15 * 60;

function getKaryawanRows_() {
  var cache = CacheService.getScriptCache();
  var rows = readKaryawanRowsFromCache_(cache);
  if (rows) return rows;

  var sheet = SpreadsheetApp.openById(KARYAWAN_SPREADSHEET_ID).getSheetByName(KARYAWAN_SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet "' + KARYAWAN_SHEET_NAME + '" tidak ditemukan di spreadsheet KARYAWAN.');
  }

  var lastRow = sheet.getLastRow();
  rows = [];
  if (lastRow >= 2) {
    // Kolom: A=NIK, B=Nama, C=Departemen, D=Jabatan, E=Otorisasi, F=Password
    var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    data.forEach(function (r) {
      var nik = String(r[0]).trim();
      if (!nik) return;
      rows.push({
        nik: nik,
        nama: r[1],
        departemen: r[2],
        jabatan: String(r[3]).trim(),
        otorisasi: r[4],
        password: String(r[5])
      });
    });
  }

  writeKaryawanRowsToCache_(cache, rows);
  return rows;
}

// CacheService membatasi 1 value maks ~100KB, dan sheet KARYAWAN bisa berisi ribuan baris,
// jadi disimpan terpecah per potongan (chunk) supaya tidak melebihi batas itu.
var KARYAWAN_CACHE_CHUNK_SIZE = 200;

function readKaryawanRowsFromCache_(cache) {
  var countRaw = cache.get('karyawan_rows_count');
  if (!countRaw) return null;

  var count = parseInt(countRaw, 10);
  var keys = [];
  for (var i = 0; i < count; i++) keys.push('karyawan_rows_' + i);
  var chunks = cache.getAll(keys);

  var rows = [];
  for (var j = 0; j < count; j++) {
    var chunk = chunks['karyawan_rows_' + j];
    if (!chunk) return null; // ada chunk yang expired -> anggap cache miss, baca ulang dari sheet
    rows = rows.concat(JSON.parse(chunk));
  }
  return rows;
}

function writeKaryawanRowsToCache_(cache, rows) {
  try {
    var chunkCount = Math.ceil(rows.length / KARYAWAN_CACHE_CHUNK_SIZE) || 0;
    var payload = { 'karyawan_rows_count': String(chunkCount) };
    for (var i = 0; i < chunkCount; i++) {
      var chunk = rows.slice(i * KARYAWAN_CACHE_CHUNK_SIZE, (i + 1) * KARYAWAN_CACHE_CHUNK_SIZE);
      payload['karyawan_rows_' + i] = JSON.stringify(chunk);
    }
    cache.putAll(payload, 600); // 10 menit
  } catch (e) {
    // Caching bersifat best-effort -- kalau gagal (mis. tetap kebesaran), abaikan saja,
    // login tetap jalan langsung baca dari sheet tiap kali.
  }
}

function findKaryawanByNik_(nik) {
  var rows = getKaryawanRows_();
  var target = String(nik).trim();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].nik === target) return rows[i];
  }
  return null;
}

function getLoginAttemptCount_(nik) {
  var cache = CacheService.getScriptCache();
  var raw = cache.get('login_attempts_' + nik);
  return raw ? parseInt(raw, 10) : 0;
}

function registerLoginFailure_(nik) {
  var cache = CacheService.getScriptCache();
  var count = getLoginAttemptCount_(nik) + 1;
  cache.put('login_attempts_' + nik, String(count), LOGIN_LOCKOUT_SECONDS);
}

function clearLoginAttempts_(nik) {
  CacheService.getScriptCache().remove('login_attempts_' + nik);
}

function roleFromJabatan_(jabatan) {
  var role = JABATAN_ROLE_MAP[jabatan];
  if (!role) {
    throw new Error('Jabatan "' + jabatan + '" tidak memiliki akses ke TSP Modul.');
  }
  return role;
}

/**
 * Validasi NIK+Password. Melempar Error dengan pesan aman ditampilkan ke user kalau gagal.
 * Return { nik, nama, jabatan, role } kalau sukses.
 */
function login_(nik, password) {
  var normalizedNik = String(nik || '').trim();
  if (!normalizedNik || !password) {
    throw new Error('NIK dan Password wajib diisi.');
  }

  var attempts = getLoginAttemptCount_(normalizedNik);
  if (attempts >= LOGIN_MAX_ATTEMPTS) {
    throw new Error('Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.');
  }

  var karyawan = findKaryawanByNik_(normalizedNik);
  if (!karyawan || karyawan.password !== String(password)) {
    registerLoginFailure_(normalizedNik);
    throw new Error('NIK atau Password salah.');
  }

  var role = roleFromJabatan_(karyawan.jabatan); // bisa throw kalau jabatan tidak terdaftar

  clearLoginAttempts_(normalizedNik);
  return {
    nik: karyawan.nik,
    nama: karyawan.nama,
    jabatan: karyawan.jabatan,
    role: role
  };
}

/**
 * Re-verifikasi role dari NIK saja (dipakai submitScan supaya role selalu dicek ulang
 * server-side, tidak percaya klaim role dari client).
 */
function resolveRole_(nik) {
  var karyawan = findKaryawanByNik_(String(nik || '').trim());
  if (!karyawan) {
    throw new Error('Sesi tidak valid, silakan login ulang.');
  }
  return {
    nik: karyawan.nik,
    nama: karyawan.nama,
    role: roleFromJabatan_(karyawan.jabatan)
  };
}
