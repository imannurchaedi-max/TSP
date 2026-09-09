# TSP Modul Deep Clean Review

Tanggal review: 2026-08-25

## Lokasi Kanonik

Root project (satu-satunya yang berlaku):

```text
C:\Users\imann\SYN DAM\SynologyDrive\0. TSP MODUL
```

Remote git: <https://github.com/imannurchaedi-max/TSP> (branch `master`).
Sumber GAS yang dipush clasp: `Active/`, dikonfigurasi di `Active/.clasp.json`
dengan `rootDir: "."`.

Folder lama berikut **sudah tidak berlaku** dan bukan sumber kebenaran,
walau masih ada di disk beserta `.git`-nya:

```text
C:\Users\imann\SynologyDrive\0. APP SCRIPT\0. TSP MODUL
```

## Verdict Canonical

Source of truth aktif:

- `Active/` untuk Google Apps Script backend, web app, dan JSON API Android.
- `android modif/TSPModul/` untuk Flutter Android aktif.
- `dokumentasi/` untuk arsitektur, dependency map, function mapping, state machine, dan generated graph docs.

Reference/legacy:

- `android/TSPModul/` adalah baseline/reference Flutter lama. Jangan jadikan sumber utama kecuali sedang membandingkan atau migrasi.
- `REF/` adalah data Excel referensi lokal, bukan source code runtime.

Generated/local-only:

- `.gitnexus/`, `.gitnexus-home/`, `graphify-input/`, dan cache `graphify-out/.*` adalah index lokal.
- Flutter generated files seperti `build/`, `.dart_tool/`, `Generated.xcconfig`, `flutter_export_environment.sh`, `local.properties`, dan signing files tidak boleh masuk Git.
- Test koneksi/debug root lama dan file APK/AAB adalah output lokal.

## Folder Size Causes

- `REF/` besar karena file Excel referensi `TSP MODUL.xlsx`.
- `android modif/TSPModul/` besar bila build/cache Flutter masih ada.
- `android/TSPModul/` berisi baseline Flutter lama beserta platform scaffolding.
- `logo/` besar karena aset bitmap branding.
- `.git/` besar karena history repository, bukan working source aktif.

## Mandatory Read Order

Sebelum membaca kode luas, model wajib membaca:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `TSP_MODUL_DEEP_CLEAN_REVIEW.md`
4. `dokumentasi/ARSITEKTUR.md`
5. `dokumentasi/DEPENDENCY_MAP.md`
6. `dokumentasi/FUNCTION_MAPPING.md`
7. `graphify-out/FUNCTION_INDEX.md` bila tersedia
8. `graphify-out/GRAPH_REPORT.md` bila tersedia

## Token-Efficient Navigation

- Jangan membaca seluruh `Active/Index.html`, `Active/Scanner.html`, atau seluruh Flutter tree tanpa target.
- Cari fungsi dulu via `graphify-out/FUNCTION_INDEX.md`.
- Untuk backend GAS, cek `dokumentasi/FUNCTION_MAPPING.md` dan `dokumentasi/DEPENDENCY_MAP.md`.
- Untuk Android, prioritaskan `android modif/TSPModul/lib/`.
- Setelah perubahan source/dokumentasi, jalankan `.\sync-graphify.ps1`.

## Rebuild Rule

```powershell
.\sync-graphify.ps1
git status
git add ...
git commit -m "..."
git push origin master
```

## Deploy Rule

Perubahan GAS production wajib lewat `npm run deploy` (bukan `clasp push` saja, yang hanya menyentuh `@HEAD`/`/dev`).

Status per 9 September 2026: clasp v3.3.0 terpasang lokal di `node_modules/`, sudah terotorisasi sebagai `dayaanugrahmuly4@gmail.com` dengan scope lengkap, dan seluruh rantai deploy terverifikasi jalan. Tidak perlu `clasp login` ulang.

**`clasp push` tidak pernah menghapus berkas remote.** Berkas yang dihapus dari `Active/` tetap hidup dan tetap dieksekusi di Apps Script, tanpa muncul di `clasp status`. `npm run deploy` menutup celah ini lewat `tools/clasp_prune.py`; di luar alur deploy jalankan `npm run clasp:prune` sendiri.
