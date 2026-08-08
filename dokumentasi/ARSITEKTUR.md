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
- **Deployment**: CLASP, akun resmi `dayaanugrahmuly4@gmail.com`.
  - Script ID: `1FwO2eOD9kCwYifAD0j8kuJ4hKBR5CAYcRia8yeV1MLgGEJJOGOfKh4QY`
  - Web app access: `ANYONE_ANONYMOUS`, `executeAs: USER_DEPLOYING` — tanpa login Google,
    autentikasi murni NIK+Password sendiri.
  - **Known issue (2026-08-08)**: `clasp push`/`clasp deploy` sempat gagal dengan error Google
    "The caller does not have permission" saat login clasp aktif sebagai akun lain
    (`manex.dam@gmail.com`) yang kehilangan akses Editor ke project ini di tengah sesi kerja
    (deploy sebelumnya di sesi yang sama sukses dengan akun yang sama). Perbaikan: pastikan akun
    yang login di `clasp login` punya akses Editor ke Apps Script project ini (lihat sharing
    settings di script.google.com), atau login ulang dengan `dayaanugrahmuly4@gmail.com`.
- **Library eksternal (CDN)**: `html5-qrcode@2.3.8` (decode barcode dari foto),
  `bootstrap-icons@1.11.2`, Google Font `Outfit`.

## 3. Alur Bisnis

```
WRM (gudang) --putaway--> sheet "BARCODE OUTBOUND WRM" (registry pallet, kolom "Kode Unik")
     |
     | TSP pilih No. Reservasi (dari kolom MATDOC RESERVASI di BARCODE OUTBOUND WRM) + scan Kode Unik -> event terima_wrm
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
| **BARCODE MATERIAL PRODUKSI** | TSP MODUL | Log transaksi utama. 1 baris = 1 unit barcode (induk atau anak), diisi progresif lewat 6 kolom checkpoint (timestamp). |
| **BARCODE OUTBOUND WRM** | TSP MODUL | Registry pallet fisik outbound dari WRM. Sumber lookup MID/Deskripsi/UOM/Qty saat event `terima_wrm`, sekaligus sumber data reservasi via kolom `MATDOC RESERVASI` (menggantikan tab RESERVASI lama). Kolom utama: `Tanggal Outbound`, `Shift`, `MID`, `DESC`, `UOM`, `QTY`, `Supplier`, `Kode Unik`, `MATDOC RESERVASI`. Menyediakan dropdown No. Reservasi dan daftar MID yang diizinkan saat event `terima_wrm`. |
| **REPRINT BARCODE** | TSP MODUL | Log penerbitan Barcode Reprint (Kode Anak) oleh TSP saat event `kirim_mesin`. |
| **STOCK TSP** | TSP MODUL | Rekap saldo real-time stok area TSP per MID (30 kolom, termasuk breakdown Kirim/Return per 6 area mesin: BHP 1-5, AHP 1). |
| **STOCK MESIN** | TSP MODUL | Rekap saldo 39 kolom real-time stok 6 area Mesin (BHP 1..5, AHP 1). |
| **MID EXISTING** | TSP MODUL | Master material (MID, Deskripsi, UOM, **Supplier** — kolom Supplier ditambahkan otomatis saat pertama kali dibutuhkan) — dipakai mengisi tabel Stock supaya semua material master selalu tampil, dan jadi sumber fallback Supplier untuk MID yang belum pernah ada transaksi WRM. |
| **MB51** (nama asli `"MB51 "`, ada spasi di akhir) | TSP MODUL | Copy-paste transaksi SAP TCODE MB51. **Hanya validator pembanding**, bukan sumber data utama. |
| **Log Aktivitas Barcode** | TSP MODUL | Audit trail semua percobaan scan (sukses & gagal). |
| **KARYAWAN** | DATA KARYAWAN | Master NIK/Nama/Departemen/Jabatan/Password untuk login. |

Header lengkap sheet "BARCODE MATERIAL PRODUKSI" (`BARCODE_COLUMNS` di `Config.js`):
`TANGGAL, SHIFT, BARCODE, NO RESERVASI, MID, MATERIAL DESCRIPTION, JUMLAH, DITERIMA OLEH TSP DARI WRM, DIKIRIM OLEH TSP KE MESIN, RETUR DITARIK OLEH TSP DARI MESIN, DITERIMA OLEH OPERATOR DARI TSP, DICONSUME OLEH OPERATOR, RETUR DIKIRIM KEMBALI OLEH TSP KE WRM`

## 5. Model Data Barcode (Induk-Anak)

- **Barcode INDUK** = "Kode Unik" asli dari WRM (kode opak, mis. `DTA15M2708199`) —
  mewakili 1 pallet utuh yang diterima TSP. MID/Qty-nya **tidak** ter-encode di teksnya
  sendiri, harus di-lookup dari sheet BARCODE OUTBOUND WRM.
- **Barcode ANAK** = kode reprint yang di-*generate* SISTEM saat event `kirim_mesin` =
  `<KodeIndukAsli>-<urutan 2 digit>` (mis. `DTA15M2708199-01`) — mewakili 1 pecahan qty
  yang dikirim ke 1 mesin tertentu.
- Klasifikasi induk vs anak (`classifyBarcode_` di `BarcodeService.js`): cek pola regex
  suffix `-\d{2}$` **dan** verifikasi bagian sebelum suffix itu terdaftar sebagai baris
  induk yang sudah diterima.

## 6. State Machine — 6 Checkpoint

| Event (kode internal) | Kolom checkpoint | Prasyarat | Role | Input tambahan |
|---|---|---|---|---|
| `terima_wrm` | Diterima Oleh TSP dari WRM | — (bikin baris induk baru) | TSP | Pilih No. Reservasi (Filter Tanggal Calendar + Dropdown Unik dari kolom `MATDOC RESERVASI` di BARCODE OUTBOUND WRM + Validasi Cocok MID scan vs daftar MID reservasi) |
| `kirim_mesin` | Dikirim Oleh TSP ke Mesin | `terima_wrm` | TSP | pilih Mesin + isi Jumlah manual |
| `terima_operator` | Diterima Oleh Operator dari TSP | `kirim_mesin` | Operator | tidak ada |
| `consume_operator` | Diconsume Oleh Operator | `terima_operator` | Operator | tidak ada |
| `retur_dari_mesin` | Retur Ditarik Oleh TSP dari Mesin | `kirim_mesin` | TSP | tidak ada |
| `retur_ke_wrm` | Retur Dikirim Kembali Oleh TSP ke WRM | `retur_dari_mesin` | TSP | tidak ada |

## 7. Model Perhitungan Stock & Side Panels (`StockService.js`)

Ledger dihitung ulang **on-the-fly** tiap request:

- **Stock TSP** (per MID) = Σ(Diterima dari WRM) − Σ(Dikirim ke Mesin) + Σ(Retur dari Mesin) − Σ(Retur ke WRM).
- **Stock per Mesin** (39 kolom breakdown 6 area mesin) = Σ(Terima Operator) − Σ(Consume) − Σ(Retur Mesin).
- **Breakdown Keluar/Retur per Mesin**: `computeTspStock_` dan `computeValidator_` mengekspos angka Kirim & Retur+ terpisah per area mesin (BHP 1-5, AHP 1), selain totalnya — dipakai untuk kolom per-mesin di tabel Stock & Validasi (lihat §9).
- **Panel Penerimaan & Pengiriman Shift Ini**:
  - `computeShiftReceipts_`: Menyajikan daftar material yang diterima dari WRM dalam window shift aktif.
  - `computeShiftDispatches_`: Menyajikan daftar material/reprint yang dikirim ke mesin dalam window shift aktif.
  - Layout Sticky: Melayang fixed di sisi kanan (`position: sticky; top: 80px;`) sehingga tidak hilang saat tabel utama di-scroll.
- **Ketahanan Sinkronisasi Ledger (`incrementStockCell_`)**: Update sel real-time ke STOCK TSP/STOCK MESIN mensyaratkan baris shift aktif sudah ada (dicetak lewat "Tarik Stok Awal Shift"). Jika baris belum ada, fungsi ini mengembalikan `false` (bukan diam-diam gagal) — `handleTerimaWrm_`, `handleKirimMesin_`, dan `handleChildCheckpoint_` menangkap status ini dan menambahkan peringatan eksplisit ke hasil scan (lihat §9, state "warning") supaya operator/Admin TSP tahu harus Tarik Stok Awal Shift dan verifikasi ulang transaksi tsb, alih-alih kehilangan angka stok tanpa jejak.
- **Material Master Upsert (`upsertMaterialMaster_` di `MaterialService.js`)**: Menambahkan MID baru lewat modal "Tambah/Edit Min/Max Stock" sekarang otomatis juga menulis ke sheet **MID EXISTING** (Material Master), bukan cuma ke MIN MAX STOCK — sebelumnya MID baru "yatim" di MIN MAX STOCK dan tidak pernah muncul di tabel Stock/Tarik Stok Awal Shift karena kedua sheet itu dibaca terpisah.
  - Kolom "Supplier" ditambahkan otomatis ke header MID EXISTING kalau belum ada.
  - Hanya mengisi field yang masih kosong (Deskripsi/UOM/Supplier) — tidak pernah menimpa data yang sudah ada di baris MID yang sudah terdaftar.
  - **Prioritas Supplier**: `getSupplierMap_()` di-seed dari Supplier default Material Master dulu (fallback), lalu ditimpa oleh Supplier dari histori transaksi `BARCODE OUTBOUND WRM` kalau MID itu sudah pernah punya transaksi — jadi begitu ada transaksi WRM nyata, data itu yang menang.

## 8. Autentikasi (`AuthService.js`)

- Login **NIK+Password** (bukan akun Google), divalidasi ke sheet KARYAWAN.
- Pemetaan Jabatan → role (`JABATAN_ROLE_MAP` di `Config.js`): `"Admin TSP"`/`"TSP"` → `tsp`; `"Operator Production"` → `operator`.
- Role **selalu di-derive ulang server-side** dari NIK di tiap request (`resolveRole_`).
- Lockout brute-force: maksimal 5 percobaan gagal per NIK, lockout 15 menit.

## 9. Struktur UI (`Index.html` & `Scanner.html`)

- **Sidebar Navigasi Responsive**: Layout sidebar 270px dengan flex-row ketat (`flex-direction: row !important`, `flex-wrap: nowrap !important`) & kontainer icon 24px terpusat. Menjamin seluruh menu (`Stock`, `Scan`, `Validasi`, `Riwayat`, `Reprint`) selalu tampil sejajar horizontal sempurna di semua perangkat (PC, Tablet, dan Mobile/HP) tanpa patah dua baris.
- **Tab "Stock"**: Tabel master stock (dilengkapi kolom **MID** dan **Supplier** dari lookup `BARCODE OUTBOUND WRM`) + 2 side-card bertingkat (**Penerimaan Shift Ini** & **Pengiriman Shift Ini**).
  - **Breakdown Keluar/Retur per Mesin**: kolom `Keluar` dan `Retur+` dipecah jadi 6 kolom masing-masing (BHP 1-5, AHP 1) via `buildMesinColumns_()`, jadi tabel Stock (dan Validasi) punya total ~19 kolom.
  - **Kolom Beku (Sticky/Freeze)**: `MID`, `Supplier`, `Material`, `Awal` dibekukan di sisi kiri (`sticky-col`, `left:` offset dihitung dari `width` tiap kolom) sehingga tetap terlihat saat tabel di-scroll ke samping menuju kolom mesin. Membutuhkan `.table-scroll` sebagai satu-satunya kontainer yang men-scroll horizontal — grid/flex ancestor-nya (`.stock-layout`, `.app-content`, `body`) wajib pakai `min-width: 0`/`minmax(0, ...)`/`overflow-x: hidden`, kalau tidak, seluruh halaman (termasuk sidebar) ikut ter-scroll dan sticky jadi tidak berfungsi (breaking bug yang pernah terjadi & sudah diperbaiki).
- **Format Angka Presisi (Max 4 Desimal)**: Seluruh perhitungan stok dan render nilai sel tabel diformat secara otomatis menggunakan pembulatan presisi maksimum 4 angka di belakang koma (`formatCellVal`), menghilangkan tail floating point JavaScript (mis. `0.5500000000000007` → `0.55`).
- **Tab "Scan"**: Pilihan event scan. Untuk `terima_wrm`:
  - Widget **HTML5 Date Picker** (`<input type="date">`) dengan nilai default hari berjalan (Today), plus tombol reset **"Semua Tgl"**. Filter berdasarkan kolom `Tanggal Outbound` di BARCODE OUTBOUND WRM.
  - Dropdown **Pilih Nomor Reservasi** yang ter-deduplikasi murni per **Nomor Reservasi Unik** (dari kolom `MATDOC RESERVASI` di BARCODE OUTBOUND WRM, tanpa duplikasi MID material), menampilkan informasi jumlah item material pada masing-masing nomor reservasi.
  - **Panel Informasi Daftar Material (MID) yang Diizinkan**: Kartu hijau interaktif di bawah dropdown yang merincikan daftar seluruh MID, nama barang, dan Qty sesuai nomor reservasi yang dipilih.
  - **Validasi MID Server-side & Client**: Sistem secara otomatis mengawinkan dan mencocokkan MID dari hasil scan barcode (dari `BARCODE OUTBOUND WRM`) vs daftar MID pada nomor reservasi terpilih (kolom `MATDOC RESERVASI`). Jika tidak cocok, transaksi akan ditolak demi mencegah salah kirim material.
  - **3 State Hasil Scan**: kotak hasil scan (`result-box`) punya 3 tampilan — hijau (`result-success`, sukses penuh), merah (`result-error`, gagal/ditolak), dan **kuning/amber** (`result-warning`, scan tercatat TAPI Stock TSP/Mesin belum sinkron karena Tarik Stok Awal Shift belum dilakukan — lihat §7).
- **Tab "Validasi"**: Tabel Masuk (Scan) vs Masuk (MB51 SAP) vs Selisih, plus breakdown Keluar/Retur per mesin yang sama dengan tab Stock (dari data scan, bukan dibandingkan ke MB51 karena MB51 tidak punya data ini). Kolom `MID`/`Supplier`/`Material` juga dibekukan.
- **Modal "Tambah/Edit Min/Max Stock"**: selain MID/Deskripsi/Lokasi/Min/Max, sekarang ada field **UOM** dan **Supplier** (keduanya opsional) — dipakai untuk mendaftarkan material baru ke Material Master (lihat §7) langsung dari form ini, tanpa perlu edit sheet MID EXISTING manual.

## 10. Proteksi Pemetaan Kolom (Robust Column Mapping)

Backend TSP Modul dilengkapi mekanisme dinamis multi-lapis untuk membaca tabel data dari Google Sheets. Hal ini dirancang untuk mencegah *error* saat pengguna tidak sengaja melakukan kesalahan pengetikan di baris judul (header) Excel.
- **Space Trimming**: Mengatasi spasi siluman/tambahan di awal atau akhir kata. Saat membaca *header* sheet atau melakukan pencarian data spesifik, sistem selalu mengaktifkan `.trim()` otomatis. (Contoh: `"MID "` di Sheet dijamin akan dikenali secara internal sebagai `"MID"`).
- **Case-Insensitive Mapping**: Mengatasi inkonsistensi huruf kapital (besar/kecil). Fungsi internal `getHeaderMap_` meregistrasi setiap judul kolom ganda, yakni versi asli dan versi huruf kecil paksa (`toLowerCase`). Panggilan kode terhadap `headerMap['JUMLAH']` atau `headerMap['jumlah']` dipastikan 100% tepat mengarah ke kolom yang sama.
- **Fallback Chaining**: Mengatasi penggantian nama kolom atau *typo*. Pencarian kolom krusial diikat menggunakan jaring pengaman berantai (Logika OR `||`). Misalnya, kolom tanggal dicari berurutan: `"Tanggal Outbound"` → `"TANGGAL"` → `"Tanggal"`. Kolom reservasi: `"MATDOC RESERVASI"` → `"NO RESERVASI"` → `"No Reservasi"`.

## 11. Riwayat Deployment (Versi CLASP)

| Versi | Perubahan utama |
|---|---|
| v1–v11 | Base TSP Modul, autentikasi NIK, scan foto, dashboard stock & validator MB51 |
| v12–v13 | Workflow paralel 2 level + 39 kolom STOCK MESIN breakdown 6 area mesin |
| v14–v15 | Tambah side-card **Pengiriman Shift Ini** + Sticky position pada dashboard Stock |
| v16 | Tambah input No. Reservasi + lookup rincian material (MID, Description, Qty) saat `terima_wrm` |
| v17 | Integrasi data reservasi (awalnya dari tab `RESERVASI` terpisah) dengan dropdown selector yang di-filter otomatis berdasarkan Tanggal & Shift aktif |
| v18–v24 | Penanganan tanggal SAP (`MM/DD/YYYY`), HTML5 Calendar Date Picker (default Hari Berjalan), Filter Movement Type SAP, & deduplikasi murni per Nomor Reservasi Unik |
| v25–v26 | Penghapusan filter Movement Type, integrasi validasi & kawin MID hasil scan barcode vs daftar MID Reservasi SAP, smart date parsing (`DD-MMM-YYYY` seperti `31-Jul-2026`, serial Excel, `YYYY-MM-DD`), dan auto-update deployment production web app (`/exec`) via `npm run deploy` |
| v27–v65 | Refactoring tab data ke `BARCODE OUTBOUND WRM` untuk mapping Supplier per MID, penambahan kolom MID & Supplier pada tabel stok, pembatasan format angka max 4 desimal (`formatCellVal`), dan perbaikan desain sidebar navigasi responsive sejajar flex-row. |
| v66–v80 | **Konsolidasi data reservasi**: tab `RESERVASI` dihapus, seluruh data reservasi terintegrasi ke `BARCODE OUTBOUND WRM` (kolom `MATDOC RESERVASI`). Column mapping diupdate: `Tanggal Outbound`, `DESC`, `QTY`, `UOM`, `Shift`. Lookup MID di-fix (trailing space). Single source of truth untuk lookup Kode Unik + reservasi. |
| v81 | Penambahan kolom **MID**, **Supplier**, dan **Material Description** ke seluruh UI Table jenis apapun (Penerimaan, Pengiriman, Validasi Fisik, dan Pengaturan Min/Max Stock SPV). Data Supplier di-join secara terpusat melalui fungsi backend `getSupplierMap_()` bersumber dari `WRM_INCOMING`. |
| v83 | Breakdown kolom **Keluar** & **Retur+** per area mesin (BHP 1-5, AHP 1) di tabel Stock & Validasi (`computeTspStock_`, `computeValidator_`, `buildMesinColumns_`). |
| v84 | Kolom **MID/Supplier/Material/Awal** dibekukan (sticky/freeze) di sisi kiri tabel Stock & Validasi saat scroll horizontal ke kolom mesin. |
| v85 | **Perbaikan kritis**: `incrementStockCell_` yang sebelumnya diam-diam gagal (silent no-op) menulis ke STOCK TSP/STOCK MESIN saat baris shift aktif belum ada (mis. Tarik Stok Awal Shift belum dilakukan) sekarang mengembalikan status sukses/gagal; hasil scan menampilkan peringatan eksplisit (state "warning" kuning) bila stok gagal sinkron, alih-alih kehilangan data secara diam-diam. |
| v86 | Perbaikan bug scroll horizontal di level halaman (`.stock-layout` grid `2fr 1fr` → `minmax(0, 2fr) minmax(0, 1fr)`, `body { overflow-x: hidden }`, `.app-content { min-width: 0 }`) yang sebelumnya membuat kolom sticky (v84) tidak berfungsi karena seluruh halaman ikut ter-scroll, bukan hanya tabel. |
| *(belum di-deploy)* | Material Master upsert + field Supplier di modal Min/Max Stock (`upsertMaterialMaster_`) — **sudah di-commit ke git** (`ee2f7d8`) tapi **belum sempat di-push/deploy** karena error izin akun clasp (lihat §2, "Known issue"). Push/deploy ulang perlu dilakukan begitu izin akun sudah diperbaiki. |

