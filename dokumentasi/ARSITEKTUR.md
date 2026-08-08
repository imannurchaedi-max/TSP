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
  - `npm run deploy` = `docs:build` (regenerate dokumentasi ini) + `clasp push -f` + `clasp deploy`
    ke deployment ID production yang sama, jadi `/exec` selalu ikut ter-update tiap deploy
    (bukan cuma `/dev` seperti `clasp push` polos).
- **Printer produksi**: Tally Dascom DL210, label thermal fisik roll **75x50mm (fixed)** —
  dipakai untuk cetak label Kode Anak/Reprint (lihat §9, Tab Reprint).
- **Library eksternal (CDN)**: `html5-qrcode@2.3.8` (decode barcode dari foto),
  `jsbarcode@3.11.5` (render barcode CODE128 di label reprint),
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
| **MATERIAL MASTER** (`SHEET_NAMES.MATERIAL_MASTER`) | TSP MODUL | Master material aktif (MID, Deskripsi/**MATERIAL DESCRIPTION** — kedua penamaan header diterima, UOM, **Supplier** — kolom ditambahkan otomatis kalau belum ada) — dipakai mengisi tabel Stock supaya semua material master selalu tampil, dan jadi sumber fallback Supplier untuk MID yang belum pernah ada transaksi WRM. Dikelola lewat menu **Material Master → Material List** (lihat §7). |
| **MID EXISTING** *(legacy)* | TSP MODUL | Sheet Material Master versi lama, sudah tidak dibaca langsung oleh kode. Dipertahankan sebagai sumber migrasi sekali-jalan (`migrateMaterialMasterIfEmpty_`) ke sheet **MATERIAL MASTER** di atas — aman dihapus manual setelah dipastikan migrasi berhasil & datanya lengkap. |
| **MIN MAX STOCK** (`SHEET_NAMES.MIN_MAX`) | TSP MODUL | Threshold Min/Max Stock per kombinasi MID + Lokasi (7 kolom: MID, Deskripsi, Lokasi, Min, Max, Updated At, Updated By). Dikelola lewat menu **Material Master → Min/Max Stock** (lihat §7); MID di sheet ini wajib sudah terdaftar di **MATERIAL MASTER**. |
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
  - `computeShiftReceipts_`: Menyajikan daftar material yang diterima dari WRM dalam window shift aktif (terurut descending, terbaru di atas).
  - `computeShiftDispatches_`: Menyajikan daftar material/reprint yang dikirim ke mesin dalam window shift aktif (terurut descending, terbaru di atas).
  - Layout (sejak v87): 2 kolom sejajar kiri-kanan **di atas** tabel Stock utama (bukan lagi sticky di sisi kanan) — lihat §9.
- **Ketahanan Sinkronisasi Ledger (`incrementStockCell_`)**: Update sel real-time ke STOCK TSP/STOCK MESIN mensyaratkan baris shift aktif sudah ada (dicetak lewat "Tarik Stok Awal Shift"). Jika baris belum ada, fungsi ini mengembalikan `false` (bukan diam-diam gagal) — `handleTerimaWrm_`, `handleKirimMesin_`, dan `handleChildCheckpoint_` menangkap status ini dan menambahkan peringatan eksplisit ke hasil scan (lihat §9, state "warning") supaya operator/Admin TSP tahu harus Tarik Stok Awal Shift dan verifikasi ulang transaksi tsb, alih-alih kehilangan angka stok tanpa jejak.
- **Menu "Material Master" — 2 sesi terpisah (`MaterialService.js` + `StockService.js`)**: Diakses lewat tab sidebar "Material Master" (role **tsp** & **spv** — sebelumnya spv-only, direname dari "Min/Max Stock"), dengan sub-navigasi 2 sesi yang sengaja tidak dicampur:
  - **Sesi 1 "Material List"** — CRUD murni Material Master (MID, Deskripsi, UOM, Supplier), TANPA konsep lokasi/threshold:
    - `saveMaterialMaster_(nik, mid, deskripsi, uom, supplier)`: insert/update 1 baris. Berbeda dari `upsertMaterialMaster_` versi lama (sudah dihapus) yang cuma mengisi field kosong, fungsi ini **selalu menimpa** field dengan nilai baru — sesuai untuk aksi eksplisit user "Tambah/Edit Material".
    - `saveMaterialBatch_(nik, items)`: import CSV massal (`MID,MATERIAL DESCRIPTION,UOM,SUPPLIER`).
    - `deleteMaterial_(nik, mid)`: hapus material — **ditolak** kalau MID pernah dipakai di transaksi manapun (`isMidUsedAnywhere_` — cek kolom MID di STOCK TSP, STOCK MESIN, BARCODE MATERIAL PRODUKSI, BARCODE OUTBOUND WRM). Kalau berhasil dihapus, **cascade**: seluruh baris MIN MAX STOCK terkait MID itu ikut terhapus (`deleteMaterialMaster_` + cleanup manual di `deleteMaterial_`).
    - `resolveDeskCol_(headerMap)`: helper supaya kolom deskripsi bisa ditulis sebagai header `"Deskripsi"` ATAU `"MATERIAL DESCRIPTION"` (case-insensitive) — kompatibel dengan sheet manapun yang dipakai user.
    - `migrateMaterialMasterIfEmpty_()`: migrasi sekali-jalan dari sheet lama `MID EXISTING` ke sheet baru `MATERIAL MASTER` kalau sheet baru masih kosong. Aman dipanggil berkali-kali (self-limiting), dipanggil otomatis dari `getMaterialListApi()` tiap sesi Material List dibuka.
  - **Sesi 2 "Min/Max Stock"** — threshold per MID + Lokasi, MID **wajib** sudah terdaftar di sesi 1:
    - `saveMinMaxSetting(nik, mid, lokasi, minStock, maxStock)`: **menolak** MID yang belum ada di Material Master (pesan: "Tambahkan dulu di sesi Material List") — beda dari versi lama yang auto-register MID baru secara implisit (sumber percampuran data yang sekarang sengaja dihindari).
    - `saveMinMaxBatch_(nik, items)`: import CSV (`MID,LOKASI,MIN,MAX`) — baris dengan MID belum terdaftar di-skip, dilaporkan di pesan hasil import.
    - `deleteMinMaxSetting_(nik, mid, lokasi)`: hapus 1 baris threshold MID+Lokasi. **Tidak** menyentuh Material Master (beda dari versi awal fitur delete yang sempat cascade-delete ke Material Master — dipisah total begitu Material List jadi sesi sendiri).
  - Input MID di modal "Tambah Min/Max" (sesi 2) pakai `<datalist>` yang di-populate dari data Material List (sesi 1), jadi user cuma bisa pilih MID yang memang sudah valid.
  - **Prioritas Supplier**: `getSupplierMap_()` di-seed dari Supplier default Material Master dulu (fallback), lalu ditimpa oleh Supplier dari histori transaksi `BARCODE OUTBOUND WRM` kalau MID itu sudah pernah punya transaksi — jadi begitu ada transaksi WRM nyata, data itu yang menang.

## 8. Autentikasi (`AuthService.js`)

- Login **NIK+Password** (bukan akun Google), divalidasi ke sheet KARYAWAN.
- Pemetaan Jabatan → role (`JABATAN_ROLE_MAP` di `Config.js`): `"Admin TSP"`/`"TSP"` → `tsp`; `"Operator Production"` → `operator`.
- Role **selalu di-derive ulang server-side** dari NIK di tiap request (`resolveRole_`).
- Lockout brute-force: maksimal 5 percobaan gagal per NIK, lockout 15 menit.

## 9. Struktur UI (`Index.html` & `Scanner.html`)

- **Sidebar Navigasi Responsive**: Layout sidebar 270px dengan flex-row ketat (`flex-direction: row !important`, `flex-wrap: nowrap !important`) & kontainer icon 24px terpusat. Menjamin seluruh menu (`Stock`, `Scan`, `Validasi`, `Riwayat`, `Reprint`, `Material Master`) selalu tampil sejajar horizontal sempurna di semua perangkat (PC, Tablet, dan Mobile/HP) tanpa patah dua baris. `Material Master` tampil untuk role `tsp` & `spv`; `Validasi`/`Reprint` untuk `tsp` & `spv`.
- **Tab "Stock"**: Panel **Penerimaan Shift Ini** & **Pengiriman Shift Ini** (`.stock-shift-panels`, `display:grid` 2 kolom sejajar kiri-kanan — wajib di-set via JS sebagai `'grid'`, bukan `'block'`, karena inline `style.display` selalu menang atas class CSS) tampil **di atas** tabel Stock utama, masing-masing dibatasi tinggi ~4 baris + scroll internal (data terbaru selalu di atas, sudah terurut descending dari backend). Tabel Stock sendiri full-width mengikuti layar (`#tab-stock.tab-panel { max-width: none }`, dikecualikan dari cap 960px yang berlaku default ke tab lain — begitu juga `#tab-validasi`/`#tab-history`/`#tab-minmax`).
  - **Breakdown Keluar/Retur per Mesin**: kolom `Keluar` dan `Retur+` dipecah jadi 6 kolom masing-masing (BHP 1-5, AHP 1) via `buildMesinColumns_()`, jadi tabel Stock (dan Validasi) punya total ~19 kolom.
  - **Kolom Beku (Sticky/Freeze)**: `MID`, `Supplier`, `Material`, `Awal` dibekukan di sisi kiri (`sticky-col`, `left:` offset dihitung dari `width` tiap kolom) sehingga tetap terlihat saat tabel di-scroll ke samping menuju kolom mesin. Sel data kolom `Material` (`td.sticky-col`) **tidak lagi dipotong dengan ellipsis** — teks dibiarkan wrap ke baris berikutnya kalau nama material panjang (header tetap 1 baris karena labelnya selalu pendek).
  - **Scroll universal (`.table-scroll`)**: dipakai bersama oleh `renderTable()`/`renderPortalTable()` untuk tabel Stock, Validasi, Riwayat, dan riwayat kode anak di Reprint — dibatasi `max-height: 68vh` + `overflow: auto` pada kedua sumbu, sehingga scrollbar vertikal & horizontal selalu berada di posisi tetap di tepi frame (tidak perlu scroll halaman dulu untuk bisa scroll ke samping seperti sebelumnya). Panel Penerimaan/Pengiriman override `max-height` jadi lebih kecil (~205px) lewat selector `#recent-receipts-wrap`/`#shift-dispatches-wrap` yang lebih spesifik.
- **Format Angka Presisi (Max 4 Desimal)**: Seluruh perhitungan stok dan render nilai sel tabel diformat secara otomatis menggunakan pembulatan presisi maksimum 4 angka di belakang koma (`formatCellVal`), menghilangkan tail floating point JavaScript (mis. `0.5500000000000007` → `0.55`).
- **Tab "Scan"**: Pilihan event scan. Untuk `terima_wrm`:
  - Widget **HTML5 Date Picker** (`<input type="date">`) dengan nilai default hari berjalan (Today), plus tombol reset **"Semua Tgl"**. Filter berdasarkan kolom `Tanggal Outbound` di BARCODE OUTBOUND WRM.
  - Dropdown **Pilih Nomor Reservasi** yang ter-deduplikasi murni per **Nomor Reservasi Unik** (dari kolom `MATDOC RESERVASI` di BARCODE OUTBOUND WRM, tanpa duplikasi MID material), menampilkan informasi jumlah item material pada masing-masing nomor reservasi.
  - **Panel Informasi Daftar Material (MID) yang Diizinkan**: Kartu hijau interaktif di bawah dropdown yang merincikan daftar seluruh MID, nama barang, dan Qty sesuai nomor reservasi yang dipilih.
  - **Validasi MID Server-side & Client**: Sistem secara otomatis mengawinkan dan mencocokkan MID dari hasil scan barcode (dari `BARCODE OUTBOUND WRM`) vs daftar MID pada nomor reservasi terpilih (kolom `MATDOC RESERVASI`). Jika tidak cocok, transaksi akan ditolak demi mencegah salah kirim material.
  - **3 State Hasil Scan**: kotak hasil scan (`result-box`) punya 3 tampilan — hijau (`result-success`, sukses penuh), merah (`result-error`, gagal/ditolak), dan **kuning/amber** (`result-warning`, scan tercatat TAPI Stock TSP/Mesin belum sinkron karena Tarik Stok Awal Shift belum dilakukan — lihat §7).
- **Tab "Validasi"**: Tabel Masuk (Scan) vs Masuk (MB51 SAP) vs Selisih, plus breakdown Keluar/Retur per mesin yang sama dengan tab Stock (dari data scan, bukan dibandingkan ke MB51 karena MB51 tidak punya data ini). Kolom `MID`/`Supplier`/`Material` juga dibekukan.
- **Tab "Material Master"**: sub-navigasi 2 sesi (lihat §7 untuk detail backend):
  - **Sesi "Material List"**: tabel MID/Deskripsi/UOM/Supplier + tombol Tambah/Edit/Hapus + Template/Upload CSV sendiri. Modal `modal-material-edit`.
  - **Sesi "Min/Max Stock"**: tabel MID/Lokasi/Min/Max/Status + filter Lokasi + tombol Tambah/Edit/Hapus + Template/Upload CSV sendiri (`MID,LOKASI,MIN,MAX`). Modal `modal-minmax-edit`, input MID pakai `<datalist>` yang hanya berisi MID dari Material List (mencegah threshold dibuat untuk MID yang belum terdaftar).
- **Tab "Reprint" — Kalibrasi Cetak Label (Tally Dascom DL210, 75x50mm)**: `applyReprintPageSize_()` menyuntikkan `@page { size: 75mm 50mm; margin: 0 }` ke `<style>` yang di-refresh tiap render label, jadi print dialog browser otomatis menerima ukuran kertas fisik yang benar (sebelumnya tidak ada aturan `@page` sama sekali, selalu fallback ke A4/Letter). Karena roll label printer fisiknya fixed 75x50mm (tidak bisa ganti per print job), preset ukuran **Kecil/Standar/Besar** di modal preview cuma mengatur kepadatan konten (tinggi barcode, ukuran font, padding) di dalam kanvas 75x50mm yang sama — bukan ukuran kertas berbeda-beda. Tiap `.print-label-page` diberi `width`/`height` mm eksplisit + `overflow:hidden` supaya konten tidak pernah meluber keluar batas fisik label.

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
| v87 | Sync ~9 hari pekerjaan lokal yang sempat tertahan (barcode scan, form No. Reservasi, filter Movement Type, dll.) + rearrange layout Stock: panel Penerimaan/Pengiriman dipindah ke atas tabel, frame tabel Stock dibuat full-width dengan scroll internal. |
| v88–v90 | Perbaikan panel Penerimaan/Pengiriman: root cause stack vertikal ternyata `style.display` inline di-set `'block'` oleh JS (menang atas `display:grid` di CSS) — diganti `'grid'`. Kolom Material di tabel Stock/Validasi tidak lagi dipotong ellipsis (`td.sticky-col` boleh wrap). |
| v91 | `.tab-panel` yang sebelumnya dibatasi `max-width: 960px` secara default (cuma `#tab-stock` dikecualikan) sekarang juga dikecualikan untuk `#tab-validasi`/`#tab-history`/`#tab-minmax` — tabelnya jadi full-width mengikuti layar, bukan cuma separuh. |
| v92 | *(superseded v94)* Tombol shortcut "+ Tambah Material" sempat ditambahkan di tab Stock supaya role `tsp` bisa daftar material tanpa akses tab Min/Max Stock (yang saat itu masih spv-only) — dihapus lagi di v94 setelah menu direname jadi Material Master & dibuka untuk role `tsp`. |
| v93 | Tombol **Hapus** di tabel Min/Max Stock (sebelumnya cuma ada Edit) — hapus MID+Lokasi tertentu; kalau MID itu tidak punya lokasi lain & belum pernah dipakai di transaksi, MID-nya ikut hilang dari Material Master (perilaku ini disederhanakan lagi di v95). |
| v94 | Tab "Min/Max Stock" di-rename jadi **"Material Master"**, dibuka untuk role `tsp` (sebelumnya spv-only) — akar masalah kenapa Admin TSP tidak bisa tambah/hapus material sendiri. |
| v95 | **Konsolidasi jadi 2 sesi terpisah** ("jangan dicampur aduk"): Material List (MID/Deskripsi/UOM/Supplier) vs Min/Max Stock (MID+Lokasi+Min+Max), masing-masing dengan toolbar & CSV sendiri. `saveMinMaxSetting` sekarang menolak MID yang belum terdaftar; `deleteMinMaxSetting_` disederhanakan jadi murni hapus threshold, tidak lagi cascade ke Material Master (lihat §7). |
| v96 | Sumber Material Master dipindah dari sheet lama `MID EXISTING` ke sheet baru `MATERIAL MASTER` (dibuat manual oleh user) + migrasi otomatis sekali-jalan (`migrateMaterialMasterIfEmpty_`) supaya data lama tidak hilang. `resolveDeskCol_` bikin kode kompatibel dengan header `"Deskripsi"` maupun `"MATERIAL DESCRIPTION"`. |
| v97 | Kalibrasi cetak label Reprint untuk printer produksi Tally Dascom DL210 (label thermal 75x50mm) — `@page` CSS baru di-set programatik via `applyReprintPageSize_()` supaya print dialog otomatis pas ukuran kertas fisik, alih-alih fallback ke A4/Letter seperti sebelumnya. |

