import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants.dart';

/// State 1 alur scan yang sedang berjalan (event terpilih + field pendukung).
/// Mirror variable global currentEvent/currentMesin/currentJumlah/currentReservasi
/// di Scanner.html, tapi di sini dikelola lewat Riverpod supaya bisa dibaca dari
/// beberapa layar (event picker -> extra fields -> kamera -> hasil).
class ScanFlowState {
  final ScanEventDef? event;
  final String? mesin;
  final String? jumlah;
  final String? noReservasi;
  final Object? lastResult;

  const ScanFlowState({this.event, this.mesin, this.jumlah, this.noReservasi, this.lastResult});

  ScanFlowState copyWith({
    ScanEventDef? event,
    String? mesin,
    String? jumlah,
    String? noReservasi,
    Object? lastResult,
  }) {
    return ScanFlowState(
      event: event ?? this.event,
      mesin: mesin ?? this.mesin,
      jumlah: jumlah ?? this.jumlah,
      noReservasi: noReservasi ?? this.noReservasi,
      lastResult: lastResult ?? this.lastResult,
    );
  }
}

final scanFlowProvider = StateProvider<ScanFlowState>((ref) => const ScanFlowState());
