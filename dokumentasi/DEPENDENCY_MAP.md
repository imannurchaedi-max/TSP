# Dependency Map — TSP Modul

Peta jaringan ketergantungan (siapa memanggil siapa) antar file & fungsi. Apps Script tidak
punya module/import system — semua file `.js` server-side berbagi 1 namespace global, jadi
"dependency" di sini berarti **relasi pemanggilan fungsi**, bukan `import`/`require`.

## 1. Graf Ketergantungan Antar File (Server-Side)

```mermaid
graph TD
  Config["Config.js<br/>(konstanta, tidak ada fungsi)"]
  SheetSvc["SheetService.js<br/>(akses sheet generik)"]
  MaterialSvc["MaterialService.js<br/>(lookup master material)"]
  AuthSvc["AuthService.js<br/>(login NIK+Password)"]
  BarcodeSvc["BarcodeService.js<br/>(state machine scan)"]
  StockSvc["StockService.js<br/>(perhitungan stock + validator)"]
  CodeJs["Code.js<br/>(entry point web app)"]

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
  CodeJs --> SheetSvc
  CodeJs --> Config
```

**Urutan lapisan (dari paling dasar ke paling atas):**
1. `Config.js` — konstanta murni, tidak bergantung ke file lain.
2. `SheetService.js` — bergantung ke `Config.js` (nama sheet, kolom).
3. `MaterialService.js`, `AuthService.js` — bergantung ke `SheetService.js`/`Config.js`.
4. `BarcodeService.js` — bergantung ke `SheetService.js`, `Config.js` (state machine EVENTS).
5. `StockService.js` — **paling banyak dependensi**: `SheetService.js`, `MaterialService.js`
   (`getMaterialMap_`), `BarcodeService.js` (`getShiftBounds_`), `Config.js`.
6. `Code.js` — lapisan terluar, orkestrasi semua service di atas jadi entry point yang
   dipanggil client.

## 2. Graf Ketergantungan Client ↔ Server

```mermaid
graph LR
  IndexHtml["Index.html<br/>(shell + tab Stock/Validasi)"]
  ScannerHtml["Scanner.html<br/>(partial, tab Scan)"]
  StyleHtml["Stylesheet.html<br/>(partial CSS)"]
  CodeJs["Code.js"]

  IndexHtml -- "include()" --> StyleHtml
  IndexHtml -- "include()" --> ScannerHtml
  IndexHtml -- "google.script.run:<br/>login, getMesinList,<br/>getTspStock, getMesinStock,<br/>getValidatorData, getRecentReceipts" --> CodeJs
  ScannerHtml -- "google.script.run:<br/>getMesinList, submitScan" --> CodeJs
  ScannerHtml -. "shared global vars<br/>(PAGE_ROLE, PAGE_EVENTS, CURRENT_NIK)" .-> IndexHtml
```

`Index.html` dan `Scanner.html` dirender jadi **satu dokumen HTML** (lewat `include()`
di `Code.js`), sehingga berbagi 1 scope JavaScript — variabel global yang di-set di
`Index.html` (`PAGE_ROLE`, `PAGE_EVENTS`, `CURRENT_NIK`) langsung terbaca oleh fungsi di
`Scanner.html` tanpa mekanisme passing eksplisit.

## 3. State Machine — Transisi 6 Checkpoint (per 1 barcode)

```mermaid
stateDiagram-v2
  [*] --> DiterimaWRM: terima_wrm<br/>(scan Kode Unik INDUK,<br/>lookup BARCODE INCOMING WRM)
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

## 4. Alur Panggilan — Kasus "Scan Terima dari WRM"

```mermaid
sequenceDiagram
  participant U as User (TSP)
  participant Scanner as Scanner.html
  participant Code as Code.js
  participant Auth as AuthService.js
  participant Barcode as BarcodeService.js
  participant Sheet as SheetService.js
  participant GS as Google Sheets

  U->>Scanner: ambil foto barcode
  Scanner->>Scanner: handleCapturedFile() -> scanFile() decode
  Scanner->>Code: submitScan(barcode, "terima_wrm", ..., nik)
  Code->>Auth: resolveRole_(nik)
  Auth->>Sheet: findKaryawanByNik_ -> getKaryawanRows_
  Sheet->>GS: baca sheet KARYAWAN (atau cache)
  Auth-->>Code: {nik, nama, role}
  Code->>Barcode: processScan_(...)
  Barcode->>Barcode: handleTerimaWrm_(raw, now)
  Barcode->>Sheet: findBarcodeRow_ (cek belum pernah diterima)
  Barcode->>Sheet: lookupWrmIncoming_(raw)
  Sheet->>GS: baca sheet BARCODE INCOMING WRM
  Sheet-->>Barcode: {mid, deskripsi, qty, aksi, keterangan}
  Barcode->>Barcode: cek AKSI=VERIFIED & bukan HOLD
  Barcode->>Sheet: appendBarcodeRow_(...)
  Sheet->>GS: tulis baris baru di Barcode Material Produksi
  Code->>Sheet: appendLog_(...)
  Sheet->>GS: tulis baris di Log Aktivitas Barcode
  Code-->>Scanner: {success, message}
  Scanner-->>U: tampilkan hasil
```

## 5. Alur Panggilan — Kasus "Load Tab Stock"

```mermaid
sequenceDiagram
  participant U as User
  participant Index as Index.html
  participant Code as Code.js
  participant Stock as StockService.js
  participant Material as MaterialService.js
  participant Sheet as SheetService.js
  participant GS as Google Sheets

  U->>Index: buka/klik tab "Stock"
  Index->>Code: getTspStock()
  Code->>Stock: computeTspStock_(now)
  Stock->>Barcode: getShiftBounds_(now)
  Stock->>Sheet: readAllBarcodeRows_()
  Sheet->>GS: baca semua baris "Barcode Material Produksi"
  Stock->>Material: seedAccFromMaterialMap_() -> getMaterialMap_()
  Material->>GS: baca sheet "MID EXISTING"
  Stock->>Stock: bucketAdd_() per baris (agregasi ledger)
  Stock-->>Code: {shift, date, rows[]}
  Code-->>Index: {success, data}
  Index->>Index: renderTable(...)
  Index-->>U: tabel Stock tampil
```

## 6. Adjacency List (Ringkas, Semua Fungsi Server-Side)

Format: `fungsi -> [daftar fungsi yang dipanggil]`

```
getSheet_ -> [getSpreadsheet_]
ensureSheetsReady_ -> [getSheet_, getSpreadsheet_]
findRowByColumnValue_ -> [getHeaderMap_]
findBarcodeRow_ -> [getSheet_, findRowByColumnValue_]
lookupWrmIncoming_ -> [getSheet_, findRowByColumnValue_]
appendBarcodeRow_ -> [getSheet_, getHeaderMap_]
updateBarcodeCell_ -> [getSheet_, getHeaderMap_]
appendLog_ -> [getSheet_]

getMaterialMap_ -> [getSheet_, getHeaderMap_]
lookupMaterial_ -> [getMaterialMap_]                      # dead code, tidak dipanggil

getKaryawanRows_ -> [readKaryawanRowsFromCache_, writeKaryawanRowsToCache_]
findKaryawanByNik_ -> [getKaryawanRows_]
login_ -> [getLoginAttemptCount_, findKaryawanByNik_, registerLoginFailure_, roleFromJabatan_, clearLoginAttempts_]
resolveRole_ -> [findKaryawanByNik_, roleFromJabatan_]

classifyBarcode_ -> [findBarcodeRow_, getCellValue_]
getNextChildSequence_ -> [getSheet_, getHeaderMap_]
getShift_ -> [getShiftBounds_]
processScan_ -> [ensureSheetsReady_, handleTerimaWrm_, handleKirimMesin_, classifyBarcode_, handleChildCheckpoint_]
handleTerimaWrm_ -> [findBarcodeRow_, lookupWrmIncoming_, formatTimestamp_, getCellValue_, getShift_, appendBarcodeRow_]
handleKirimMesin_ -> [findBarcodeRow_, getCellValue_, getNextChildSequence_, padSeq_, getShift_, appendBarcodeRow_]
handleChildCheckpoint_ -> [findBarcodeRow_, getCellValue_, formatTimestamp_, updateBarcodeCell_]

readAllBarcodeRows_ -> [getSheet_, getHeaderMap_, toDateOrNull_]
seedAccFromMaterialMap_ -> [getMaterialMap_]
computeTspStock_ -> [getShiftBounds_, readAllBarcodeRows_, seedAccFromMaterialMap_, bucketAdd_, formatDateLabel_]
computeMesinStock_ -> [getShiftBounds_, readAllBarcodeRows_, seedAccFromMaterialMap_, bucketAdd_, formatDateLabel_]
computeRecentReceipts_ -> [readAllBarcodeRows_]
computeValidator_ -> [getShiftBounds_, computeTspStock_, getSheet_, parseMb51Timestamp_, getMaterialMap_]

doGet -> [HtmlService.createTemplateFromFile]
login -> [login_]
submitScan -> [resolveRole_, processScan_, appendLog_]
getMesinList -> []                                        # baca MESIN_LIST langsung
getTspStock -> [computeTspStock_]
getMesinStock -> [computeMesinStock_]
getValidatorData -> [computeValidator_]
getRecentReceipts -> [computeRecentReceipts_]
```

## 7. Fungsi "Akar" vs "Daun"

- **Akar panggilan (dipanggil client, tidak dipanggil fungsi server lain)**: semua fungsi
  di `Code.js` (`doGet`, `login`, `submitScan`, `getMesinList`, `getTspStock`,
  `getMesinStock`, `getValidatorData`, `getRecentReceipts`).
- **Daun (tidak memanggil fungsi lain, hanya operasi dasar)**: `getSpreadsheet_`,
  `toDateOrNull_`, `padSeq_`, `formatDateLabel_`, `getLoginAttemptCount_`,
  `clearLoginAttempts_`, `roleFromJabatan_`, `bucketAdd_`, `parseMb51Timestamp_`.
- **Fungsi "hub"** (dipanggil dari banyak tempat, paling kritikal kalau berubah):
  `getSheet_` (dipanggil ~10 fungsi), `getHeaderMap_` (~6 fungsi), `findBarcodeRow_`
  (4 fungsi di BarcodeService.js), `getShiftBounds_` (4 fungsi lintas 2 file).
