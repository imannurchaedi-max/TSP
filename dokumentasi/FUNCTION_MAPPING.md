# Function Mapping — TSP Modul

Pemetaan tiap fungsi: file asal, parameter, apa yang dipanggil (calls), dan siapa yang
memanggilnya (called by). Konvensi penamaan: fungsi berakhiran `_` = private/internal
(tidak dipanggil langsung dari client). Fungsi tanpa `_` di `Code.js`/`ApiService.js` =
entry point yang dipanggil client (`google.script.run` dari web app, atau `doPost` dari
app Android — lihat §8).

Daftar ini diverifikasi langsung terhadap `grep -n "^function " Active/*.js` (bukan
ditulis dari ingatan) — kalau nama fungsi berubah lagi di masa depan, jalankan ulang
grep itu untuk verifikasi cepat sebelum percaya isi dokumen ini.

---

## 1. Config.js — konstanta (tidak ada fungsi)

| Nama | Isi |
|---|---|
| `SPREADSHEET_ID` | ID spreadsheet utama TSP MODUL |
| `KARYAWAN_SPREADSHEET_ID` / `KARYAWAN_SHEET_NAME` | ID + nama tab sheet KARYAWAN |
| `JABATAN_ROLE_MAP` | Peta Jabatan → role (`tsp`/`operator`/`spv`) |
| `SHEET_NAMES` | Nama semua sheet (`BARCODE`, `MATERIAL_MASTER`, `LOG`, `MB51`, `WRM_INCOMING`, `REPRINT`, `RESERVASI` → menunjuk ke `BARCODE OUTBOUND WRM`, `STOCK_TSP`, `STOCK_MESIN`, `MIN_MAX`) |
| `BARCODE_COLUMNS` | Urutan header sheet "BARCODE MATERIAL PRODUKSI" (13 kolom) |
| `REPRINT_COLUMNS` | Urutan header sheet "REPRINT BARCODE" (7 kolom) |
| `LOG_COLUMNS` | Urutan header sheet "Log Aktivitas Barcode" |
| `MESIN_LIST` | Daftar 6 mesin aktif (`BHP 1`..`5`, `AHP 1`) |
| `EVENTS` | Definisi 6 event checkpoint (`terima_wrm`, `kirim_mesin`, `terima_operator`, `consume_operator`, `retur_dari_mesin`, `retur_ke_wrm`) |

---

## 2. SheetService.js — helper generik akses sheet

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `getSpreadsheet_()` | — | `SpreadsheetApp.openById` | `getSheet_` |
| `getSheet_(name)` | nama sheet | `getSpreadsheet_` | Hampir semua fungsi yang butuh akses sheet |
| `ensureSheetsReady_()` | — | `getSheet_`, `getSpreadsheet_` | `processScan_` (BarcodeService.js) |
| `getHeaderMap_(sheet)` | objek Sheet | — | Hampir semua fungsi yang baca/tulis kolom by-name |
| `findRowByColumnValue_(sheet, columnName, value)` | sheet, nama kolom, nilai dicari | `getHeaderMap_` | `findBarcodeRow_`, `lookupWrmIncoming_` |
| `findBarcodeRow_(barcodeText)` | teks barcode | `getSheet_`, `getHeaderMap_` | `classifyBarcode_`, `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_`, `getReprintData_` |
| `lookupWrmIncoming_(kodeUnik)` | Kode Unik | `getSheet_`, `findRowByColumnValue_` | `handleTerimaWrm_`, `getReprintData_` (fallback qty) |
| `parseSapDate_(val, tz)` | nilai sel, zona waktu | `Session.getScriptTimeZone` | `getReservasiList_` |
| `getReservasiList_()` | — | `getSheet_`, `getHeaderMap_`, `parseSapDate_` | `getReservasiOptions` (Code.js), `validateMidInReservasi_` — baca dari BARCODE OUTBOUND WRM (kolom `Tanggal Outbound`, `MATDOC RESERVASI`, `MID`, `DESC`, `QTY`, `UOM`, `Shift`) |
| `validateMidInReservasi_(noReservasi, targetMid)` | no. reservasi, MID | `getReservasiList_` | `handleTerimaWrm_` |
| `appendBarcodeRow_(rowObject)` | objek {kolom: nilai} | `getSheet_`, `getHeaderMap_` | `handleTerimaWrm_`, `handleKirimMesin_` |
| `appendReprintRow_(rowObject)` | objek {kolom: nilai} | `getSheet_`, `getHeaderMap_` | `handleKirimMesin_` |
| `updateBarcodeCell_(rowIndex, columnName, value)` | index baris, nama kolom, nilai | `getSheet_`, `getHeaderMap_` | `handleChildCheckpoint_` |
| `appendLog_(logObject)` | objek log | `getSheet_` | `submitScan` (Code.js) |
| `queryReprintSheet_(query)` | substring pencarian | `getSheet_`, `getHeaderMap_` | *(tidak ada caller aktif saat ini — `getReprintData` Code.js pakai `getReprintData_` di BarcodeService.js, bukan fungsi ini. Kandidat dead code, dipertahankan kalau-kalau dipakai lagi utk pencarian substring bebas.)* |

---

## 3. MaterialService.js — lookup master material + sesi "Material List"

Sumber sheet: `SHEET_NAMES.MATERIAL_MASTER` = `'MATERIAL MASTER'` (sebelumnya `'MID EXISTING'`,
lihat `OLD_MATERIAL_MASTER_SHEET_NAME_` & `migrateMaterialMasterIfEmpty_`).

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `resolveDeskCol_(headerMap)` | header map sheet | — | `getMaterialList_`, `getMaterialMap_`, `saveMaterialMaster_`, `saveMaterialBatch_`, `migrateMaterialMasterIfEmpty_` — terima header `"Deskripsi"` ATAU `"MATERIAL DESCRIPTION"` |
| `getSupplierMap_()` | — | `getMaterialMap_` (fallback), `getSheet_`, `getHeaderMap_` (prioritas: histori `BARCODE OUTBOUND WRM`) | `computeTspStock_`, `computeMesinStock_`, `computeValidator_`, `computeShiftReceipts_`, `computeShiftDispatches_`, `computeOperatorReceipts_`, `computeOperatorConsumption_`, `computeHistoricalTspStock_`, `getMinMaxSettings` |
| `getMaterialList_()` | — | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_` | `executeShiftRollover_`, `getMaterialListApi` (Code.js) — return `[{mid, deskripsi, uom, supplier, status}]` |
| `getMaterialMap_()` | — | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_` | `getSupplierMap_`, `computeTspStock_`/`computeMesinStock_` (fallback), `computeTspMesinMonitoring_`, `computeValidator_`, `getMinMaxSettings`, `saveMinMaxSetting`, `saveMinMaxBatch_`, `ensureMidInActiveShift_` |
| `saveMaterialMaster_(nik, mid, deskripsi, uom, supplier, status)` | NIK aktor, MID, deskripsi, UOM, supplier, status | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_`, `normalizeMid_` | `saveMaterialApi` (Code.js) — insert/update 1 baris; **selalu menimpa** field dgn nilai baru; auto-tambah kolom "Supplier"/"Status" kalau belum ada; invalidate 3 cache |
| `saveMaterialBatch_(nik, items)` | NIK aktor, array `{mid,deskripsi,uom,supplier,status}` | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_`, `normalizeMid_` | `saveMaterialBatchApi` (Code.js) — import CSV Material List |
| `isMidUsedAnywhere_(mid)` | MID | `getSheet_`, `getHeaderMap_`, `normalizeMid_` | `deleteMaterial_` — cek kolom MID di STOCK_TSP, STOCK_MESIN, BARCODE, WRM_INCOMING |
| `deleteMaterialMaster_(mid)` | MID | `getSheet_`, `getHeaderMap_`, `normalizeMid_` | `deleteMaterial_` — hapus 1 baris dari Material Master |
| `deleteMaterial_(nik, mid)` | NIK aktor, MID | `isMidUsedAnywhere_`, `deleteMaterialMaster_`, `getMinMaxSheet_` (StockService.js) | `deleteMaterialApi` (Code.js) — tolak kalau MID pernah dipakai di transaksi; kalau berhasil, cascade-delete semua baris MIN MAX STOCK terkait MID tsb |
| `migrateMaterialMasterIfEmpty_()` | — | `getSheet_`, `getHeaderMap_`, `resolveDeskCol_` | `getMaterialListApi` (Code.js) — migrasi sekali-jalan dari `MID EXISTING` ke `MATERIAL MASTER` kalau sheet baru masih kosong |

---

## 4. AuthService.js — login NIK+Password & otorisasi role

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `getKaryawanRows_()` | — | `readKaryawanRowsFromCache_`, `writeKaryawanRowsToCache_` | `findKaryawanByNik_` |
| `findKaryawanByNik_(nik)` | NIK | `getKaryawanRows_` | `login_`, `resolveRole_` |
| `login_(nik, password)` | NIK, password | `getLoginAttemptCount_`, `findKaryawanByNik_`, `registerLoginFailure_`, `roleFromJabatan_`, `clearLoginAttempts_` | `login` (Code.js), `apiLogin_` (ApiService.js) |
| `resolveRole_(nik)` | NIK | `findKaryawanByNik_`, `roleFromJabatan_` | `submitScan` (Code.js), `requireRole_`, `validateApiToken_` (ApiService.js) |
| `requireRole_(nik, allowedRoles)` | NIK, array role yang diizinkan | `resolveRole_` | `tarikStokAwalShift`, `konfirmasiNeracaStokShift`, `konfirmasiItemStokShift`, `saveMaterialApi`, `saveMaterialBatchApi`, `deleteMaterialApi`, `saveMinMaxSettingApi`, `saveMinMaxBatchApi`, `deleteMinMaxSettingApi`, `saveBatchReprint`, `deleteReprintBarcode` (semua di Code.js) — **[SECURITY]** throw kalau NIK invalid ATAU role tidak termasuk `allowedRoles`; satu-satunya gerbang otorisasi utk endpoint tulis sensitif, dipakai bareng oleh web app & app Android (lewat `ApiService.js`, yang meneruskan `session.nik` hasil verifikasi token) |

---

## 5. BarcodeService.js — state machine scan + modul Reprint

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `padSeq_(n)` | angka urutan | — | `handleKirimMesin_` |
| `classifyBarcode_(raw)` | teks barcode | `findBarcodeRow_`, `getCellValue_` | `processScan_` |
| `getNextChildSequence_(parentBarcode)` | kode induk | `getSheet_`, `getHeaderMap_`, `escapeRegex_` | `handleKirimMesin_`, `saveBatchReprint_` |
| `escapeRegex_(value)` | teks | — | `getNextChildSequence_`, `saveBatchReprint_` |
| `getShift_(date)` | Date | `getShiftBounds_` | `handleTerimaWrm_`, `handleKirimMesin_` |
| `getShiftBounds_(date)` | Date | — | `getShift_`, `computeTspStock_`, `computeMesinStock_`, `computeTspMesinMonitoring_`, `computeShiftReceipts_`, `computeShiftDispatches_`, `computeOperatorReceipts_`, `computeOperatorConsumption_`, `computeValidator_`, `computeHistoricalTspStock_`/`Mesin_`, `computePortalHistory_`, `executeShiftRollover_` (tidak langsung, pakai `getRealLastRowAndTrim_`) |
| `formatTimestamp_(value)` | Date/nilai sel | — | `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_`, `getReprintData_`, `saveBatchReprint_` |
| `getCellValue_(rowResult, columnName)` | hasil row, nama kolom | — | `classifyBarcode_`, `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_`, `getReprintData_` |
| `processScan_(barcodeText, eventCode, mesinCode, jumlah, noReservasi, actorEmail, role)` | data scan lengkap | `ensureSheetsReady_`, `handleTerimaWrm_`, `handleKirimMesin_`, `classifyBarcode_`, `handleChildCheckpoint_` | `submitScan` (Code.js) |
| `handleTerimaWrm_(raw, noReservasi, now)` | kode barcode, no. reservasi, waktu | `findBarcodeRow_`, `lookupWrmIncoming_`, `validateMidInReservasi_`, `formatTimestamp_`, `getCellValue_`, `getShift_`, `appendBarcodeRow_`, `incrementStockCell_` | `processScan_` |
| `handleKirimMesin_(raw, mesinCode, jumlah, now)` | kode induk, mesin, qty, waktu | `findBarcodeRow_`, `getCellValue_`, `getNextChildSequence_`, `padSeq_`, `getShift_`, `appendBarcodeRow_`, `appendReprintRow_`, `incrementStockCell_` | `processScan_` |
| `handleChildCheckpoint_(classified, eventDef, now, mesinCode, eventCode)` | klasifikasi, eventDef, waktu, mesin, kode event | `findBarcodeRow_`, `getCellValue_`, `formatTimestamp_`, `updateBarcodeCell_`, `getSheet_`, `incrementStockCell_` | `processScan_` |
| `getReprintData_(parentBarcode)` | kode induk | `findBarcodeRow_`, `getCellValue_`, `lookupWrmIncoming_`, `getSheet_`, `getHeaderMap_`, `formatTimestamp_`, `getShift_` | `getReprintData` (Code.js) — return `{history[], parentQty}` |
| `saveBatchReprint_(requestedLabels)` | array `{barcodeInduk,jumlah,isRetur}` | `getReprintData_`, `getNextChildSequence_`, `escapeRegex_`, `LockService`, `findBarcodeRow_`, `getSheet_`, `getHeaderMap_` | `saveBatchReprint` (Code.js) — server memvalidasi kuantitas tersisa, mengalokasikan nomor barcode kanonis di dalam lock, lalu batch-append ke REPRINT BARCODE + BARCODE MATERIAL PRODUKSI. Android mengirim `ReprintRequest`, tidak pernah `ReprintLabel` atau nomor barcode anak. |
| `deleteReprintBarcode_(barcodeAnak)` | kode anak | `getSheet_`, `getHeaderMap_` | `deleteReprintBarcode` (Code.js) — hapus dari REPRINT BARCODE + BARCODE MATERIAL PRODUKSI |

---

## 6. StockService.js — perhitungan stock, admin shift, riwayat, min/max

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `toDateOrNull_(value)` | nilai sel | — | `readAllBarcodeRows_` |
| `readAllBarcodeRows_()` | — | `getSheet_`, `getHeaderMap_`, `toDateOrNull_` | `computeShiftReceipts_`, `computeShiftDispatches_`, `computeOperatorReceipts_`, `computeOperatorConsumption_`, `computePortalHistory_` |
| `getNormalizedDateStr_(dateCell)` / `getNormalizedShiftNum_(shiftCell)` | nilai sel | — | `computeTspStock_`, `computeMesinStock_`, `computeTspMesinMonitoring_`, `computeHistoricalTspStock_`/`Mesin_`, `executeShiftRollover_` — kunci pengelompokan blok shift |
| `normalizeMid_(val)` | nilai MID mentah | — | Hampir semua fungsi yang baca/cocokkan kolom MID |
| `getRealLastRowAndTrim_(sheet)` | sheet STOCK TSP/MESIN | — | `executeShiftRollover_` — cari baris terakhir yang benar-benar terisi & buang baris kosong/rumus hantu di bawahnya |
| `computeTspStock_(now)` | waktu referensi | `getShiftBounds_`, `getSupplierMap_`, `getMaterialMap_` (fallback kalau sheet STOCK TSP kosong) | `getTspStock` (Code.js), `computeValidator_` — baca LANGSUNG dari sheet **STOCK TSP** (bukan hitung ulang dari BARCODE MATERIAL PRODUKSI) |
| `computeMesinStock_(mesinCode, now)` | kode mesin, waktu referensi | `getShiftBounds_`, `getSupplierMap_`, `getMaterialMap_` (fallback) | `getMesinStock` (Code.js) — baca dari sheet **STOCK MESIN** |
| `computeTspMesinMonitoring_(now)` | waktu referensi | `getShiftBounds_`, `getMaterialMap_` | `getTspMesinMonitoring` (Code.js) — ringkasan 6 mesin sekaligus + alert LOW/CRITICAL per threshold UOM (Roll/KG) |
| `formatDateLabel_(date)` | Date | — | `computeTspStock_`, `computeMesinStock_`, `computeTspMesinMonitoring_` |
| `computeShiftReceipts_(now)` | waktu referensi | `getShiftBounds_`, `readAllBarcodeRows_`, `getSupplierMap_` | `getShiftReceipts` (Code.js) |
| `computeShiftDispatches_(now)` | waktu referensi | `getShiftBounds_`, `readAllBarcodeRows_`, `getSupplierMap_` | `getShiftDispatches` (Code.js) |
| `computeOperatorReceipts_(now, mesin)` | waktu referensi, kode mesin | `getShiftBounds_`, `readAllBarcodeRows_`, `getSupplierMap_` | `getOperatorReceipts` (Code.js) |
| `computeOperatorConsumption_(now, mesin)` | waktu referensi, kode mesin | `getShiftBounds_`, `readAllBarcodeRows_`, `getSupplierMap_` | `getOperatorConsumption` (Code.js) |
| `computeValidator_(now)` | waktu referensi | `getShiftBounds_`, `computeTspStock_`, `getSheet_`, `parseMb51Timestamp_`, `getMaterialMap_`, `getSupplierMap_` | `getValidatorData` (Code.js) |
| `parseMb51Timestamp_(dateCell, timeCell, tz)` | tanggal & jam sel MB51 | — | `computeValidator_` |
| `incrementStockCell_(sheetName, mid, colName, amountToAdd, dateOverride)` | nama sheet (STOCK TSP/MESIN), MID, nama kolom, jumlah, override tanggal | `getShiftBounds_`, `getSheet_`, `getHeaderMap_`, `normalizeMid_` | `handleTerimaWrm_`, `handleKirimMesin_`, `handleChildCheckpoint_` (BarcodeService.js) — **return `true`/`false`**: `false` kalau tidak ada baris shift aktif yang cocok (Tarik Stok Awal Shift belum dilakukan), caller WAJIB cek ini & tampilkan warning, jangan diam-diam ditelan |
| `executeShiftRollover_(tspSheet, mesinSheet, activeDateStr, shiftName, actorNik, actorNama)` | sheet TSP & Mesin, tanggal/shift aktif, aktor | `getMaterialList_`, `getRealLastRowAndTrim_`, `getHeaderMap_`, `getNormalizedDateStr_`/`ShiftNum_` | `tarikStokAwalShift_` — cetak blok baris baru STOCK TSP (30 kolom) + STOCK MESIN (39 kolom) dgn stok awal ditarik dari neraca akhir shift sebelumnya |
| `ensureMidInActiveShift_(mid, actorNik, actorNama)` | MID, NIK aktor, nama aktor | `getShiftBounds_`, `getSheet_`, `getHeaderMap_`, `getRealLastRowAndTrim_`, `getMaterialMap_`, `normalizeMid_` | `saveMaterialApi`, `saveMaterialBatchApi` (Code.js) — sisip 1 baris baru utk MID ke blok shift AKTIF (stok awal 0), idempotent, no-op kalau shift aktif belum pernah ditarik |
| `tarikStokAwalShift_(actorNik, actorNama)` | NIK & nama aktor terverifikasi | `getSheet_`, `getShiftBounds_`, `formatDateLabel_`, `getNormalizedDateStr_`/`ShiftNum_`, `executeShiftRollover_` | `tarikStokAwalShift` (Code.js) — aman dipanggil berulang (load-only kalau blok shift sudah ada) |
| `konfirmasiStokShift_(actorNik, actorNama, aktualData)` | NIK & nama aktor, data aktual (saat ini selalu `null` dari client) | `getSheet_`, `getShiftBounds_`, `getHeaderMap_`, `getNormalizedDateStr_`/`ShiftNum_` | `konfirmasiNeracaStokShift` (Code.js) — kunci status neraca blok shift aktif jadi VALID |
| `konfirmasiItemStokShift_(actorNik, actorNama, targetMid, aktualValue, statusType)` | NIK & nama aktor, MID, nilai aktual, `'BENAR'`\|`'REVISI'` | `getSheet_`, `getShiftBounds_`, `getHeaderMap_`, `getNormalizedDateStr_`/`ShiftNum_` | `konfirmasiItemStokShift` (Code.js) — set kolom "Stock Akhir (HITUNG AKTUAL)" + status per-item |
| `computeHistoricalTspStock_(dateStr, shiftNum)` | tanggal (yyyy-MM-dd), no. shift | `getSupplierMap_`, `getNormalizedDateStr_`/`ShiftNum_` | `getHistoricalTspStock` (Code.js) |
| `computeHistoricalMesinStock_(mesinCode, dateStr, shiftNum)` | kode mesin, tanggal, no. shift | `getSupplierMap_`, `getNormalizedDateStr_`/`ShiftNum_` | `getHistoricalMesinStock` (Code.js), `computePortalHistory_` |
| `computePortalHistory_(mesinCode, dateStr, shiftNum)` | kode mesin, tanggal, no. shift | `computeHistoricalMesinStock_`, `getShiftBounds_`, `readAllBarcodeRows_` | `getPortalHistory` (Code.js) — agregasi konsumsi per jam (bucket 07..14 / 15..22 / 23..06 tergantung shift) |
| `getMinMaxSheet_()` | — | `getSpreadsheet_` (buat sheet MIN MAX STOCK kalau belum ada) | `getMinMaxMap_`, `getMinMaxSettings`, `saveMinMaxSetting`, `saveMinMaxBatch_`, `deleteMinMaxSetting_`, `deleteMaterial_` (MaterialService.js, cascade) |
| `getMinMaxMap_()` | — | `getMinMaxSheet_` | *(tidak dipakai fungsi lain saat ini — dictionary MID_LOKASI → {minStock,maxStock}, kandidat dipakai kalau nanti ada validasi ambang batas real-time)* |
| `getMinMaxSettings()` | — | `getMinMaxSheet_`, `getMaterialMap_`, `getSupplierMap_` | `getMinMaxSettingsApi` (Code.js) — gabung data tersimpan + seluruh kombinasi MID × 7 lokasi dari Material Master (default 0/0 kalau belum diset) |
| `saveMinMaxSetting(nik, mid, lokasi, minStock, maxStock)` | NIK aktor, MID, lokasi, min, max | `getMinMaxSheet_`, `getMaterialMap_`, `normalizeMid_` | `saveMinMaxSettingApi` (Code.js) — menolak MID yang belum terdaftar di Material Master |
| `deleteMinMaxSetting_(nik, mid, lokasi)` | NIK aktor, MID, lokasi | `getMinMaxSheet_`, `normalizeMid_` | `deleteMinMaxSettingApi` (Code.js) — hapus 1 baris threshold; tidak menyentuh Material Master |
| `saveMinMaxBatch_(nik, items)` | NIK aktor, array `{mid,lokasi,minStock,maxStock}` | `getMinMaxSheet_`, `getMaterialMap_`, `normalizeMid_` | `saveMinMaxBatchApi` (Code.js) — import CSV; baris dgn MID belum terdaftar di-skip & dilaporkan |

---

## 7. Code.js — entry point web app (`doGet`, dipanggil `google.script.run`)

| Fungsi | Parameter | Calls | Dipanggil dari client |
|---|---|---|---|
| `doGet(e)` | request Apps Script | `HtmlService.createTemplateFromFile('Index')` | Browser (`/exec`, GET) |
| `include(filename)` | nama file HTML | `HtmlService.createHtmlOutputFromFile` | Template `Index.html` (`<?!= include(...) ?>`) |
| `login(nik, password)` | NIK, password | `login_` (AuthService.js) | `Index.html` |
| `submitScan(barcodeText, eventCode, mesinCode, jumlah, noReservasi, nik)` | data scan | `resolveRole_`, `processScan_`, `appendLog_` | `Scanner.html` |
| `getMesinList()` | — | — (baca `MESIN_LIST` langsung) | `Scanner.html` |
| `getReservasiOptions()` | — | `getReservasiList_` | `Scanner.html` |
| `getTspStock()` | — | `computeTspStock_` | `Index.html` |
| `getTspMesinMonitoring()` | — | `computeTspMesinMonitoring_` | `Index.html` |
| `getMesinStock(mesinCode)` | kode mesin | `computeMesinStock_` | `Index.html` |
| `getValidatorData()` | — | `computeValidator_` | `Index.html` |
| `getShiftReceipts()` | — | `computeShiftReceipts_` | `Index.html` |
| `getShiftDispatches()` | — | `computeShiftDispatches_` | `Index.html` |
| `getOperatorReceipts(mesin)` | kode mesin | `computeOperatorReceipts_` | `Index.html` |
| `getOperatorConsumption(mesin)` | kode mesin | `computeOperatorConsumption_` | `Index.html` |
| `tarikStokAwalShift(nik)` | NIK | `requireRole_(['tsp'])`, `tarikStokAwalShift_` | `Index.html` |
| `konfirmasiNeracaStokShift(nik, aktualData)` | NIK, (aktualData selalu `null` dari client) | `requireRole_(['tsp'])`, `konfirmasiStokShift_` | `Index.html` |
| `konfirmasiItemStokShift(nik, mid, aktualValue, statusType)` | NIK, MID, nilai, `'BENAR'`\|`'REVISI'` | `requireRole_(['tsp'])`, `konfirmasiItemStokShift_` | `Index.html` |
| `getHistoricalTspStock(dateStr, shiftNum)` | tanggal, shift | `computeHistoricalTspStock_` | `Index.html` |
| `getHistoricalMesinStock(mesinCode, dateStr, shiftNum)` | mesin, tanggal, shift | `computeHistoricalMesinStock_` | `Index.html` |
| `getPortalHistory(mesinCode, dateStr, shiftNum)` | mesin, tanggal, shift | `computePortalHistory_` | `Index.html` |
| `getReprintData(query)` | Kode Induk | `getReprintData_` | `Index.html` |
| `saveBatchReprint(nik, labels)` | NIK, array label | `requireRole_(['tsp','spv'])`, `saveBatchReprint_` | `Index.html` |
| `deleteReprintBarcode(nik, barcodeAnak)` | NIK, kode anak | `requireRole_(['tsp','spv'])`, `deleteReprintBarcode_` | `Index.html` |
| `getMinMaxSettingsApi()` | — | `getMinMaxSettings` | `Index.html` |
| `saveMinMaxSettingApi(nik, mid, lokasi, minStock, maxStock)` | NIK, MID, lokasi, min, max | `requireRole_(['tsp','spv'])`, `saveMinMaxSetting` | `Index.html` |
| `saveMinMaxBatchApi(nik, items)` | NIK, array items | `requireRole_(['tsp','spv'])`, `saveMinMaxBatch_` | `Index.html` |
| `deleteMinMaxSettingApi(nik, mid, lokasi)` | NIK, MID, lokasi | `requireRole_(['tsp','spv'])`, `deleteMinMaxSetting_` | `Index.html` |
| `getMaterialListApi()` | — | `migrateMaterialMasterIfEmpty_`, `getMaterialList_` | `Index.html` |
| `saveMaterialApi(nik, mid, deskripsi, uom, supplier, status)` | NIK, MID, deskripsi, UOM, supplier, status | `requireRole_(['tsp','spv'])`, `saveMaterialMaster_`, `ensureMidInActiveShift_` | `Index.html` |
| `saveMaterialBatchApi(nik, items)` | NIK, array items | `requireRole_(['tsp','spv'])`, `saveMaterialBatch_`, `ensureMidInActiveShift_` | `Index.html` |
| `deleteMaterialApi(nik, mid)` | NIK, MID | `requireRole_(['tsp','spv'])`, `deleteMaterial_` | `Index.html` |

---

## 8. ApiService.js — JSON API utk app Android (`doPost`)

File terpisah, additive murni — tidak menduplikasi logic, cuma jadi transport JSON di atas
fungsi `Code.js` yang sama persis dipakai tabel §7 (lihat `dispatchApiAction_`/`API_ACTIONS_`
di file ini utk peta lengkap `action` string → fungsi `Code.js`).

| Fungsi | Parameter | Calls | Called by |
|---|---|---|---|
| `doPost(e)` | request Apps Script (body JSON) | `apiLogin_`, `validateApiToken_`, `dispatchApiAction_` | App Android (`/exec`, POST) |
| `apiLogin_(nik, password)` | NIK, password | `login_` (AuthService.js), `Utilities.getUuid`, `CacheService` | `doPost` — action `"login"`, terbitkan token sesi |
| `validateApiToken_(token)` | token sesi | `CacheService`, `resolveRole_` (AuthService.js) | `doPost` — semua action selain `"login"`; sliding-window TTL 6 jam, role selalu diverifikasi ulang dari sheet KARYAWAN |
| `API_ACTIONS_.getSession` *(entry dispatch)* | token sesi tervalidasi | — | bootstrap aplikasi Android — mengembalikan NIK, nama, dan role dari sesi server untuk revalidasi route; tidak menerima identitas dari client |
| `apiSubmitScanIdempotent_(body, session)` | body request, sesi terverifikasi | `submitScan` (Code.js), `CacheService` | `API_ACTIONS_.submitScan` — cek `clientRequestId` di cache dulu sebelum panggil `submitScan()`, cegah dobel-proses saat retry offline-sync |
| `dispatchApiAction_(action, body, session)` | nama action, body, sesi | `API_ACTIONS_[action]` | `doPost` — lempar Error kalau action tidak dikenal |
| `API_ACTIONS_` *(bukan function, object literal)* | — | Setiap entry memanggil 1 fungsi `Code.js` (lihat §7) dgn `session.nik` utk aksi tulis | `dispatchApiAction_` |
