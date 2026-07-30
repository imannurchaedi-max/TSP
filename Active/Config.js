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
  BARCODE: 'BARCODE MATERIAL PRODUKSI',
  MATERIAL_MASTER: 'MID EXISTING',
  LOG: 'Log Aktivitas Barcode',
  MB51: 'MB51 ', // perhatikan ada spasi di akhir nama sheet aslinya
  WRM_INCOMING: 'BARCODE INCOMING WRM', // registry pallet dari WRM, sumber lookup MID/Qty/status saat Terima dari WRM
  REPRINT: 'REPRINT BARCODE', // registry log barcode anak/reprint yang dibuat TSP
  STOCK_TSP: 'STOCK TSP',
  STOCK_MESIN: 'STOCK MESIN'
};

// Header resmi sheet "BARCODE MATERIAL PRODUKSI" (selaras dengan Excel REF)
var BARCODE_COLUMNS = [
  'TANGGAL',
  'SHIFT',
  'BARCODE',
  'NO RESERVASI',
  'MID',
  'MATERIAL DESCRIPTION',
  'JUMLAH',
  'DITERIMA OLEH TSP DARI WRM',
  'DIKIRIM OLEH TSP KE MESIN',
  'RETUR DITARIK OLEH TSP DARI MESIN',
  'DITERIMA OLEH OPERATOR DARI TSP',
  'DICONSUME OLEH OPERATOR',
  'RETUR DIKIRIM KEMBALI OLEH TSP KE WRM'
];

var REPRINT_COLUMNS = [
  'TANGGAL',
  'SHIFT',
  'BARCODE',
  'MID',
  'MATERIAL DESCRIPTION',
  'BARCODE REPRINT',
  'JUMLAH'
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

// Mesin aktif saat ini di area produksi PANTS
var MESIN_LIST = ['BHP 1', 'BHP 2', 'BHP 3', 'AHP 1', 'BHP 4', 'BHP 5'];

// Window shift: jam mulai (inclusive) per shift, dipakai untuk menentukan
// kolom "Shift" saat scan: Shift 1 (06:00-14:00), Shift 2 (14:00-22:00), Shift 3 (22:00-06:00)
var SHIFT_WINDOWS = [
  { shift: 'Shift 1', startHour: 6 },
  { shift: 'Shift 2', startHour: 14 },
  { shift: 'Shift 3', startHour: 22 }
];

/**
 * Event checkpoint yang dikenal sistem.
 *
 * Alur Paralel:
 * Level 1 (WRM -> TSP):
 *  - terima_wrm: Scan Kode Unik Induk dari WRM -> Bikin baris Induk di BARCODE MATERIAL PRODUKSI.
 *
 * Level 2 (TSP -> Mesin / Operator):
 *  - kirim_mesin: Scan Kode Unik Induk -> Sistem REPRINT Kode Anak (<KodeInduk>-01, -02...) -> Catat di REPRINT BARCODE & BARCODE MATERIAL PRODUKSI.
 *  - terima_operator: Operator scan Kode Reprint di Mesin.
 *  - consume_operator: Operator scan Kode Reprint saat material dipakai/habis di Mesin.
 *  - retur_dari_mesin: TSP menarik retur Kode Reprint dari Mesin kembali ke TSP.
 *  - retur_ke_wrm: TSP mengembalikan retur ke WRM (MatClaim).
 */
var EVENTS = {
  terima_wrm: {
    prerequisite: null,
    column: 'DITERIMA OLEH TSP DARI WRM',
    role: 'tsp',
    requiresMesin: false,
    requiresJumlah: false, // Jumlah otomatis dari lookup "BARCODE INCOMING WRM" (Qty /Palet)
    label: 'Terima dari WRM'
  },
  kirim_mesin: {
    prerequisite: 'terima_wrm',
    column: 'DIKIRIM OLEH TSP KE MESIN',
    role: 'tsp',
    requiresMesin: true,
    requiresJumlah: true,
    label: 'Kirim ke Mesin (Reprint Barcode)'
  },
  terima_operator: {
    prerequisite: 'kirim_mesin',
    column: 'DITERIMA OLEH OPERATOR DARI TSP',
    role: 'operator',
    requiresMesin: false,
    requiresJumlah: false,
    label: 'Terima dari TSP (Operator Scan)'
  },
  consume_operator: {
    prerequisite: 'terima_operator',
    column: 'DICONSUME OLEH OPERATOR',
    role: 'operator',
    requiresMesin: false,
    requiresJumlah: false,
    label: 'Consume (Material Digunakan)'
  },
  retur_dari_mesin: {
    prerequisite: 'kirim_mesin',
    column: 'RETUR DITARIK OLEH TSP DARI MESIN',
    role: 'tsp',
    requiresMesin: false,
    requiresJumlah: false,
    label: 'Retur dari Mesin'
  },
  retur_ke_wrm: {
    prerequisite: 'retur_dari_mesin',
    column: 'RETUR DIKIRIM KEMBALI OLEH TSP KE WRM',
    role: 'tsp',
    requiresMesin: false,
    requiresJumlah: false,
    label: 'Retur ke WRM (MatClaim)'
  }
};
