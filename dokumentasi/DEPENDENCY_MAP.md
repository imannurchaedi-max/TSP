# Dependency Map — TSP Modul

Peta jaringan ketergantungan (siapa memanggil siapa) antar file & fungsi. Apps Script tidak
punya module/import system — semua file `.js` server-side berbagi 1 namespace global, jadi
"dependency" di sini berarti **relasi pemanggilan fungsi**, bukan `import`/`require`.

> Untuk detail per-fungsi (parameter, calls, called by) lihat **`FUNCTION_MAPPING.md`** —
> dokumen itu jadi sumber kebenaran untuk relasi level-fungsi (diverifikasi langsung
> terhadap `grep -n "^function "` tiap kali diupdate). Dokumen ini fokus ke gambaran
> besar (layer, graf antar file, alur end-to-end) supaya tidak menduplikasi & berisiko
> divergen dari `FUNCTION_MAPPING.md` seperti yang sempat terjadi sebelumnya (lihat §6).

## 1. Graf Ketergantungan Antar File (Server-Side)

```mermaid
graph TD
  Config["Config.js<br/>(konstanta, tidak ada fungsi)"]
  SheetSvc["SheetService.js<br/>(akses sheet generik)"]
  MaterialSvc["MaterialService.js<br/>(lookup master material)"]
  AuthSvc["AuthService.js<br/>(login NIK+Password + requireRole_)"]
  BarcodeSvc["BarcodeService.js<br/>(state machine scan + Reprint)"]
  StockSvc["StockService.js<br/>(stock, admin shift, riwayat, min/max)"]
  CodeJs["Code.js<br/>(entry point web app -- doGet)"]
  ApiSvc["ApiService.js<br/>(entry point app Android -- doPost)"]

  SheetSvc --> Config
  MaterialSvc --> SheetSvc
  MaterialSvc --> Config
  AuthSvc --> Config
  BarcodeSvc --> SheetSvc
  BarcodeSvc --> Config
  StockSvc --> SheetSvc
  StockSvc --> MaterialSvc
  StockSvc --> BarcodeSvc
  StockSvc --> Config
  CodeJs --> AuthSvc
  CodeJs --> BarcodeSvc
  CodeJs --> StockSvc
  CodeJs --> MaterialSvc
  CodeJs --> SheetSvc
  CodeJs --> Config
  ApiSvc --> AuthSvc
  ApiSvc --> CodeJs
```

**Urutan lapisan (dari paling dasar ke paling atas):**
1. `Config.js` — konstanta murni, tidak bergantung ke file lain.
2. `SheetService.js` — bergantung ke `Config.js` (nama sheet, kolom).
3. `MaterialService.js`, `AuthService.js` — bergantung ke `SheetService.js`/`Config.js`.
4. `BarcodeService.js` — bergantung ke `SheetService.js`, `Config.js` (state machine EVENTS),
   juga berisi modul Reprint (`getReprintData_`, `saveBatchReprint_`, `deleteReprintBarcode_`).
   Sejak v114 penerbitan Kode Anak dipusatkan di `allocateChildBarcodes_()`: jalur scan
   (`handleKirimMesin_`) dan jalur Reprint batch (`saveBatchReprint_`) sama-sama memanggilnya,
   jadi relasi keduanya ke `SheetService.js` sekarang **tidak langsung** — lewat allocator itu,
   bukan lagi `appendBarcodeRow_`/`appendReprintRow_` masing-masing.
5. `StockService.js` — **paling banyak dependensi**: `SheetService.js`, `MaterialService.js`
   (`getMaterialMap_`), `BarcodeService.js` (`getShiftBounds_`), `Config.js`. Juga tempat
   logic Admin Shift (`tarikStokAwalShift_`, `konfirmasiStokShift_`, dst) dan Riwayat/History.
6. `Code.js` — lapisan orkestrasi utk **web app**: entry point (`doGet` + fungsi tanpa `_`)
   yang dipanggil `google.script.run`.
7. `ApiService.js` — lapisan orkestrasi utk **app Android**: entry point (`doPost`) yang
   TIDAK menduplikasi logic bisnis — dia manggil ulang fungsi `Code.js` yang sama persis
   dengan `session.nik` hasil verifikasi token (lihat §12 di `ARSITEKTUR.md`).

## 2. Graf Ketergantungan Client ↔ Server (Dual Front-End)

```mermaid
graph LR
  IndexHtml["Index.html<br/>(shell web app + tab Stock/Validasi/dst)"]
  ScannerHtml["Scanner.html<br/>(partial, tab Scan)"]
  StyleHtml["Stylesheet.html<br/>(partial CSS)"]
  CodeJs["Code.js<br/>(doGet)"]
  ApiSvc["ApiService.js<br/>(doPost)"]
  FlutterApp["App Android (Flutter)<br/>android modif/TSPModul/"]

  IndexHtml -- "include()" --> StyleHtml
  IndexHtml -- "include()" --> ScannerHtml
  IndexHtml -- "google.script.run:<br/>~25 fungsi (lihat FUNCTION_MAPPING §7)" --> CodeJs
  ScannerHtml -- "google.script.run:<br/>getMesinList, submitScan" --> CodeJs
  ScannerHtml -. "shared global vars<br/>(PAGE_ROLE, PAGE_EVENTS, CURRENT_NIK)" .-> IndexHtml
  FlutterApp -- "POST /exec {action, token, ...}<br/>302 Location -> GET echo -> JSON" --> ApiSvc
  ApiSvc -- "dispatch ke fungsi Code.js<br/>yang sama (lihat §1)" --> CodeJs
```

`Index.html` dan `Scanner.html` dirender jadi **satu dokumen HTML** (lewat `include()`
di `Code.js`), sehingga berbagi 1 scope JavaScript — variabel global yang di-set di
`Index.html` (`PAGE_ROLE`, `PAGE_EVENTS`, `CURRENT_NIK`) langsung terbaca oleh fungsi di
`Scanner.html` tanpa mekanisme passing eksplisit.

App Android tidak pernah memanggil `Code.js` langsung — selalu lewat `ApiService.js`
(`doPost`) yang mem-verifikasi token dulu, baru mendispatch ke fungsi `Code.js` yang
identik dengan yang dipanggil web app.

## 3. State Machine — Transisi 6 Checkpoint (per 1 barcode)

```mermaid
stateDiagram-v2
  [*] --> DiterimaWRM: terima_wrm<br/>(scan Kode Unik INDUK,<br/>lookup BARCODE OUTBOUND WRM)
  DiterimaWRM --> DikirimMesin: kirim_mesin<br/>(scan Kode Unik INDUK lagi,<br/>generate barcode ANAK baru)
  DikirimMesin --> DiterimaOperator: terima_operator<br/>(scan barcode ANAK)
  DiterimaOperator --> Diconsume: consume_operator<br/>(scan barcode ANAK)
  DikirimMesin --> ReturTSP: retur_dari_mesin<br/>(scan barcode ANAK)
  ReturTSP --> ReturWRM: retur_ke_wrm<br/>(scan barcode ANAK, MatClaim)
  Diconsume --> [*]
  ReturWRM --> [*]
```

Catatan: `retur_dari_mesin` prasyaratnya `kirim_mesin` (bukan `terima_operator`), jadi
secara teknis bisa terjadi sebelum ATAU sesudah `terima_operator`/`consume_operator` —
diagram di atas menyederhanakan jadi 1 cabang dari `DikirimMesin` untuk keterbacaan.

Setiap transisi checkpoint (kecuali `terima_wrm`) juga memicu `incrementStockCell_()` ke
sheet STOCK TSP dan/atau STOCK MESIN (lihat §4) — kalau baris shift aktif belum ada
(Tarik Stok Awal Shift belum dilakukan), fungsi itu return `false` dan hasil scan
menampilkan warning eksplisit, bukan diam-diam kehilangan angka stok.

## 4. Alur Panggilan — Kasus "Scan Terima dari WRM"

```mermaid
sequenceDiagram
  participant U as User (TSP)
  participant Scanner as Scanner.html
  participant Code as Code.js
  participant Auth as AuthService.js
  participant Barcode as BarcodeService.js
  participant Sheet as SheetService.js
  participant Stock as StockService.js
  participant GS as Google Sheets

  U->>Scanner: scan kamera (live, mobile_scanner di Android /<br/>foto+html5-qrcode di web)
  Scanner->>Code: submitScan(barcode, "terima_wrm", ..., noReservasi, nik)
  Code->>Auth: resolveRole_(nik)
  Auth->>Sheet: findKaryawanByNik_ -> getKaryawanRows_
  Sheet->>GS: baca sheet KARYAWAN (atau cache)
  Auth-->>Code: {nik, nama, role}
  Code->>Barcode: processScan_(...)
  Barcode->>Barcode: handleTerimaWrm_(raw, noReservasi, now)
  Barcode->>Sheet: findBarcodeRow_ (cek belum pernah diterima)
  Barcode->>Sheet: lookupWrmIncoming_(raw)
  Sheet->>GS: baca sheet BARCODE OUTBOUND WRM (Kode Unik)
  Sheet-->>Barcode: {mid, deskripsi, qty}
  Barcode->>Sheet: validateMidInReservasi_(noReservasi, mid)
  Sheet->>GS: baca BARCODE OUTBOUND WRM (MATDOC RESERVASI + MID)
  Sheet-->>Barcode: validasi OK
  Barcode->>Sheet: appendBarcodeRow_(...)
  Sheet->>GS: tulis baris baru di Barcode Material Produksi
  Barcode->>Stock: incrementStockCell_(STOCK_TSP, mid, "Barang Masuk", qty, now)
  Stock->>GS: update sel di STOCK TSP (blok shift aktif)
  Code->>Sheet: appendLog_(...)
  Sheet->>GS: tulis baris di Log Aktivitas Barcode
  Code-->>Scanner: {success, warning?, message}
  Scanner-->>U: tampilkan hasil (hijau/kuning/merah)
```

## 5. Alur Panggilan — Kasus "Load Tab Stock" (role TSP)

```mermaid
sequenceDiagram
  participant U as User (TSP/SPV)
  participant Client as Index.html / App Android
  participant Entry as Code.js / ApiService.js
  participant Stock as StockService.js
  participant Material as MaterialService.js
  participant GS as Google Sheets

  U->>Client: buka tab/layar "Stock"
  Client->>Entry: getTspStock()
  Entry->>Stock: computeTspStock_(now)
  Stock->>GS: baca LANGSUNG dari sheet STOCK TSP (bukan hitung ulang<br/>dari Barcode Material Produksi -- ledger sudah live-updated<br/>oleh incrementStockCell_ tiap scan, lihat §4)
  Stock->>Material: getSupplierMap_()
  Material->>GS: baca BARCODE OUTBOUND WRM (fallback: Material Master)
  alt sheet STOCK TSP kosong (belum pernah ditarik)
    Stock->>Material: getMaterialMap_() -- fallback tampilkan semua<br/>material master dgn stok 0
    Material->>GS: baca sheet MATERIAL MASTER
  end
  Stock-->>Entry: {shift, date, statusNeraca, validatorNama, rows[]}
  Entry-->>Client: {success, data}
  Client->>Client: render tabel Stock (web: renderTable();<br/>Android: ListView Flutter)
  Client-->>U: tabel Stock tampil
```

> **Koreksi dari versi dokumen sebelumnya**: diagram ini sempat menyebut alur baca dari
> sheet "MID EXISTING" lewat fungsi `seedAccFromMaterialMap_`/`bucketAdd_` yang **sudah
> tidak ada** di kode saat ini. `computeTspStock_` sekarang membaca ledger **STOCK TSP**
> langsung (ditulis real-time oleh `incrementStockCell_` tiap scan), dan sumber material
> master-nya adalah sheet **MATERIAL MASTER** (bukan `MID EXISTING`, yang sudah jadi
> sheet legacy sejak migrasi — lihat §3 `ARSITEKTUR.md`).

## 6. Adjacency List Lengkap & Graf Auto-Generated

Adjacency list manual (fungsi → daftar fungsi yang dipanggil) yang sebelumnya ada di sini
**dihapus** karena berisiko besar jadi stale lagi persis seperti yang ditemukan lewat audit
Agustus 2026 (masih menyebut fungsi yang sudah dihapus: `upsertMaterialMaster_`,
`lookupMaterial_`, `seedAccFromMaterialMap_`, `bucketAdd_`, `computeRecentReceipts_`,
`computeMesinStockBreakdown_`, `getRecentReceipts`). Dua sumber ini dipertahankan sebagai
gantinya, masing-masing dgn mekanisme anti-stale sendiri:

- **`FUNCTION_MAPPING.md`** (kolom "Calls"/"Called by" tiap fungsi) — manual tapi
  diverifikasi terhadap `grep -n "^function " Active/*.js` tiap kali diupdate.
- **`dokumentasi/code_graph.json` / `code_graph.mmd`** — auto-generated oleh
  `tools/graphify_codebase.py`, jalan otomatis tiap `npm run deploy` (via `docs:build`),
  jadi TIDAK PERNAH stale relatif terhadap `Active/*.js` versi yang di-deploy. Catatan:
  graf ini granularitasnya **file → function** (bukan function → function), dan hanya
  memindai `Active/*.js` (tidak mencakup `android modif/TSPModul/`, karena app Android bukan
  bagian deployment CLASP) — pelengkap, bukan pengganti, `FUNCTION_MAPPING.md`.

## 7. Fungsi "Akar" vs "Daun" vs "Hub"

- **Akar panggilan (entry point, dipanggil client)**: semua fungsi tanpa `_` di `Code.js`
  (~25 fungsi, lihat `FUNCTION_MAPPING.md` §7) dan `doPost` di `ApiService.js` (yang lalu
  mendispatch ke fungsi `Code.js` yang sama).
- **Daun (tidak memanggil fungsi lain, operasi dasar)**: `getSpreadsheet_`, `toDateOrNull_`,
  `padSeq_`, `formatDateLabel_`, `getLoginAttemptCount_`, `clearLoginAttempts_`,
  `roleFromJabatan_`, `normalizeMid_`, `parseMb51Timestamp_`.
- **Fungsi "hub"** (dipanggil dari banyak tempat, paling kritikal kalau berubah):
  `getSheet_` & `getHeaderMap_` (hampir semua fungsi akses sheet), `getShiftBounds_`
  (dipanggil ~12 fungsi lintas `BarcodeService.js`/`StockService.js` — dasar pengelompokan
  blok shift di STOCK TSP/STOCK MESIN), `getSupplierMap_`/`getMaterialMap_`
  (dipanggil hampir semua fungsi `compute*_` di `StockService.js`), `requireRole_` (semua
  endpoint tulis sensitif, lihat §12 `ARSITEKTUR.md` — satu-satunya gerbang otorisasi).
