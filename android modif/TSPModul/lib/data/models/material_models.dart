num _n(dynamic v) => (v as num?) ?? 0;
String _s(dynamic v) => v as String? ?? '';

/// 1 material di Material Master. Mirror getMaterialList_() (Active/MaterialService.js).
class MaterialItem {
  final String mid;
  final String deskripsi;
  final String uom;
  final String supplier;
  final String status;

  const MaterialItem({
    required this.mid,
    required this.deskripsi,
    required this.uom,
    required this.supplier,
    required this.status,
  });

  factory MaterialItem.fromJson(Map<String, dynamic> json) => MaterialItem(
        mid: _s(json['mid']),
        deskripsi: _s(json['deskripsi']),
        uom: _s(json['uom']),
        supplier: _s(json['supplier']),
        status: _s(json['status']),
      );
}

/// 1 baris threshold Min/Max Stock (per MID + Lokasi). Mirror getMinMaxSettings()
/// (Active/StockService.js) -- selalu mencakup semua kombinasi MID x lokasi
/// (isConfigured=false kalau belum pernah diset manual, default 0/0).
class MinMaxItem {
  final String mid;
  final String deskripsi;
  final String supplier;
  final String uom;
  final String lokasi;
  final num minStock;
  final num maxStock;
  final String updatedAt;
  final String updatedBy;
  final bool isConfigured;

  const MinMaxItem({
    required this.mid,
    required this.deskripsi,
    required this.supplier,
    required this.uom,
    required this.lokasi,
    required this.minStock,
    required this.maxStock,
    required this.updatedAt,
    required this.updatedBy,
    required this.isConfigured,
  });

  factory MinMaxItem.fromJson(Map<String, dynamic> json) => MinMaxItem(
        mid: _s(json['mid']),
        deskripsi: _s(json['deskripsi']),
        supplier: _s(json['supplier']),
        uom: _s(json['uom']),
        lokasi: _s(json['lokasi']),
        minStock: _n(json['minStock']),
        maxStock: _n(json['maxStock']),
        updatedAt: _s(json['updatedAt']),
        updatedBy: _s(json['updatedBy']),
        isConfigured: json['isConfigured'] == true,
      );
}

/// Semua lokasi valid utk threshold Min/Max -- mirror ALL_LOCATIONS di
/// getMinMaxSettings() (StockService.js).
const kAllLocations = ['TSP', 'BHP 1', 'BHP 2', 'BHP 3', 'AHP 1', 'BHP 4', 'BHP 5'];
