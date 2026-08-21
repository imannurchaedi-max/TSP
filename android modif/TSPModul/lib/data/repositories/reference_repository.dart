import '../../core/api_client.dart';
import '../../core/constants.dart';

/// 1 item material di dalam 1 nomor reservasi. Mirror `items` di getReservasiList_()
/// (Active/SheetService.js).
class ReservasiItem {
  final String mid;
  final String desc;
  final num qty;
  final String uom;

  const ReservasiItem({required this.mid, required this.desc, required this.qty, required this.uom});

  factory ReservasiItem.fromJson(Map<String, dynamic> json) => ReservasiItem(
        mid: json['mid'] as String? ?? '',
        desc: json['desc'] as String? ?? '',
        qty: json['qty'] as num? ?? 0,
        uom: json['uom'] as String? ?? '',
      );
}

/// 1 nomor reservasi dari BARCODE OUTBOUND WRM. Mirror getReservasiList_().
class Reservasi {
  final String noReservasi;
  final String tanggal;
  final String dateKey;
  final int itemCount;
  final List<ReservasiItem> items;

  const Reservasi({
    required this.noReservasi,
    required this.tanggal,
    required this.dateKey,
    required this.itemCount,
    required this.items,
  });

  factory Reservasi.fromJson(Map<String, dynamic> json) => Reservasi(
        noReservasi: json['noReservasi'] as String? ?? '',
        tanggal: json['tanggal'] as String? ?? '',
        dateKey: json['dateKey'] as String? ?? '',
        itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
        items: (json['items'] as List<dynamic>? ?? [])
            .map((e) => ReservasiItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// Data referensi dipakai form Scan: daftar mesin (statis, mirror MESIN_LIST)
/// dan daftar reservasi (dinamis dari server, dengan fallback input manual
/// kalau gagal dimuat -- persis pola di Scanner.html supaya tetap bisa
/// dipakai walau server sedang tidak terjangkau).
class ReferenceRepository {
  final ApiClient _api;
  ReferenceRepository(this._api);

  List<String> get mesinList => kMesinList;

  Future<List<Reservasi>> getReservasiOptions() async {
    final res = await _api.call('getReservasiOptions');
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal memuat daftar reservasi.');
    }
    final data = res['data'] as List<dynamic>? ?? [];
    return data.map((e) => Reservasi.fromJson(e as Map<String, dynamic>)).toList();
  }
}
