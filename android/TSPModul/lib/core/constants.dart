/// Base URL web app Apps Script TSP Modul (endpoint doPost JSON, lihat Active/ApiService.js).
/// Sama persis dengan deployment production yang juga melayani web app HTML lewat doGet.
const String kApiBaseUrl =
    'https://script.google.com/macros/s/AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ/exec';

/// Mesin aktif di area produksi PANTS. Mirror MESIN_LIST di Active/Config.js.
const List<String> kMesinList = ['BHP 1', 'BHP 2', 'BHP 3', 'AHP 1', 'BHP 4', 'BHP 5'];

/// Definisi 1 event checkpoint scan. Mirror struktur EVENTS di Active/Config.js --
/// prerequisite/role/requiresX dipakai server-side (BarcodeService.js) untuk validasi;
/// di sini dipakai untuk UX (form field mana yang harus diisi, event mana yang
/// ditampilkan untuk role user yang login).
class ScanEventDef {
  final String code;
  final String? prerequisite;
  final String role;
  final bool requiresMesin;
  final bool requiresJumlah;
  final bool requiresReservasi;
  final String label;

  const ScanEventDef({
    required this.code,
    required this.prerequisite,
    required this.role,
    required this.requiresMesin,
    required this.requiresJumlah,
    required this.requiresReservasi,
    required this.label,
  });
}

/// Mirror persis EVENTS di Active/Config.js. Urutan alur:
/// terima_wrm -> kirim_mesin -> terima_operator -> consume_operator
///                           -> retur_dari_mesin -> retur_ke_wrm
const Map<String, ScanEventDef> kScanEvents = {
  'terima_wrm': ScanEventDef(
    code: 'terima_wrm',
    prerequisite: null,
    role: 'tsp',
    requiresMesin: false,
    requiresJumlah: false,
    requiresReservasi: true,
    label: 'Terima dari WRM',
  ),
  'kirim_mesin': ScanEventDef(
    code: 'kirim_mesin',
    prerequisite: 'terima_wrm',
    role: 'tsp',
    requiresMesin: true,
    requiresJumlah: true,
    requiresReservasi: false,
    label: 'Kirim ke Mesin (Reprint Barcode)',
  ),
  'terima_operator': ScanEventDef(
    code: 'terima_operator',
    prerequisite: 'kirim_mesin',
    role: 'operator',
    requiresMesin: false,
    requiresJumlah: false,
    requiresReservasi: false,
    label: 'Terima dari TSP (Operator Scan)',
  ),
  'consume_operator': ScanEventDef(
    code: 'consume_operator',
    prerequisite: 'terima_operator',
    role: 'operator',
    requiresMesin: false,
    requiresJumlah: false,
    requiresReservasi: false,
    label: 'Consume (Material Digunakan)',
  ),
  'retur_dari_mesin': ScanEventDef(
    code: 'retur_dari_mesin',
    prerequisite: 'kirim_mesin',
    role: 'tsp',
    requiresMesin: false,
    requiresJumlah: false,
    requiresReservasi: false,
    label: 'Retur dari Mesin',
  ),
  'retur_ke_wrm': ScanEventDef(
    code: 'retur_ke_wrm',
    prerequisite: 'retur_dari_mesin',
    role: 'tsp',
    requiresMesin: false,
    requiresJumlah: false,
    requiresReservasi: false,
    label: 'Retur ke WRM (MatClaim)',
  ),
};

/// Event yang boleh dilihat/dipakai role tertentu. 'spv' boleh semua (mirror
/// pengecekan server: `eventDef.role !== role && role !== 'spv'` di Code.js/submitScan).
List<ScanEventDef> scanEventsForRole(String role) {
  if (role == 'spv') return kScanEvents.values.toList(growable: false);
  return kScanEvents.values.where((e) => e.role == role).toList(growable: false);
}
