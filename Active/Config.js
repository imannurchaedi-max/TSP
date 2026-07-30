/**
 * Konfigurasi global TSP Modul.
 */

var SPREADSHEET_ID = '1DrwDLaTqqdVwfqNj9hmiPLXmVCzt-rwfR8jgltY5jO8';

// Spreadsheet KARYAWAN dipakai bersama dengan project DT SUMMARY (DAM Portal) untuk
// validasi login NIK+Password.
var KARYAWAN_SPREADSHEET_ID = '14OTl9xYINyRIqnJ2AEaCJFD_D9tNRRueNgFby6FjY9o';
var KARYAWAN_SHEET_NAME = 'KARYAWAN';

// Pemetaan kolom "Jabatan" di sheet KARYAWAN -> role TSP Modul. Jabatan yang tidak
// terdaftar di sini ditolak akses (lihat AuthService.js).
var JABATAN_ROLE_MAP = {
  'Admin TSP': 'tsp',
  'TSP': 'tsp',
  'Operator Production': 'operator'
};

var SHEET_NAMES = {
  BARCODE: 'Barcode Material Produksi',
  MATERIAL_MASTER: 'MID EXISTING',
  LOG: 'Log Aktivitas Barcode',
  MB51: 'MB51 ', // perhatikan ada spasi di akhir nama sheet aslinya
  WRM_INCOMING: 'BARCODE INCOMING WRM' // registry pallet dari WRM, sumber lookup MID/Qty/status saat Terima dari WRM
};

var BARCODE_COLUMNS = [
  'Tanggal',
  'Shift',
  'Barcode',
  'Parent Barcode',
  'MID',
  'Material Description',
  'Jumlah',
  'Mesin',
  'Diterima Oleh TSP dari WRM',
  'Dikirim Oleh TSP ke Mesin',
  'Retur Ditarik Oleh TSP dari Mesin',
  'Diterima Oleh Operator dari TSP',
  'Diconsume Oleh Operator',
  'Retur Dikirim Kembali Oleh TSP ke WRM'
];

var LOG_COLUMNS = [
  'Timestamp',
  'Barcode',
  'Event',
  'Actor',
  'Role',
  'Mesin',
  'Hasil',
  'Pesan'
];

// Mesin aktif saat ini (per konfirmasi user, 29/07/2026). Rencana ke depan akan nambah
// NAP1 & PNL1 -- baru ditambahkan ke daftar ini kalau sudah benar-benar aktif dipakai.
var MESIN_LIST = ['BHP1', 'BHP2', 'BHP3', 'BHP4', 'BHP5', 'AHP1'];

// Window shift: jam mulai (inclusive) per shift, dipakai untuk menentukan
// kolom "Shift" saat scan. Sesuai aturan di sheet Workflow:
// Shift 1: 06:00-14:00, Shift 2: 14:00-22:00, Shift 3: 22:00-06:00
var SHIFT_WINDOWS = [
  { shift: 'Shift 1', startHour: 6 },
  { shift: 'Shift 2', startHour: 14 },
  { shift: 'Shift 3', startHour: 22 }
];

/**
 * Event checkpoint yang dikenal sistem.
 *
 * "terima_wrm" dan "kirim_mesin" ditangani khusus di processScan_ (lihat
 * BarcodeService.js) karena punya semantik beda dari 4 event lain:
 *  - terima_wrm: scan barcode ASLI WRM (format INDUK, 3 segmen) -> bikin baris INDUK.
 *  - kirim_mesin: scan barcode ASLI WRM yang SAMA (bukan kode baru) -> sistem generate
 *    kode reprint (barcode ANAK, INDUK + "-" + nomor urut) dan bikin baris ANAK baru.
 *
 * 4 event sisanya (retur_dari_mesin, retur_ke_wrm, terima_operator, consume_operator)
 * beroperasi pada baris ANAK yang sudah ada (di-scan pakai kode reprint), mengikuti
 * prerequisite chain generik: kolom `prerequisite` di baris yang sama harus terisi,
 * dan kolom `column` event ini sendiri harus masih kosong.
 *
 * requiresMesin / requiresJumlah: apakah UI perlu minta input tambahan saat submit event ini.
 */
var EVENTS = {
  terima_wrm: {
    prerequisite: null,
    column: 'Diterima Oleh TSP dari WRM',
    role: 'tsp',
    requiresMesin: false,
    requiresJumlah: false, // Jumlah otomatis dari lookup "BARCODE INCOMING WRM" (Qty /Palet)
    label: 'Terima dari WRM'
  },
  kirim_mesin: {
    prerequisite: 'terima_wrm',
    column: 'Dikirim Oleh TSP ke Mesin',
    role: 'tsp',
    requiresMesin: true,
    requiresJumlah: true,
    label: 'Kirim ke Mesin'
  },
  retur_dari_mesin: {
    prerequisite: 'kirim_mesin',
    column: 'Retur Ditarik Oleh TSP dari Mesin',
    role: 'tsp',
    requiresMesin: false,
    requiresJumlah: false,
    label: 'Retur dari Mesin'
  },
  retur_ke_wrm: {
    prerequisite: 'retur_dari_mesin',
    column: 'Retur Dikirim Kembali Oleh TSP ke WRM',
    role: 'tsp',
    requiresMesin: false,
    requiresJumlah: false,
    label: 'Retur ke WRM (MatClaim)'
  },
  terima_operator: {
    prerequisite: 'kirim_mesin',
    column: 'Diterima Oleh Operator dari TSP',
    role: 'operator',
    requiresMesin: false,
    requiresJumlah: false,
    label: 'Terima dari TSP'
  },
  consume_operator: {
    prerequisite: 'terima_operator',
    column: 'Diconsume Oleh Operator',
    role: 'operator',
    requiresMesin: false,
    requiresJumlah: false,
    label: 'Consume'
  }
};
