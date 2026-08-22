import 'package:flutter_test/flutter_test.dart';
import 'package:tsp_modul/data/models/reprint_models.dart';

void main() {
  test('ReprintRequest sends only server-authorized allocation inputs', () {
    const request = ReprintRequest(
      barcodeInduk: 'PARENT-001',
      jumlah: 12,
      isRetur: true,
    );

    expect(request.toJson(), {
      'barcodeInduk': 'PARENT-001',
      'jumlah': 12,
      'isRetur': true,
    });
  });
}
