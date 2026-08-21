import 'package:dio/dio.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Info rilis terbaru dari GitHub Releases (repo publik, tidak butuh token).
class UpdateInfo {
  final String version;
  final String apkUrl;
  final String releaseNotes;

  const UpdateInfo({required this.version, required this.apkUrl, required this.releaseNotes});
}

/// Repo publik yang dipakai sebagai sumber rilis APK TSP Modul -- endpoint
/// "latest release" GitHub API selalu mengarah ke rilis terbaru yang di-tag,
/// jadi app tidak perlu tahu nomor versi spesifik untuk mengecek update.
const _kReleasesApiUrl = 'https://api.github.com/repos/imannurchaedi-max/TSP/releases/latest';

/// Cek apakah ada rilis GitHub yang lebih baru dari versi terpasang saat ini.
/// Return null kalau tidak ada update (termasuk kalau gagal cek, mis. offline --
/// silent-fail, jangan ganggu user dgn error network tiap buka app).
Future<UpdateInfo?> checkForUpdate() async {
  try {
    final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 8), receiveTimeout: const Duration(seconds: 8)));
    final response = await dio.get<Map<String, dynamic>>(_kReleasesApiUrl);
    final data = response.data;
    if (data == null) return null;

    final tagName = data['tag_name'] as String? ?? '';
    final remoteVersion = tagName.startsWith('v') ? tagName.substring(1) : tagName;
    if (remoteVersion.isEmpty) return null;

    final assets = data['assets'] as List<dynamic>? ?? [];
    final apkAsset = assets.cast<Map<String, dynamic>>().where((a) => (a['name'] as String? ?? '').endsWith('.apk'));
    if (apkAsset.isEmpty) return null;
    final apkUrl = apkAsset.first['browser_download_url'] as String?;
    if (apkUrl == null) return null;

    final packageInfo = await PackageInfo.fromPlatform();
    final currentVersion = packageInfo.version;

    if (!_isNewer(remoteVersion, currentVersion)) return null;

    return UpdateInfo(
      version: remoteVersion,
      apkUrl: apkUrl,
      releaseNotes: data['body'] as String? ?? '',
    );
  } catch (_) {
    return null;
  }
}

/// Bandingkan 2 versi semver sederhana (mis. "1.2.0" vs "1.10.3") --
/// perbandingan numerik per-segmen, bukan string, supaya "1.10.0" > "1.9.0".
bool _isNewer(String remote, String current) {
  final r = remote.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  final c = current.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  final len = r.length > c.length ? r.length : c.length;
  for (var i = 0; i < len; i++) {
    final rv = i < r.length ? r[i] : 0;
    final cv = i < c.length ? c[i] : 0;
    if (rv != cv) return rv > cv;
  }
  return false;
}
