# Arsitektur TSP Modul

## 1. Ringkasan

TSP Modul adalah web app Google Apps Script untuk digitalisasi pencatatan stock RM/PM
(raw material/packaging) di area produksi PANTS, PT Daya Anugrah Mulya. Menggantikan
pencatatan manual dengan mekanisme scan barcode/QR untuk tiap pergerakan material:
WRM → TSP → Mesin → Operator → Consume/Retur → WRM.

## 2. Stack Teknis

- **Backend**: Google Apps Script (runtime V8) — semua logic server-side di file `.js`.
- **Frontend**: `HtmlService` single-page app (`Index.html` + partial `Scanner.html` /
  `Stylesheet.html`), vanilla JS, tanpa framework, komunikasi via `google.script.run`.
- **Database**: Google Sheets, 2 spreadsheet berbeda:
  - Spreadsheet utama **"TSP MODUL"** — ID `1DrwDLaTqqdVwfqNj9hmiPLXmVCzt-rwfR8jgltY5jO8`
  - Spreadsheet **"DATA KARYAWAN"** — ID `14OTl9xYINyRIqnJ2AEaCJFD_D9tNRRueNgFby6FjY9o`,
    dipakai BERSAMA dengan project DT SUMMARY (DAM Portal), khusus untuk autentikasi.
- **Deployment**: CLASP, akun `dayaanugrahmuly4@gmail.com`.
  - Script ID: `1FwO2eOD9kCwYifAD0j8kuJ4hKBR5CAYcRia8yeV1MLgGEJJOGOfKh4QY`
  - Web app access: `ANYONE_ANONYMOUS`, `executeAs: USER_DEPLOYING` — tanpa login Google,
    autentikasi murni NIK+Password sendiri.
- **Library eksternal (CDN)**: `html5-qrcode@2.3.8` (decode barcode dari foto),
  `bootstrap-icons@1.11.2`, Google Font `Outfit`.

## 3. Alur Bisnis

```
WRM (gudang) --putaway--> sheet "BARCODE INCOMING WRM" (registry pallet, kolom "Kode Unik")
     |
     | TSP scan Kode Unik  ->  event terima_wrm
     v
Stock TSP (dipegang TSP) --scan Kode Unik yang sama--> event kirim_mesin
     |                          (generate barcode ANAK/kode reprint baru)
     |                                  |
     |                                  v
     |                          Operator scan kode anak -> terima_operator
     |                                  |
     |                       +----------+----------+
     |                       v                     v
     |               consume_operator      retur_dari_mesin (balik ke TSP)
     |                (habis dipakai)              |
     |                                              v
     +<---------------------------------- retur_ke_wrm (MatClaim ke WRM)
```

## 4. Sheet yang Dipakai

| Sheet | Spreadsheet | Peran |
|---|---|---|
| **Barcode Material Produksi** | TSP MODUL | Log transaksi utama. 1 baris = 1 unit barcode (induk atau anak), diisi progresif lewat 6 kolom checkpoint (timestamp). |
| **BARCODE INCOMING WRM** | TSP MODUL | Registry pallet fisik dari WRM (~3382 baris). Sumber lookup MID/Deskripsi/UOM/Qty serta status `AKSI` (VERIFIED/BELUM VERIFIKASI) dan `Keterangan` (HOLD/PALLET UTUH) saat event `terima_wrm`. |
| **MID EXISTING** | TSP MODUL | Master 46 material (MID, Deskripsi, UOM) — dipakai mengisi tabel Stock supaya semua material master selalu tampil (bukan cuma yang sudah ada aktivitas). |
| **MB51** (nama asli `"MB51 "`, ada spasi di akhir) | TSP MODUL | Copy-paste transaksi SAP TCODE MB51. **Hanya validator pembanding**, bukan sumber data utama. |
| **Log Aktivitas Barcode** | TSP MODUL | Audit trail semua percobaan scan (sukses & gagal), auto-dibuat sistem saat pertama kali dibutuhkan. |
| **KARYAWAN** | DATA KARYAWAN (spreadsheet terpisah) | Master NIK/Nama/Departemen/Jabatan/Password untuk login. Kolom: A=NIK, B=Nama, C=Departemen, D=Jabatan, E=Otorisasi, F=Password. |

Header lengkap sheet "Barcode Material Produksi" (`BARCODE_COLUMNS` di `Config.js`):
`Tanggal, Shift, Barcode, Parent Barcode, MID, Material Description, Jumlah, Mesin, Diterima Oleh TSP dari WRM, Dikirim Oleh TSP ke Mesin, Retur Ditarik Oleh TSP dari Mesin, Diterima Oleh Operator dari TSP, Diconsume Oleh Operator, Retur Dikirim Kembali Oleh TSP ke WRM`

## 5. Model Data Barcode (Induk-Anak)

- **Barcode INDUK** = "Kode Unik" asli dari WRM (kode opak, mis. `DTA15M2708199`) —
  mewakili 1 pallet utuh yang diterima TSP. MID/Qty-nya **tidak** ter-encode di teksnya
  sendiri, harus di-lookup dari sheet BARCODE INCOMING WRM.
- **Barcode ANAK** = kode reprint yang di-*generate* SISTEM saat event `kirim_mesin` =
  `<KodeIndukAsli>-<urutan 2 digit>` (mis. `DTA15M2708199-01`) — mewakili 1 pecahan qty
  yang dikirim ke 1 mesin tertentu.
- Klasifikasi induk vs anak (`classifyBarcode_` di `BarcodeService.js`): cek pola regex
  suffix `-\d{2}$` **dan** verifikasi bagian sebelum suffix itu terdaftar sebagai baris
  induk yang sudah diterima — bukan asumsi format Kode Unik WRM, supaya tahan kalau WRM
  ganti format kode-nya di masa depan.

## 6. State Machine — 6 Checkpoint

| Event (kode internal) | Kolom checkpoint | Prasyarat | Role | Input tambahan |
|---|---|---|---|---|
| `terima_wrm` | Diterima Oleh TSP dari WRM | — (bikin baris induk baru) | TSP | tidak ada (Jumlah otomatis dari lookup) |
| `kirim_mesin` | Dikirim Oleh TSP ke Mesin | `terima_wrm` | TSP | pilih Mesin + isi Jumlah manual |
| `terima_operator` | Diterima Oleh Operator dari TSP | `kirim_mesin` | Operator | tidak ada |
| `consume_operator` | Diconsume Oleh Operator | `terima_operator` | Operator | tidak ada |
| `retur_dari_mesin` | Retur Ditarik Oleh TSP dari Mesin | `kirim_mesin` | TSP | tidak ada |
| `retur_ke_wrm` | Retur Dikirim Kembali Oleh TSP ke WRM | `retur_dari_mesin` | TSP | tidak ada |

Definisi lengkap ada di `EVENTS` (`Config.js`). Validasi generik (prasyarat harus
terisi, kolom target harus masih kosong) dieksekusi di `handleChildCheckpoint_`
(`BarcodeService.js`) untuk 4 event terakhir; `terima_wrm` & `kirim_mesin` punya handler
khusus (`handleTerimaWrm_`, `handleKirimMesin_`) karena membuat BARIS BARU, bukan
meng-update baris yang sudah ada.

## 7. Model Perhitungan Stock (`StockService.js`)

Ledger dihitung ulang **on-the-fly** tiap request (tidak ada sheet snapshot tersimpan):

- **Stock TSP** (per MID) = Σ(Diterima dari WRM) − Σ(Dikirim ke Mesin) + Σ(Retur dari
  Mesin) − Σ(Retur ke WRM).
- **Stock per Mesin** (per MID, per mesin) = Σ(Diterima Operator dari TSP, mesin itu) −
  Σ(Consume, mesin itu) − Σ(Retur dari Mesin, mesin itu). *(Catatan: stock mesin baru
  bertambah setelah Operator scan "Terima dari TSP", bukan langsung saat TSP kirim —
  selisihnya adalah stock "dalam perjalanan" yang belum ditampilkan di dashboard manapun.)*
- **Breakdown per shift**: `getShiftBounds_(now)` (`BarcodeService.js`) menghitung jendela
  waktu shift aktif (Shift 1: 06.00–14.00, Shift 2: 14.00–22.00, Shift 3: 22.00–06.00
  lintas hari kalender). Stock Awal = ledger sebelum shift mulai; Masuk/Keluar/Retur =
  pergerakan dalam shift aktif saja; Stock Akhir = akumulasi keduanya (angka real-time
  "sedang dipegang sekarang").
- **Validator** (`computeValidator_`): bandingkan "Masuk" (dari scan, shift aktif) vs
  total `Quantity` di sheet MB51 pada window waktu shift yang sama → flag `SELISIH` kalau
  beda. MB51 murni pembanding, bukan sumber angka.
- Tabel Stock selalu menampilkan **semua material** dari MID EXISTING
  (`seedAccFromMaterialMap_`), bukan cuma yang sudah ada aktivitas scan.

## 8. Autentikasi (`AuthService.js`)

- Login **NIK+Password** (bukan akun Google), divalidasi ke sheet KARYAWAN.
- Pemetaan Jabatan → role (`JABATAN_ROLE_MAP` di `Config.js`): `"Admin TSP"`/`"TSP"` →
  `tsp`; `"Operator Production"` → `operator`; jabatan lain ditolak akses.
- Role **selalu di-derive ulang server-side** dari NIK di tiap request (`resolveRole_`),
  tidak dipercaya dari client, supaya tidak bisa dipalsukan lewat console/sessionStorage.
- Proteksi brute-force: maksimal 5 percobaan gagal per NIK, lockout 15 menit
  (`CacheService`, key `login_attempts_<nik>`).
- Data karyawan di-cache 10 menit, dipecah per-chunk 200 baris (`CacheService` punya
  batas ~100KB per value, sheet KARYAWAN berisi ribuan baris).
- Password disimpan **plain-text** di sheet (konsisten dengan praktik existing di
  DT SUMMARY — bukan sengaja, bukan best-practice keamanan modern).

## 9. Struktur UI (`Index.html`)

Single-page app, 3 state utama di-*toggle* lewat JS (show/hide `<div>`, tanpa reload):

- **`#login-view`** — form NIK+Password, gaya kartu gradient biru meniru DT SUMMARY.
- **`#app-view`** (`.app-wrapper`) — shell sidebar (kiri, 220px, dark) + main content:
  - **Sidebar**: logo DAM, badge role (`TSP PORTAL` biru / `OPERATOR PORTAL` kuning),
    profil user (nama+jabatan), nav (Stock/Scan/Validasi), tombol Logout.
  - **Tab "Stock"** (default) — tabel semua material (Stock Awal/Masuk/Keluar/Retur+/
    Retur-/Stock Akhir) + panel "Penerimaan Terakhir" (khusus role TSP, di sebelah kanan
    tabel pada layar lebar).
  - **Tab "Scan"** — daftar tombol aksi sesuai role (`TSP_EVENTS`/`OPERATOR_EVENTS`) +
    widget kamera (`Scanner.html`).
  - **Tab "Validasi"** (khusus role TSP) — tabel Masuk(Scan) vs Masuk(MB51) vs Selisih.
  - Responsif: sidebar penuh di layar ≥992px; jadi drawer overlay (tombol hamburger +
    backdrop gelap, auto-close saat pilih menu) di layar <992px (termasuk tablet 7 inch
    portrait).

## 10. Riwayat Deployment (Versi CLASP)

| Versi | Perubahan utama |
|---|---|
| v1–v3 | CRUD scan barcode dasar (6 checkpoint), model induk-anak, login Google (`USER_ACCESSING`) |
| v4–v6 | Ganti ke login NIK+Password (`AuthService.js`), restyle sesuai DT SUMMARY, fix cache chunking KARYAWAN |
| v7 | Ganti live-camera (`getUserMedia`, diblokir Permissions Policy iframe GAS) jadi foto-capture (`<input capture>`) + `scanFile()` |
| v8 | Dashboard Stock real-time (tab Stock) + tab Validator vs MB51 |
| v9 | Ganti parsing string barcode jadi lookup ke sheet BARCODE INCOMING WRM, fix daftar mesin jadi 6 (bukan 7) |
| v10 | Layout sidebar responsif (PC/tablet), tabel Stock tampilkan semua material master |
| v11 | Judul halaman dinamis "STOCK TSP"/"STOCK OPERATOR", tanggal di label shift, panel Penerimaan Terakhir |

## 11. Keterbatasan & Catatan Teknis

- Stock "dalam perjalanan" (sudah `kirim_mesin` tapi belum `terima_operator`) tidak
  ditampilkan di dashboard manapun saat ini — potensi fitur lanjutan.
- `SHIFT_WINDOWS` di `Config.js` sudah **tidak dipakai** (dead config) — logic jendela
  shift di-hardcode langsung di `getShiftBounds_` (`BarcodeService.js`).
- `lookupMaterial_()` di `MaterialService.js` sudah tidak dipanggil di manapun sejak
  parsing barcode diganti jadi lookup WRM (Fase 4) — fungsi `getMaterialMap_()` (yang
  dipakainya) masih aktif dipakai di tempat lain.
- Daftar mesin aktif saat ini: **BHP1, BHP2, BHP3, BHP4, BHP5, AHP1** (6 mesin). NAP1 &
  PNL1 direncanakan ke depan — jangan ditambahkan ke `MESIN_LIST` sampai benar-benar aktif.
- `getSheet_()` (`SheetService.js`) punya fallback pencarian nama sheet case-insensitive,
  jaga-jaga penamaan tab di Google Sheet live beda kapitalisasi dari konfigurasi.
