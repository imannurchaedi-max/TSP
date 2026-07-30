# Function Mapping — TSP Modul

Pemetaan tiap fungsi: file asal, parameter, apa yang dipanggil (calls), dan siapa yang
memanggilnya (called by). Konvensi penamaan: fungsi berakhiran `_` = private/internal
(tidak dipanggil langsung dari client). Fungsi tanpa `_` di `Code.js` = entry point yang
dipanggil client lewat `google.script.run`.

Apps Script tidak punya module/import system — semua file `.js` server-side berbagi 1
namespace global. "Calls"/"Called by" di bawah merefleksikan **relasi pemanggilan fungsi**,
bukan import file.

---

## Config.js — konstanta (tidak ada fungsi)

| Nama | Isi |
|---|---|
| `SPREADSHEET_ID` | ID spreadsheet utama TSP MODUL |
| `KARYAWAN_SPREADSHEET_ID` / `KARYAWAN_SHEET_NAME` | ID + nama tab sheet KARYAWAN (spreadsheet terpisah) |
| `JABATAN_ROLE_MAP` | Peta Jabatan → role (`tsp`/`operator`) |
| `SHEET_NAMES` | Nama semua sheet yang dipakai (BARCODE, MATERIAL_MASTER, LOG, MB51, WRM_INCOMING) |
| `BARCODE_COLUMNS` | Urutan header sheet "Barcode Material Produksi" |
| `LOG_COLUMNS` | Urutan header sheet "Log Aktivitas Barcode" |
| `MESIN_LIST` | Daftar 6 mesin aktif |
| `SHIFT_WINDOWS` | **Tidak dipakai (dead config)** — lihat catatan di ARSITEKTUR.md §11 |
| `EVENTS` | Definisi 6 event checkpoint (prerequisite, column, role, requiresMesin/Jumlah, label) |

---

## SheetService.js — helper generik akses sheet

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `getSpreadsheet_()` | — | `SpreadsheetApp.openById` | `getSheet_` |
| `getSheet_(name)` | nama sheet | `getSpreadsheet_` | Hampir semua fungsi yang butuh akses sheet (lihat di bawah) |
| `ensureSheetsReady_()` | — | `getSheet_`, `getSpreadsheet_` | `processScan_` (BarcodeService.js) |
| `getHeaderMap_(sheet)` | objek Sheet | — | `findRowByColumnValue_`, `appendBarcodeRow_`, `updateBarcodeCell_`, `getMaterialMap_`, `getNextChildSequence_`, `readAllBarcodeRows_` |
| `findRowByColumnValue_(sheet, columnName, value)` | sheet, nama kolom, nilai dicari | `getHeaderMap_` | `findBarcodeRow_`, `lookupWrmIncoming_` |
| `findBarcodeRow_(barcodeText)` | teks barcode | `getSheet_`, `findRowByColumnValue_` | `classifyBarcode_`, `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_` |
| `lookupWrmIncoming_(kodeUnik)` | Kode Unik | `getSheet_`, `findRowByColumnValue_` | `handleTerimaWrm_` |
| `appendBarcodeRow_(rowObject)` | objek {kolom: nilai} | `getSheet_`, `getHeaderMap_` | `handleTerimaWrm_`, `handleKirimMesin_` |
| `updateBarcodeCell_(rowIndex, columnName, value)` | index baris, nama kolom, nilai | `getSheet_`, `getHeaderMap_` | `handleChildCheckpoint_` |
| `appendLog_(logObject)` | objek log | `getSheet_` | `submitScan` (Code.js) |

---

## MaterialService.js — lookup master material

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `getMaterialMap_()` | — | `getSheet_`, `getHeaderMap_` | `lookupMaterial_`, `seedAccFromMaterialMap_` (StockService.js), `computeValidator_` (StockService.js) |
| `lookupMaterial_(mid)` | MID | `getMaterialMap_` | **Tidak dipanggil di manapun** (dead code sejak Fase 4 — lihat ARSITEKTUR.md §11) |

Cache: `materialCache_` (variable global, cache per-eksekusi, bukan `CacheService`).

---

## AuthService.js — login NIK+Password

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `getKaryawanRows_()` | — | `readKaryawanRowsFromCache_`, `writeKaryawanRowsToCache_` | `findKaryawanByNik_` |
| `readKaryawanRowsFromCache_(cache)` | CacheService instance | — | `getKaryawanRows_` |
| `writeKaryawanRowsToCache_(cache, rows)` | CacheService instance, array baris | — | `getKaryawanRows_` |
| `findKaryawanByNik_(nik)` | NIK | `getKaryawanRows_` | `login_`, `resolveRole_` |
| `getLoginAttemptCount_(nik)` | NIK | — | `login_`, `registerLoginFailure_` |
| `registerLoginFailure_(nik)` | NIK | `getLoginAttemptCount_` | `login_` |
| `clearLoginAttempts_(nik)` | NIK | — | `login_` |
| `roleFromJabatan_(jabatan)` | teks jabatan | — | `login_`, `resolveRole_` |
| `login_(nik, password)` | NIK, password | `getLoginAttemptCount_`, `findKaryawanByNik_`, `registerLoginFailure_`, `roleFromJabatan_`, `clearLoginAttempts_` | `login` (Code.js) |
| `resolveRole_(nik)` | NIK | `findKaryawanByNik_`, `roleFromJabatan_` | `submitScan` (Code.js) |

---

## BarcodeService.js — state machine scan

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `padSeq_(n)` | angka urutan | — | `handleKirimMesin_` |
| `classifyBarcode_(raw)` | teks barcode | `findBarcodeRow_`, `getCellValue_` | `processScan_` |
| `getNextChildSequence_(parentBarcode)` | kode induk | `getSheet_`, `getHeaderMap_` | `handleKirimMesin_` |
| `getShift_(date)` | Date | `getShiftBounds_` | `handleTerimaWrm_`, `handleKirimMesin_` |
| `getShiftBounds_(date)` | Date | — | `getShift_`; `computeTspStock_`, `computeMesinStock_`, `computeValidator_` (StockService.js) |
| `formatTimestamp_(value)` | Date/nilai sel | — | `handleTerimaWrm_`, `handleChildCheckpoint_` |
| `getCellValue_(rowResult, columnName)` | hasil `findRowByColumnValue_`, nama kolom | — | `classifyBarcode_`, `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_` |
| `processScan_(barcodeText, eventCode, mesinCode, jumlah, actorEmail, role)` | data scan lengkap | `ensureSheetsReady_`, `handleTerimaWrm_`, `handleKirimMesin_`, `classifyBarcode_`, `handleChildCheckpoint_` | `submitScan` (Code.js) |
| `handleTerimaWrm_(raw, now)` | kode barcode, waktu | `findBarcodeRow_`, `lookupWrmIncoming_`, `formatTimestamp_`, `getCellValue_`, `getShift_`, `appendBarcodeRow_` | `processScan_` |
| `handleKirimMesin_(raw, mesinCode, jumlah, now)` | kode induk, mesin, qty, waktu | `findBarcodeRow_`, `getCellValue_`, `getNextChildSequence_`, `padSeq_`, `getShift_`, `appendBarcodeRow_` | `processScan_` |
| `handleChildCheckpoint_(classified, eventDef, now)` | hasil klasifikasi, definisi event, waktu | `findBarcodeRow_`, `getCellValue_`, `formatTimestamp_`, `updateBarcodeCell_` | `processScan_` |

---

## StockService.js — perhitungan stock & validator

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `toDateOrNull_(value)` | nilai sel | — | `readAllBarcodeRows_` |
| `readAllBarcodeRows_()` | — | `getSheet_`, `getHeaderMap_`, `toDateOrNull_` | `computeTspStock_`, `computeMesinStock_`, `computeRecentReceipts_` |
| `seedAccFromMaterialMap_()` | — | `getMaterialMap_` (MaterialService.js) | `computeTspStock_`, `computeMesinStock_` |
| `bucketAdd_(acc, mid, deskripsi, field, qty, ts, shiftStart)` | accumulator, data pergerakan | — | `computeTspStock_`, `computeMesinStock_` |
| `computeTspStock_(now)` | waktu referensi | `getShiftBounds_`, `readAllBarcodeRows_`, `seedAccFromMaterialMap_`, `bucketAdd_`, `formatDateLabel_` | `getTspStock` (Code.js), `computeValidator_` |
| `computeMesinStock_(mesinCode, now)` | kode mesin, waktu | `getShiftBounds_`, `readAllBarcodeRows_`, `seedAccFromMaterialMap_`, `bucketAdd_`, `formatDateLabel_` | `getMesinStock` (Code.js) |
| `formatDateLabel_(date)` | Date | — | `computeTspStock_`, `computeMesinStock_` |
| `computeRecentReceipts_(limit)` | jumlah maks baris | `readAllBarcodeRows_` | `getRecentReceipts` (Code.js) |
| `parseMb51Timestamp_(dateCell, timeCell, tz)` | sel tanggal+jam MB51 | — | `computeValidator_` |
| `computeValidator_(now)` | waktu referensi | `getShiftBounds_`, `computeTspStock_`, `getSheet_`, `parseMb51Timestamp_`, `getMaterialMap_` | `getValidatorData` (Code.js) |

---

## Code.js — entry point web app (dipanggil client via `google.script.run`)

| Fungsi | Parameter | Calls | Dipanggil dari client |
|---|---|---|---|
| `doGet(e)` | request Apps Script | `HtmlService.createTemplateFromFile('Index')` | Browser (URL `/exec`) |
| `include(filename)` | nama file partial | `HtmlService.createHtmlOutputFromFile` | Scriptlet `<?!= include(...) ?>` di Index.html |
| `login(nik, password)` | NIK, password | `login_` (AuthService.js) | `Index.html` (submit form login) |
| `submitScan(barcodeText, eventCode, mesinCode, jumlah, nik)` | data scan | `resolveRole_` (AuthService.js), `processScan_` (BarcodeService.js), `appendLog_` (SheetService.js) | `Scanner.html` (`onScanSuccess`) |
| `getMesinList()` | — | `MESIN_LIST` (Config.js) | `Index.html` (mesin picker), `Scanner.html` (dropdown kirim_mesin) |
| `getTspStock()` | — | `computeTspStock_` | `Index.html` (`loadStockTab`, role tsp) |
| `getMesinStock(mesinCode)` | kode mesin | `computeMesinStock_` | `Index.html` (`loadStockTab`, role operator) |
| `getValidatorData()` | — | `computeValidator_` | `Index.html` (`loadValidatorTab`) |
| `getRecentReceipts()` | — | `computeRecentReceipts_` | `Index.html` (`loadRecentReceipts`) |

---

## Index.html — client JS (halaman utama)

| Fungsi | Peran |
|---|---|
| `showLogin()` / `showApp(user)` | Toggle tampilan login vs app shell |
| `openSidebar()` / `closeSidebar()` | Toggle drawer sidebar (mobile/tablet sempit) |
| `setupMesinPicker()` | Isi dropdown mesin (role operator) via `getMesinList()`, lalu load tab Stock |
| `switchTab(tab)` | Ganti tab aktif (Stock/Scan/Validasi), update judul, panggil loader data tab |
| `renderTable(containerId, rows, columns)` | Render tabel HTML generik dari data + definisi kolom |
| `loadStockTab()` | Ambil data stock (`getTspStock`/`getMesinStock`) & render |
| `loadRecentReceipts()` | Ambil & render panel "Penerimaan Terakhir" (`getRecentReceipts`) |
| `loadValidatorTab()` | Ambil & render tabel Validasi (`getValidatorData`) |
| `tryRestoreSession()` (IIFE) | Pulihkan sesi dari `sessionStorage` saat reload halaman |

Variabel global yang **dibagi** dengan `Scanner.html` (satu halaman, satu scope JS):
`PAGE_ROLE`, `PAGE_EVENTS`, `CURRENT_NIK` (di-set di `showApp()`, dibaca oleh
`renderActions()`/`onScanSuccess()` di Scanner.html).

## Scanner.html — client JS (widget scan, partial di dalam tab Scan)

| Fungsi | Peran |
|---|---|
| `renderActions()` | Render tombol aksi dari `PAGE_EVENTS` |
| `selectEvent(ev)` | Tentukan perlu form tambahan (Mesin/Jumlah) atau langsung scan |
| `startScanner()` | Tampilkan layar ambil-foto |
| `handleCapturedFile(file)` | Decode barcode dari foto (`Html5Qrcode.scanFile`) |
| `onScanSuccess(decodedText)` | Panggil `submitScan` (Code.js) via `google.script.run` |
| `showResult(success, message, childBarcode)` | Tampilkan hasil scan (sukses/gagal + kode reprint kalau ada) |

---

## Ringkasan Alur Panggilan (contoh kasus)

**Login:**
`Index.html (submit)` → `Code.js: login()` → `AuthService.js: login_()` →
`findKaryawanByNik_()` → `getKaryawanRows_()` → (cache atau) sheet KARYAWAN.

**Scan "Terima dari WRM":**
`Scanner.html: onScanSuccess()` → `Code.js: submitScan()` → `resolveRole_()` (validasi
ulang role) → `processScan_()` → `handleTerimaWrm_()` → `lookupWrmIncoming_()` (sheet
BARCODE INCOMING WRM) → `appendBarcodeRow_()` (sheet Barcode Material Produksi) →
`appendLog_()` (sheet Log Aktivitas Barcode).

**Load tab Stock (role TSP):**
`Index.html: loadStockTab()` → `Code.js: getTspStock()` → `computeTspStock_()` →
`readAllBarcodeRows_()` + `seedAccFromMaterialMap_()` (→ `getMaterialMap_()`, sheet
MID EXISTING) → agregasi ledger → render tabel.
