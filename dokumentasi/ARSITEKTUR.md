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
     | TSP pilih No. Reservasi (dari tab RESERVASI) + scan Kode Unik -> event terima_wrm
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
| **BARCODE INCOMING WRM** | TSP MODUL | Registry pallet fisik dari WRM (~2830 baris). Sumber lookup MID/Deskripsi/UOM/Qty serta status `AKSI` (VERIFIED/BELUM VERIFIKASI) dan `Keterangan` saat event `terima_wrm`. |
| **RESERVASI** | TSP MODUL | Registry rencana reservasi material per `TANGGAL` & `SHIFT`. Menyediakan dropdown No. Reservasi saat `terima_wrm`. |
| **REPRINT BARCODE** | TSP MODUL | Log penerbitan Barcode Reprint (Kode Anak) oleh TSP saat event `kirim_mesin`. |
| **STOCK TSP** | TSP MODUL | Rekap saldo real-time stok area TSP per MID. |
| **STOCK MESIN** | TSP MODUL | Rekap saldo 39 kolom real-time stok 6 area Mesin (BHP 1..5, AHP 1). |
| **MID EXISTING** | TSP MODUL | Master material (MID, Deskripsi, UOM) — dipakai mengisi tabel Stock supaya semua material master selalu tampil. |
| **MB51** (nama asli `"MB51 "`, ada spasi di akhir) | TSP MODUL | Copy-paste transaksi SAP TCODE MB51. **Hanya validator pembanding**, bukan sumber data utama. |
| **Log Aktivitas Barcode** | TSP MODUL | Audit trail semua percobaan scan (sukses & gagal). |
| **KARYAWAN** | DATA KARYAWAN | Master NIK/Nama/Departemen/Jabatan/Password untuk login. |

Header lengkap sheet "BARCODE MATERIAL PRODUKSI" (`BARCODE_COLUMNS` di `Config.js`):
`TANGGAL, SHIFT, BARCODE, NO RESERVASI, MID, MATERIAL DESCRIPTION, JUMLAH, DITERIMA OLEH TSP DARI WRM, DIKIRIM OLEH TSP KE MESIN, RETUR DITARIK OLEH TSP DARI MESIN, DITERIMA OLEH OPERATOR DARI TSP, DICONSUME OLEH OPERATOR, RETUR DIKIRIM KEMBALI OLEH TSP KE WRM`

## 5. Model Data Barcode (Induk-Anak)

- **Barcode INDUK** = "Kode Unik" asli dari WRM (kode opak, mis. `DTA15M2708199`) —
  mewakili 1 pallet utuh yang diterima TSP. MID/Qty-nya **tidak** ter-encode di teksnya
  sendiri, harus di-lookup dari sheet BARCODE INCOMING WRM.
- **Barcode ANAK** = kode reprint yang di-*generate* SISTEM saat event `kirim_mesin` =
  `<KodeIndukAsli>-<urutan 2 digit>` (mis. `DTA15M2708199-01`) — mewakili 1 pecahan qty
  yang dikirim ke 1 mesin tertentu.
- Klasifikasi induk vs anak (`classifyBarcode_` di `BarcodeService.js`): cek pola regex
  suffix `-\d{2}$` **dan** verifikasi bagian sebelum suffix itu terdaftar sebagai baris
  induk yang sudah diterima.

## 6. State Machine — 6 Checkpoint

| Event (kode internal) | Kolom checkpoint | Prasyarat | Role | Input tambahan |
|---|---|---|---|---|
| `terima_wrm` | Diterima Oleh TSP dari WRM | — (bikin baris induk baru) | TSP | Pilih/Input No. Reservasi (dari tab RESERVASI) |
| `kirim_mesin` | Dikirim Oleh TSP ke Mesin | `terima_wrm` | TSP | pilih Mesin + isi Jumlah manual |
| `terima_operator` | Diterima Oleh Operator dari TSP | `kirim_mesin` | Operator | tidak ada |
| `consume_operator` | Diconsume Oleh Operator | `terima_operator` | Operator | tidak ada |
| `retur_dari_mesin` | Retur Ditarik Oleh TSP dari Mesin | `kirim_mesin` | TSP | tidak ada |
| `retur_ke_wrm` | Retur Dikirim Kembali Oleh TSP ke WRM | `retur_dari_mesin` | TSP | tidak ada |

## 7. Model Perhitungan Stock & Side Panels (`StockService.js`)

Ledger dihitung ulang **on-the-fly** tiap request:

- **Stock TSP** (per MID) = Σ(Diterima dari WRM) − Σ(Dikirim ke Mesin) + Σ(Retur dari Mesin) − Σ(Retur ke WRM).
- **Stock per Mesin** (39 kolom breakdown 6 area mesin) = Σ(Terima Operator) − Σ(Consume) − Σ(Retur Mesin).
- **Panel Penerimaan & Pengiriman Shift Ini**:
  - `computeShiftReceipts_`: Menyajikan daftar material yang diterima dari WRM dalam window shift aktif.
  - `computeShiftDispatches_`: Menyajikan daftar material/reprint yang dikirim ke mesin dalam window shift aktif.
  - Layout Sticky: Melayang fixed di sisi kanan (`position: sticky; top: 80px;`) sehingga tidak hilang saat tabel utama di-scroll.

## 8. Autentikasi (`AuthService.js`)

- Login **NIK+Password** (bukan akun Google), divalidasi ke sheet KARYAWAN.
- Pemetaan Jabatan → role (`JABATAN_ROLE_MAP` di `Config.js`): `"Admin TSP"`/`"TSP"` → `tsp`; `"Operator Production"` → `operator`.
- Role **selalu di-derive ulang server-side** dari NIK di tiap request (`resolveRole_`).
- Lockout brute-force: maksimal 5 percobaan gagal per NIK, lockout 15 menit.

## 9. Struktur UI (`Index.html` & `Scanner.html`)

- **Tab "Stock"**: Tabel master stock + 2 side-card bertingkat (**Penerimaan Shift Ini** & **Pengiriman Shift Ini**).
- **Tab "Scan"**: Pilihan event scan. Untuk `terima_wrm`, menyediakan dropdown Nomor Reservasi yang di-filter berdasarkan tanggal & shift aktif dari tab `RESERVASI`.
- **Tab "Validasi"**: Tabel Masuk (Scan) vs Masuk (MB51 SAP) vs Selisih.

## 10. Riwayat Deployment (Versi CLASP)

| Versi | Perubahan utama |
|---|---|
| v1–v11 | Base TSP Modul, autentikasi NIK, scan foto, dashboard stock & validator MB51 |
| v12–v13 | Workflow paralel 2 level + 39 kolom STOCK MESIN breakdown 6 area mesin |
| v14–v15 | Tambah side-card **Pengiriman Shift Ini** + Sticky position pada dashboard Stock |
| v16 | Tambah input No. Reservasi + lookup rincian material (MID, Description, Qty) saat `terima_wrm` |
| v17 | Integrasi tab `RESERVASI` dengan dropdown selector yang di-filter otomatis berdasarkan Tanggal & Shift aktif |
