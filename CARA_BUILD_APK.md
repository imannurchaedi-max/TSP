# CARA BUILD & COMPILE APK — TSP Modul (Android)

> Dokumen untuk **PC tujuan** (mesin yang akan men-compile APK).
> Ikuti dari atas ke bawah. Satu-satunya file yang **wajib disiapkan manual** di PC tujuan
> adalah `key.properties` (berisi path keystore) — sisanya otomatis.

---

## 1. Prasyarat (install sekali saja)

| Komponen | Versi | Cek |
|---|---|---|
| Flutter SDK | stable (3.x) | `flutter doctor` |
| Android SDK | Platform 37, Build-Tools 36+, NDK 28.2 | diinstall otomatis saat build pertama |
| JDK | 17 (Temurin / OpenJDK) | `java -version` |
| Release keystore | `tsp_modul_release.jks` | lihat §4 |

Jalankan `flutter doctor` dan pastikan baris **"Android toolchain"** centang hijau:
```
flutter doctor
```

> Catatan: `compileSdk` dikunci ke **37** di `android/app/build.gradle.kts`.
> NDK + Platform + Build-Tools akan **di-download otomatis** saat build pertama (butuh internet).

---

## 2. Ambil kode

**Cara A — Clone dari GitHub (disarankan):**
```powershell
git clone https://github.com/imannurchaedi-max/TSP.git
cd TSP
```

**Cara B — Copy folder:** salin seluruh folder `TSP MODUL\` (atau minimal `android modif\TSPModul\`).

> `key.properties` & `local.properties` **tidak ikut** di git (gitignore) — buat manual di §4 & §5.

---

## 3. Struktur folder (PENTING — baca ini dulu)

```
TSP MODUL\
├── android\            ← versi ORIGINAL (tanpa fitur tambahan)
├── android modif\      ← INI yang di-build (ada fitur tambahan + fix koneksi)
│   └── TSPModul\
│       ├── lib\                    ← kode sumber (56 file .dart)
│       │   ├── core\api_client.dart  ← FIX KONEKSI (jangan dihapus, lihat §7)
│       │   ├── data\
│       │   └── features\
│       ├── android\                ← AndroidManifest.xml, gradle, key.properties
│       ├── assets\
│       ├── build\                  ← OUTPUT APK muncul di sini
│       └── pubspec.yaml
├── Active\              ← backend Apps Script (bukan bagian APK)
└── dokumentasi\         ← dokumen arsitektur
```

**Build APK harus dari `android modif\TSPModul`** (bukan `android\`), supaya dapat
fitur tambahan (MonitoringAlert, date picker reservasi, search/sort stok) **dan** fix koneksi.

---

## 4. Setup signing — `key.properties` (WAJIB manual)

Lokasi: `android modif\TSPModul\android\key.properties`

Buat file dengan isi (ganti `<user>` dengan user PC ini, dan password sesuai keystore Anda):
```properties
storePassword=PASSWORD_KEYSTORE_ANDA
keyPassword=PASSWORD_KEYSTORE_ANDA
keyAlias=tsp_modul
storeFile=C:/Users/<user>/keystores/tsp_modul/tsp_modul_release.jks
```

- **Punya keystore release** → APK bisa **update installasi lama tanpa uninstall**.
- **Tidak punya keystore** → hapus/rename file ini (misal `key.properties.bak`). Build tetap jalan
  tapi pakai **debug signing** → hanya bisa **install baru** (uninstall dulu yang lama).

> `key.properties` berisi password — **jangan di-commit ke git** (sudah di-gitignore).

---

## 5. Setup `local.properties` (biasanya otomatis)

`flutter build` akan **membuat ulang otomatis**. Kalau perlu manual:
```properties
sdk.dir=C:\\Users\\<user>\\AppData\\Local\\Android\\Sdk
flutter.sdk=C:\\flutter
```

---

## 6. Build APK (langkah utama)

```powershell
cd "TSP\android modif\TSPModul"
flutter pub get
flutter build apk --release
```

Output APK:
```
android modif\TSPModul\build\app\outputs\flutter-apk\app-release.apk
```

### Rename jadi "TSP Modul.apk"
```powershell
Copy-Item "build\app\outputs\flutter-apk\app-release.apk" "..\..\TSP Modul.apk"
```

---

## 7. FIX KONEKSI (jangan dihapus / jangan di-overwrite)

File: `android modif\TSPModul\lib\core\api_client.dart`

Sudah ada custom `HttpClient` yang **memaksa IPv4 + HTTP/1.1** saat konek ke `script.google.com`.
Ini **fix bug "tidak bisa login karena tidak terkonek"** (dart:io tidak implementasi Happy Eyeballs,
jadi di jaringan/device dengan IPv6 bermasalah POST ke Apps Script gagal).

Ringkasan mekanisme koneksi (biar tidak bingung):
1. App **POST JSON** ke `https://script.google.com/macros/s/AKfycby.../exec` (action login, dst).
2. Apps Script balas **HTTP 302** → app **GET** ke `Location` (URL echo satu-pakai).
3. Hasil JSON dibaca dari respons GET tersebut.

Kalau mau ganti URL backend, ubah `kApiBaseUrl` di `lib/core/constants.dart`.

---

## 8. Deploy backend Apps Script (HANYA jika `Active/` berubah)

Kode backend tidak ikut dalam APK. Kalau ada perubahan di folder `Active\`:
```powershell
npm install
npm run deploy
```
> Aturan wajib: **JANGAN** pakai `clasp push` saja (cuma update `/dev`).
> `npm run deploy` = docs build + push + promote `/exec` ke produksi.

---

## 9. Troubleshooting

| Gejala | Solusi |
|---|---|
| `Building with plugins requires symlink support. Please enable Developer Mode` | Aktifkan **Developer Mode** (Settings → Privacy & Security → For developers → Developer Mode = ON), lalu **sign-out/sign-in** (atau restart). Atau jalankan build dari terminal **Run as Administrator**. |
| `Failed to find target with hash string 'android-37'` | Platform terinstall sebagai `android-37.0`. Buat junction: `mklink /J "%SDK%\platforms\android-37" "%SDK%\platforms\android-37.0"` |
| `Set-Content ... engine.realm ... being used by another process` | Ada proses dart nyangkut. Kill: `Stop-Process -Name dart,dartvm -Force` lalu build lagi. |
| `Got TLS error ... pub.dev` saat pub get | Jalankan `flutter pub get` di terminal **normal** (bukan elevated). Kalau masih gagal, cek proxy/network. |
| `flutter` tidak ditemukan | Tambahkan `<flutter>\bin` ke PATH, atau panggil full path `C:\flutter\bin\flutter.bat`. |
| APK tidak bisa install (signature conflict) | Uninstall app lama dulu, ATAU pastikan `key.properties` menunjuk ke keystore release yang sama dengan build sebelumnya. |

---

## 10. Cek cepat sebelum build

```powershell
flutter doctor                # Android toolchain harus hijau
git status                    # (kalau pakai git) harus bersih
Test-Path "android\key.properties"   # True kalau pakai release signing
```
