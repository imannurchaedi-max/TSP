import 'dart:io';

import 'package:csv/csv.dart';
import 'package:file_picker/file_picker.dart';

/// Pilih file .csv lewat file picker Android & parse jadi baris-baris
/// (baris pertama = header). Return null kalau user membatalkan pemilihan file.
Future<List<List<dynamic>>?> pickAndParseCsv() async {
  final file = await FilePicker.pickFile(type: FileType.custom, allowedExtensions: ['csv']);
  final path = file?.path;
  if (path == null) return null;
  final content = await File(path).readAsString();
  return csv.decode(content);
}

int findHeaderIndex(List<String> headers, bool Function(String) test) {
  for (var i = 0; i < headers.length; i++) {
    if (test(headers[i])) return i;
  }
  return -1;
}

String cellAt(List<dynamic> row, int index) {
  if (index == -1 || index >= row.length) return '';
  return row[index].toString().trim();
}
