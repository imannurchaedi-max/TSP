# Function Mapping — TSP Modul

Pemetaan tiap fungsi: file asal, parameter, apa yang dipanggil (calls), dan siapa yang
memanggilnya (called by). Konvensi penamaan: fungsi berakhiran `_` = private/internal
(tidak dipanggil langsung dari client). Fungsi tanpa `_` di `Code.js` = entry point yang
dipanggil client lewat `google.script.run`.

---

## Config.js — konstanta (tidak ada fungsi)

| Nama | Isi |
|---|---|
| `SPREADSHEET_ID` | ID spreadsheet utama TSP MODUL |
| `KARYAWAN_SPREADSHEET_ID` / `KARYAWAN_SHEET_NAME` | ID + nama tab sheet KARYAWAN |
| `JABATAN_ROLE_MAP` | Peta Jabatan → role (`tsp`/`operator`) |
| `SHEET_NAMES` | Nama semua sheet (`BARCODE`, `MATERIAL_MASTER`, `LOG`, `MB51`, `WRM_INCOMING`, `REPRINT`, `RESERVASI` → menunjuk ke `BARCODE OUTBOUND WRM`, `STOCK_TSP`, `STOCK_MESIN`, `MIN_MAX`) |
| `BARCODE_COLUMNS` | Urutan header sheet "BARCODE MATERIAL PRODUKSI" (13 kolom) |
| `REPRINT_COLUMNS` | Urutan header sheet "REPRINT BARCODE" (7 kolom) |
| `LOG_COLUMNS` | Urutan header sheet "Log Aktivitas Barcode" |
| `MESIN_LIST` | Daftar 6 mesin aktif (`BHP 1`..`5`, `AHP 1`) |
| `EVENTS` | Definisi 6 event checkpoint (`terima_wrm`, `kirim_mesin`, `terima_operator`, `consume_operator`, `retur_dari_mesin`, `retur_ke_wrm`) |

---

## SheetService.js — helper generik akses sheet

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `getSpreadsheet_()` | — | `SpreadsheetApp.openById` | `getSheet_` |
| `getSheet_(name)` | nama sheet | `getSpreadsheet_` | Hampir semua fungsi yang butuh akses sheet |
| `ensureSheetsReady_()` | — | `getSheet_`, `getSpreadsheet_` | `processScan_` (BarcodeService.js) |
| `getHeaderMap_(sheet)` | objek Sheet | — | `findRowByColumnValue_`, `appendBarcodeRow_`, `appendReprintRow_`, `updateBarcodeCell_`, `getMaterialMap_`, `getNextChildSequence_`, `readAllBarcodeRows_`, `getReservasiList_`, `validateMidInReservasi_` |
| `findRowByColumnValue_(sheet, columnName, value)` | sheet, nama kolom, nilai dicari | `getHeaderMap_` | `findBarcodeRow_`, `lookupWrmIncoming_` |
| `findBarcodeRow_(barcodeText)` | teks barcode | `getSheet_`, `getHeaderMap_` | `classifyBarcode_`, `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_` |
| `lookupWrmIncoming_(kodeUnik)` | Kode Unik | `getSheet_`, `findRowByColumnValue_` | `handleTerimaWrm_` |
| `parseSapDate_(val, tz)` | nilai sel, zona waktu | `Session.getScriptTimeZone` | `getReservasiList_` |
| `getReservasiList_()` | — | `getSheet_`, `getHeaderMap_`, `parseSapDate_` | `getReservasiOptions` (Code.js), `validateMidInReservasi_` — Membaca dari BARCODE OUTBOUND WRM (kolom `Tanggal Outbound`, `MATDOC RESERVASI`, `MID`, `DESC`, `QTY`, `UOM`, `Shift`) |
| `validateMidInReservasi_(noReservasi, targetMid)` | no. reservasi, MID | `getReservasiList_` | `handleTerimaWrm_` |
| `appendBarcodeRow_(rowObject)` | objek {kolom: nilai} | `getSheet_`, `getHeaderMap_` | `handleTerimaWrm_`, `handleKirimMesin_` |
| `appendReprintRow_(rowObject)` | objek {kolom: nilai} | `getSheet_`, `getHeaderMap_` | `handleKirimMesin_` |
| `updateBarcodeCell_(rowIndex, columnName, value)` | index baris, nama kolom, nilai | `getSheet_`, `getHeaderMap_` | `handleChildCheckpoint_` |
| `appendLog_(logObject)` | objek log | `getSheet_` | `submitScan` (Code.js) |

---

## MaterialService.js — lookup master material + sesi "Material List"

Sumber sheet: `SHEET_NAMES.MATERIAL_MASTER` = `'MATERIAL MASTER'` (sebelumnya `'MID EXISTING'`,
lihat `OLD_MATERIAL_MASTER_SHEET_NAME_` & `migrateMaterialMasterIfEmpty_`).

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `resolveDeskCol_(headerMap)` | header map sheet | — | `getMaterialList_`, `getMaterialMap_`, `saveMaterialMaster_`, `saveMaterialBatch_`, `migrateMaterialMasterIfEmpty_` — terima header `"Deskripsi"` ATAU `"MATERIAL DESCRIPTION"` |
| `getSupplierMap_()` | — | `getMaterialMap_` (fallback), `getSheet_`, `getHeaderMap_` (prioritas: histori `BARCODE OUTBOUND WRM`) | `computeTspStock_`, `computeMesinStock_`, `computeValidator_`, `computeShiftReceipts_`, `computeShiftDispatches_`, `computeOperatorReceipts_`, `computeOperatorConsumption_`, `computePortalHistory_`, `getMinMaxSettings` |
| `getMaterialList_()` | — | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_` | `executeShiftRollover_`, `tarikStokAwalShift_`, `getMaterialListApi` (Code.js) — return `[{mid, deskripsi, uom, supplier}]` |
| `getMaterialMap_()` | — | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_` | `getSupplierMap_`, `computeTspStock_` (fallback), `computeValidator_`, `getMinMaxSettings`, `saveMinMaxSetting`, `saveMinMaxBatch_` |
| `saveMaterialMaster_(nik, mid, deskripsi, uom, supplier)` | NIK aktor, MID, deskripsi, UOM, supplier | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_`, `normalizeMid_` | `saveMaterialApi` (Code.js) — insert/update 1 baris; **selalu menimpa** field dgn nilai baru (beda dari `upsertMaterialMaster_` lama yang sudah dihapus); auto-tambah kolom "Supplier" kalau belum ada; invalidate 3 cache |
| `saveMaterialBatch_(nik, items)` | NIK aktor, array `{mid,deskripsi,uom,supplier}` | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_`, `normalizeMid_` | `saveMaterialBatchApi` (Code.js) — import CSV Material List |
| `isMidUsedAnywhere_(mid)` | MID | `getSheet_`, `getHeaderMap_`, `normalizeMid_` | `deleteMaterial_` — cek kolom MID di STOCK_TSP, STOCK_MESIN, BARCODE, WRM_INCOMING |
| `deleteMaterialMaster_(mid)` | MID | `getSheet_`, `getHeaderMap_`, `normalizeMid_` | `deleteMaterial_`, `deleteMinMaxSetting_` *(tidak lagi dipanggil sejak v95 — lihat StockService.js)* — hapus 1 baris dari Material Master |
| `deleteMaterial_(nik, mid)` | NIK aktor, MID | `isMidUsedAnywhere_`, `deleteMaterialMaster_`, `getMinMaxSheet_` (StockService.js) | `deleteMaterialApi` (Code.js) — tolak kalau MID pernah dipakai di transaksi; kalau berhasil, cascade-delete semua baris MIN MAX STOCK terkait MID tsb |
| `migrateMaterialMasterIfEmpty_()` | — | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_` | `getMaterialListApi` (Code.js) — migrasi sekali-jalan dari `MID EXISTING` ke `MATERIAL MASTER` kalau sheet baru masih kosong |

---

## AuthService.js — login NIK+Password

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `getKaryawanRows_()` | — | `readKaryawanRowsFromCache_`, `writeKaryawanRowsToCache_` | `findKaryawanByNik_` |
| `findKaryawanByNik_(nik)` | NIK | `getKaryawanRows_` | `login_`, `resolveRole_` |
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
| `getShiftBounds_(date)` | Date | — | `getShift_`, `computeTspStock_`, `computeMesinStockBreakdown_`, `computeShiftReceipts_`, `computeShiftDispatches_`, `computeValidator_` |
| `formatTimestamp_(value)` | Date/nilai sel | — | `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_` |
| `getCellValue_(rowResult, columnName)` | hasil row, nama kolom | — | `classifyBarcode_`, `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_` |
| `processScan_(barcodeText, eventCode, mesinCode, jumlah, noReservasi, actorEmail, role)` | data scan lengkap | `ensureSheetsReady_`, `handleTerimaWrm_`, `handleKirimMesin_`, `classifyBarcode_`, `handleChildCheckpoint_` | `submitScan` (Code.js) |
| `handleTerimaWrm_(raw, noReservasi, now)` | kode barcode, no. reservasi, waktu | `findBarcodeRow_`, `lookupWrmIncoming_`, `validateMidInReservasi_`, `formatTimestamp_`, `getCellValue_`, `getShift_`, `appendBarcodeRow_` | `processScan_` |
| `handleKirimMesin_(raw, mesinCode, jumlah, now)` | kode induk, mesin, qty, waktu | `findBarcodeRow_`, `getCellValue_`, `getNextChildSequence_`, `padSeq_`, `getShift_`, `appendBarcodeRow_`, `appendReprintRow_` | `processScan_` |
| `handleChildCheckpoint_(classified, eventDef, now)` | klasifikasi, eventDef, waktu | `findBarcodeRow_`, `getCellValue_`, `formatTimestamp_`, `updateBarcodeCell_` | `processScan_` |

---

## StockService.js — perhitungan stock & side panels

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `readAllBarcodeRows_()` | — | `getSheet_`, `getHeaderMap_`, `toDateOrNull_` | `computeTspStock_`, `computeMesinStockBreakdown_`, `computeShiftReceipts_`, `computeShiftDispatches_`, `computeOperatorReceipts_`, `computeOperatorConsumption_` |
| `computeTspStock_(now)` | waktu referensi | `getShiftBounds_`, `readAllBarcodeRows_`, `seedAccFromMaterialMap_`, `bucketAdd_` | `getTspStock` (Code.js), `computeValidator_` |
| `computeMesinStockBreakdown_(now)` | waktu referensi | `getShiftBounds_`, `readAllBarcodeRows_`, `getMaterialMap_` | `computeMesinStock_` |
| `computeShiftReceipts_(now)` | waktu referensi | `getShiftBounds_`, `readAllBarcodeRows_`, `getSupplierMap_` | `getShiftReceipts` (Code.js) |
| `computeShiftDispatches_(now)` | waktu referensi | `getShiftBounds_`, `readAllBarcodeRows_`, `getSupplierMap_` | `getShiftDispatches` (Code.js) |
| `computeValidator_(now)` | waktu referensi | `getShiftBounds_`, `computeTspStock_`, `getSheet_`, `parseMb51Timestamp_`, `getSupplierMap_` | `getValidatorData` (Code.js) |
| `incrementStockCell_(sheetName, mid, colName, amountToAdd, dateOverride)` | nama sheet (STOCK TSP/MESIN), MID, nama kolom, jumlah, override tanggal | `getShiftBounds_`, `getSheet_`, `getHeaderMap_`, `normalizeMid_` | `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_` (BarcodeService.js) — **return `true`/`false`** (bukan tanpa nilai balik): `false` kalau tidak ada baris shift aktif yang cocok (mis. Tarik Stok Awal Shift belum dilakukan), caller WAJIB cek ini dan tampilkan warning ke operator, jangan diam-diam ditelan |
| `saveMinMaxSetting(nik, mid, lokasi, minStock, maxStock)` | NIK aktor, MID, lokasi, min, max | `getMinMaxSheet_`, `getMaterialMap_`, `normalizeMid_` | `saveMinMaxSettingApi` (Code.js) — **sejak v95** menolak MID yang belum terdaftar di Material Master (tidak lagi auto-register lewat `upsertMaterialMaster_`, fungsi itu sudah dihapus); parameter `deskripsi`/`uom`/`supplier` juga sudah dihapus dari signature (pindah ke sesi Material List) |
| `saveMinMaxBatch_(nik, items)` | NIK aktor, array `{mid,lokasi,minStock,maxStock}` | `getMinMaxSheet_`, `getMaterialMap_`, `normalizeMid_` | `saveMinMaxBatchApi` (Code.js) — import CSV; baris dengan MID belum terdaftar di Material Master di-skip & dilaporkan di pesan hasil |
| `deleteMinMaxSetting_(nik, mid, lokasi)` | NIK aktor, MID, lokasi | `getMinMaxSheet_`, `normalizeMid_` | `deleteMinMaxSettingApi` (Code.js) — hapus 1 baris threshold MID+Lokasi; **sejak v95 tidak lagi** menyentuh Material Master (dulu sempat cascade-delete di v93) |
| `getMinMaxSettings()` | — | `getMinMaxSheet_`, `getMaterialMap_`, `getSupplierMap_` | `getMinMaxSettingsApi` (Code.js) — tiap baris sekarang termasuk field `uom` |
| `ensureMidInActiveShift_(mid, actorNik, actorNama)` | MID, NIK aktor, nama aktor | `getShiftBounds_`, `getSheet_`, `getHeaderMap_`, `getRealLastRowAndTrim_`, `getMaterialMap_`, `normalizeMid_` | `saveMaterialApi`, `saveMaterialBatchApi` (Code.js) — **v98**: sisip 1 baris baru untuk MID ke blok shift AKTIF sekarang (STOCK TSP + STOCK MESIN 6 area, stok awal 0), supaya material baru langsung kepakai tanpa nunggu shift berikutnya. Idempotent; no-op kalau MID sudah ada di shift aktif ATAU shift aktif belum pernah ditarik sama sekali (return `{injected: bool, reason?}`) |

---

## Code.js — entry point web app

| Fungsi | Parameter | Calls | Dipanggil dari client |
|---|---|---|---|
| `doGet(e)` | request Apps Script | `HtmlService.createTemplateFromFile('Index')` | Browser (`/exec`) |
| `login(nik, password)` | NIK, password | `login_` (AuthService.js) | `Index.html` |
| `submitScan(barcodeText, eventCode, mesinCode, jumlah, noReservasi, nik)` | data scan | `resolveRole_`, `processScan_`, `appendLog_` | `Scanner.html` |
| `getReservasiOptions()` | — | `getReservasiList_` | `Scanner.html` |
| `getTspStock()` | — | `computeTspStock_` | `Index.html` |
| `getMesinStock(mesinCode)` | kode mesin | `computeMesinStock_` | `Index.html` |
| `getShiftReceipts()` | — | `computeShiftReceipts_` | `Index.html` |
| `getShiftDispatches()` | — | `computeShiftDispatches_` | `Index.html` |
| `getValidatorData()` | — | `computeValidator_` | `Index.html` |
| `getMinMaxSettingsApi()` | — | `getMinMaxSettings` (StockService.js) | `Index.html` — sesi "Min/Max Stock" di tab Material Master |
| `saveMinMaxSettingApi(nik, mid, lokasi, minStock, maxStock)` | NIK, MID, lokasi, min, max | `saveMinMaxSetting` (StockService.js) | `Index.html` — modal `modal-minmax-edit` |
| `saveMinMaxBatchApi(nik, items)` | NIK, array items | `saveMinMaxBatch_` (StockService.js) | `Index.html` — Upload CSV sesi Min/Max Stock |
| `deleteMinMaxSettingApi(nik, mid, lokasi)` | NIK, MID, lokasi | `deleteMinMaxSetting_` (StockService.js) | `Index.html` — tombol Hapus sesi Min/Max Stock |
| `getMaterialListApi()` | — | `migrateMaterialMasterIfEmpty_`, `getMaterialList_` (MaterialService.js) | `Index.html` — sesi "Material List" di tab Material Master |
| `saveMaterialApi(nik, mid, deskripsi, uom, supplier)` | NIK, MID, deskripsi, UOM, supplier | `saveMaterialMaster_` (MaterialService.js), `resolveRole_` (AuthService.js), `ensureMidInActiveShift_` (StockService.js) | `Index.html` — modal `modal-material-edit`; sejak v98 juga menyisipkan MID ke shift aktif kalau berhasil disimpan |
| `saveMaterialBatchApi(nik, items)` | NIK, array items | `saveMaterialBatch_` (MaterialService.js), `resolveRole_` (AuthService.js), `ensureMidInActiveShift_` (StockService.js) | `Index.html` — Upload CSV sesi Material List; sejak v98 tiap MID baru di batch juga disisip ke shift aktif |
| `deleteMaterialApi(nik, mid)` | NIK, MID | `deleteMaterial_` (MaterialService.js) | `Index.html` — tombol Hapus sesi Material List |
