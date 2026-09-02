# TSP Modul Function Index

Generated: 2026-09-02T01:48:13.651Z

Files scanned: 76

Functions indexed: 343

Use this before broad code reads. Open the target file and line instead of scanning entire runtime files.

## Active/ApiService.js

- `doPost` - line 20
- `apiLogin_` - line 46
- `validateApiToken_` - line 59
- `apiSubmitScanIdempotent_` - line 77
- `dispatchApiAction_` - line 169

## Active/AuthService.js

- `getKaryawanRows_` - line 9
- `readKaryawanRowsFromCache_` - line 46
- `writeKaryawanRowsToCache_` - line 64
- `findKaryawanByNik_` - line 79
- `getLoginAttemptCount_` - line 88
- `registerLoginFailure_` - line 94
- `clearLoginAttempts_` - line 100
- `roleFromJabatan_` - line 104
- `login_` - line 116
- `resolveRole_` - line 148
- `requireRole_` - line 168

## Active/BarcodeService.js

- `padSeq_` - line 12
- `classifyBarcode_` - line 20
- `getNextChildSequence_` - line 35
- `escapeRegex_` - line 58
- `allocateChildBarcodes_` - line 84
- `lookupMesinFromLog_` - line 233
- `getShift_` - line 256
- `getShiftBounds_` - line 263
- `formatTimestamp_` - line 282
- `getCellValue_` - line 288
- `processScan_` - line 298
- `handleTerimaWrm_` - line 327
- `handleKirimMesin_` - line 394
- `handleChildCheckpoint_` - line 473
- `getReprintData_` - line 579
- `saveBatchReprint_` - line 662
- `deleteReprintBarcode_` - line 729

## Active/Code.js

- `doGet` - line 5
- `include` - line 14
- `login` - line 21
- `submitScan` - line 42
- `getMesinList` - line 88
- `getReservasiOptions` - line 93
- `getTspStock` - line 102
- `getTspMesinMonitoring` - line 111
- `getMesinStock` - line 120
- `getValidatorData` - line 132
- `getShiftReceipts` - line 141
- `getShiftDispatches` - line 150
- `getOperatorReceipts` - line 159
- `getOperatorConsumption` - line 168
- `tarikStokAwalShift` - line 178
- `konfirmasiNeracaStokShift` - line 189
- `konfirmasiItemStokShift` - line 200
- `getHistoricalTspStock` - line 211
- `getHistoricalMesinStock` - line 220
- `getPortalHistory` - line 229
- `getReprintData` - line 241
- `saveBatchReprint` - line 257
- `deleteReprintBarcode` - line 272
- `getMinMaxSettingsApi` - line 283
- `saveMinMaxSettingApi` - line 292
- `saveMinMaxBatchApi` - line 302
- `deleteMinMaxSettingApi` - line 312
- `getMaterialListApi` - line 322
- `saveMaterialApi` - line 332
- `saveMaterialBatchApi` - line 349
- `deleteMaterialApi` - line 369

## Active/Index.html

- `escapeHtml` - line 513
- `formatNumberDisplay` - line 523
- `getSavedUser` - line 530
- `buildMesinColumns_` - line 615
- `showLogin` - line 675
- `openSidebar` - line 680
- `closeSidebar` - line 681
- `showApp` - line 683
- `setupMesinPicker` - line 713
- `buildDeeplinkUrl` - line 736
- `pushDeeplinkState` - line 758
- `_updateNavHrefs` - line 802
- `initDeeplinkUrlListener` - line 819
- `parseHashLocation` - line 834
- `restoreStateFromLocation` - line 849
- `switchTab` - line 882
- `formatCellVal` - line 903
- `buildStickyOffsets_` - line 923
- `stickyAttrs_` - line 935
- `renderTable` - line 944
- `renderPortalTable` - line 989
- `downloadPortalCsv` - line 1044
- `showPopupModal` - line 1094
- `showConfirmModal` - line 1135
- `showPromptModal` - line 1185
- `openOverlayAnimation` - line 1229
- `closePopupModal` - line 1236
- `showFloatingLoading` - line 1244
- `hideFloatingLoading` - line 1254
- `switchStockSubnav` - line 1268
- `startTvAutoRefresh` - line 1291
- `stopTvAutoRefresh` - line 1309
- `toggleTvFullscreen` - line 1316
- `loadTspMesinMonitoring` - line 1376
- `renderNeracaBanner` - line 1477
- `tarikStokAwalHandler` - line 1523
- `konfirmasiStokHandler` - line 1557
- `konfirmasiItemBenar` - line 1596
- `konfirmasiItemRevisi` - line 1617
- `initHistoryTab` - line 1644
- `onHistoryTypeChange` - line 1669
- `loadHistoryData` - line 1679
- `loadMinMaxTab` - line 1750
- `switchMaterialSubnav` - line 1754
- `loadMaterialListTab` - line 1781
- `populateMaterialMidDatalist` - line 1805
- `filterMaterialListTable` - line 1817
- `renderMaterialListTable` - line 1828
- `openAddMaterialModal` - line 1862
- `editMaterialItem` - line 1872
- `closeMaterialModal` - line 1882
- `saveMaterialFromForm` - line 1886
- `confirmDeleteMaterialItem` - line 1920
- `downloadMaterialCsvTemplate` - line 1951
- `triggerMaterialCsvUpload` - line 1965
- `handleMaterialCsvFileSelected` - line 1971
- `processMaterialCsvContent` - line 1985
- `loadMinMaxSettingsTab` - line 2059
- `filterMinMaxTable` - line 2080
- `renderMinMaxTable` - line 2093
- `openAddMinMaxModal` - line 2141
- `editMinMaxItem` - line 2150
- `closeMinMaxModal` - line 2159
- `confirmDeleteMinMaxItem` - line 2163
- `saveMinMaxFromForm` - line 2193
- `downloadMinMaxCsvTemplate` - line 2227
- `triggerMinMaxCsvUpload` - line 2241
- `handleMinMaxCsvFileSelected` - line 2247
- `processMinMaxCsvContent` - line 2261
- `renderStockTableWithFilter` - line 2337
- `loadStockTab` - line 2368
- `loadShiftPanels` - line 2417
- `loadValidatorTab` - line 2461
- `handleNavClick` - line 2509
- `handleSubnavClick` - line 2518
- `tryRestoreSession` - line 2544
- `triggerReprintCamera` - line 2586
- `searchReprintData` - line 2617
- `deleteReprintLabel` - line 2651
- `_runDeleteReprint` - line 2669
- `restoreBtn` - line 2674
- `showReprintConfig` - line 2710
- `resetReprintSearch` - line 2752
- `generateReprintLabels` - line 2762
- `_parseNextSequence` - line 2837
- `_padSeq` - line 2850
- `applyReprintPageSize_` - line 2869
- `onReprintPresetChange` - line 2879
- `getSelectedReprintSizeConfig` - line 2898
- `_openBatchPrintModal` - line 2908
- `renderReprintLabelsWithCurrentSize` - line 2932
- `closeReprintLabel` - line 2999
- `printReprintLabel` - line 3003

## Active/MaterialService.js

- `resolveDeskCol_` - line 19
- `getSupplierMap_` - line 27
- `getMaterialList_` - line 62
- `getMaterialMap_` - line 94
- `saveMaterialMaster_` - line 132
- `saveMaterialBatch_` - line 199
- `deleteMaterial_` - line 279
- `isMidUsedAnywhere_` - line 317
- `deleteMaterialMaster_` - line 342
- `migrateMaterialMasterIfEmpty_` - line 374

## Active/Scanner.html

- `showView` - line 70
- `resetScanMenu` - line 80
- `renderActions` - line 85
- `selectEvent` - line 115
- `getTodayIsoString` - line 161
- `setupReservasiPicker` - line 170
- `isDateMatch` - line 194
- `renderReservasiOptions` - line 207
- `startScanner` - line 290
- `handleCapturedFile` - line 295
- `onScanSuccess` - line 315
- `showResult` - line 322

## Active/SheetService.js

- `getSpreadsheet_` - line 5
- `getSheet_` - line 12
- `ensureSheetsReady_` - line 29
- `getHeaderMap_` - line 66
- `findRowByColumnValue_` - line 85
- `findBarcodeRow_` - line 109
- `lookupWrmIncoming_` - line 133
- `parseSapDate_` - line 142
- `parseMonth_` - line 170
- `getReservasiList_` - line 242
- `validateMidInReservasi_` - line 316
- `appendBarcodeRow_` - line 360
- `appendReprintRow_` - line 381
- `updateBarcodeCell_` - line 402
- `appendLog_` - line 415
- `queryReprintSheet_` - line 438

## Active/StockService.js

- `toDateOrNull_` - line 10
- `readAllBarcodeRows_` - line 16
- `getNormalizedDateStr_` - line 43
- `getNormalizedShiftNum_` - line 72
- `normalizeMid_` - line 78
- `getRealLastRowAndTrim_` - line 90
- `computeTspStock_` - line 125
- `computeMesinStock_` - line 281
- `computeTspMesinMonitoring_` - line 391
- `formatDateLabel_` - line 576
- `computeShiftReceipts_` - line 583
- `computeShiftDispatches_` - line 608
- `computeOperatorReceipts_` - line 634
- `computeOperatorConsumption_` - line 659
- `computeValidator_` - line 683
- `parseMb51Timestamp_` - line 745
- `executeShiftRollover_` - line 783
- `ensureMidInActiveShift_` - line 981
- `incrementStockCell_` - line 1077
- `tarikStokAwalShift_` - line 1174
- `konfirmasiStokShift_` - line 1228
- `konfirmasiItemStokShift_` - line 1310
- `computeHistoricalTspStock_` - line 1370
- `computeHistoricalMesinStock_` - line 1472
- `computePortalHistory_` - line 1554
- `getMinMaxSheet_` - line 1646
- `getMinMaxMap_` - line 1660
- `getMinMaxSettings` - line 1690
- `saveMinMaxSetting` - line 1770
- `deleteMinMaxSetting_` - line 1819
- `saveMinMaxBatch_` - line 1853

## android modif/TSPModul/lib/core/api_client.dart

- `toString` - line 15
- `_isRedirectStatus` - line 21

## android modif/TSPModul/lib/core/background_sync.dart

- `backgroundSyncDispatcher` - line 15

## android modif/TSPModul/lib/core/connectivity_sync.dart

- `start` - line 15
- `dispose` - line 28

## android modif/TSPModul/lib/core/update_checker.dart

- `_isNewer` - line 54

## android modif/TSPModul/lib/data/local/database.g.dart

- `toString` - line 470
- `toString` - line 666

## android modif/TSPModul/lib/data/models/history_models.dart

- `_s` - line 1

## android modif/TSPModul/lib/data/models/material_models.dart

- `_s` - line 1

## android modif/TSPModul/lib/data/models/reprint_models.dart

- `_s` - line 1

## android modif/TSPModul/lib/data/models/stock_models.dart

- `_s` - line 1

## android modif/TSPModul/lib/data/models/validator_models.dart

- `_s` - line 1

## android modif/TSPModul/lib/features/auth/login_screen.dart

- `dispose` - line 22
- `build` - line 49

## android modif/TSPModul/lib/features/history/history_home_screen.dart

- `_todayIso` - line 8
- `initState` - line 30
- `build` - line 52

## android modif/TSPModul/lib/features/history/history_mesin_view.dart

- `build` - line 14

## android modif/TSPModul/lib/features/history/history_portal_view.dart

- `build` - line 18

## android modif/TSPModul/lib/features/history/history_tsp_view.dart

- `build` - line 13

## android modif/TSPModul/lib/features/material/csv_import_helper.dart

- `findHeaderIndex` - line 14
- `cellAt` - line 21

## android modif/TSPModul/lib/features/material/material_home_screen.dart

- `build` - line 16

## android modif/TSPModul/lib/features/material/material_list_tab.dart

- `initState` - line 24
- `dispose` - line 31
- `_showMessage` - line 190
- `build` - line 198

## android modif/TSPModul/lib/features/material/minmax_tab.dart

- `initState` - line 25
- `dispose` - line 32
- `_showMessage` - line 163
- `build` - line 171
- `ifEmpty` - line 260

## android modif/TSPModul/lib/features/reprint/reprint_config_screen.dart

- `initState` - line 24
- `dispose` - line 32
- `_generate` - line 37
- `_showValidation` - line 64
- `build` - line 77

## android modif/TSPModul/lib/features/reprint/reprint_home_screen.dart

- `dispose` - line 28
- `_resetSearch` - line 146
- `build` - line 157
- `build` - line 225

## android modif/TSPModul/lib/features/reprint/reprint_print_screen.dart

- `build` - line 112

## android modif/TSPModul/lib/features/scan/barcode_scan_helper.dart

- `dispose` - line 27
- `_onDetect` - line 31
- `build` - line 43

## android modif/TSPModul/lib/features/scan/scan_extra_fields_screen.dart

- `_todayIsoString` - line 29
- `initState` - line 36
- `dispose` - line 46
- `_continue` - line 99
- `_showValidationDialog` - line 139
- `build` - line 154

## android modif/TSPModul/lib/features/scan/scan_home_screen.dart

- `initState` - line 23
- `_selectEvent` - line 32
- `build` - line 40
- `build` - line 139

## android modif/TSPModul/lib/features/scan/scan_result_screen.dart

- `build` - line 12

## android modif/TSPModul/lib/features/scan/scanner_screen.dart

- `dispose` - line 25
- `build` - line 69
- `build` - line 103

## android modif/TSPModul/lib/features/shell/app_bottom_nav.dart

- `build` - line 40

## android modif/TSPModul/lib/features/shell/connectivity_banner.dart

- `initState` - line 22
- `dispose` - line 29
- `_update` - line 33
- `build` - line 40

## android modif/TSPModul/lib/features/stock/mesin_stock_tab.dart

- `build` - line 12
- `build` - line 41

## android modif/TSPModul/lib/features/stock/monitoring_tab.dart

- `build` - line 15
- `build` - line 29
- `build` - line 77
- `build` - line 111

## android modif/TSPModul/lib/features/stock/stock_home_screen.dart

- `build` - line 17
- `build` - line 33
- `initState` - line 84
- `build` - line 90

## android modif/TSPModul/lib/features/stock/transactions_tab.dart

- `build` - line 15

## android modif/TSPModul/lib/features/stock/tsp_stock_tab.dart

- `initState` - line 26
- `dispose` - line 33
- `_showError` - line 56
- `build` - line 192
- `build` - line 309
- `build` - line 378
- `build` - line 437

## android modif/TSPModul/lib/features/stock/widgets/async_tab.dart

- `initState` - line 22
- `build` - line 34

## android modif/TSPModul/lib/features/stock/widgets/status_badge.dart

- `build` - line 22

## android modif/TSPModul/lib/features/sync/sync_queue_screen.dart

- `_statusLabel` - line 21
- `build` - line 36

## android modif/TSPModul/lib/features/validator/validator_home_screen.dart

- `initState` - line 20
- `build` - line 32
- `build` - line 111

## android modif/TSPModul/lib/main.dart

- `initState` - line 24
- `build` - line 38

## android modif/TSPModul/test/api_redirect_probe_test.dart

- `main` - line 4

## android modif/TSPModul/test/reprint_request_test.dart

- `main` - line 3

## android modif/TSPModul/test/widget_test.dart

- `main` - line 10

## tools/graphify_codebase.py

- `extract_js_functions` - line 17
- `funcName` - line 24
- `build_codebase_graph` - line 31
- `export_graph_summary` - line 62

## tools/langgraph_agent.py

- `terima_wrm_step` - line 30
- `kirim_mesin_step` - line 42
- `terima_operator_step` - line 54
- `consume_operator_step` - line 66
- `route_next_checkpoint` - line 78
- `create_tsp_workflow` - line 93

## tools/mermaid_generator.py

- `generate_mermaid_docs` - line 29

## tools/parse_excel_ref.py

- `analyze_excel` - line 18
- `default_converter` - line 66

## tools/verify_column_mapping.py

- `load_excel_mapping` - line 15
- `verify_columns` - line 20

## tools/verify_env.py

- `check_python_packages` - line 29
- `check_graphify` - line 54
- `check_mermaid` - line 75
- `check_langgraph` - line 96
- `check_gitnexus` - line 117
- `main` - line 141

