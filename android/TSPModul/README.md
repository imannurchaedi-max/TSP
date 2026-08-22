# TSP Modul (Android)

> **Legacy — jangan dipakai untuk build, uji, atau rilis.** Sumber Android kanonis ada di
> `../../android modif/TSPModul/`. Folder ini dipertahankan sementara untuk menghindari
> penghapusan perubahan lokal yang belum direkonsiliasi.

App Flutter native untuk TSP Modul — full parity dengan web app (`Active/Index.html`) di
root repo ini, ditambah live camera barcode scan, antrian scan offline, cetak label PDF,
dan auto-update lewat GitHub Releases.

Dokumentasi arsitektur lengkap ada di **`../../dokumentasi/ARSITEKTUR.md` §12–§13**
(backend JSON API `ApiService.js`, stack teknis app ini, mapping fitur ke web app, release
signing, mekanisme auto-update, dan keterbatasan yang masih terbuka).

## Menjalankan secara lokal

```
flutter pub get
flutter run
```

Butuh Android SDK + `ANDROID_HOME`/`ANDROID_SDK_ROOT` ter-set. `compileSdk` dikunci ke 37
di `android/app/build.gradle.kts` (lihat komentar di file itu).

## Build release

Butuh `android/key.properties` (gitignored, tidak disertakan di repo) yang menunjuk ke
release keystore — tanpa file itu, build release fallback ke debug keys (APK-nya TIDAK
bisa menimpa instalasi yang sudah ditandatangani release keystore asli). Lihat
`ARSITEKTUR.md §13.3` untuk detail & lokasi keystore produksi.

```
flutter build apk --release
```

## Test

```
flutter analyze
flutter test
```

Coverage test saat ini masih minim (1 widget smoke test) — lihat `ARSITEKTUR.md §13.5`
untuk daftar area berisiko yang belum punya test otomatis.
