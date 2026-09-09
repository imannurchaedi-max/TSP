# TSP Modul Function Index

Generated: 2026-09-09T03:42:30.607Z

Files scanned: 78

Functions indexed: 350

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
- `lookupMesinFromLog_` - line 229
- `getShift_` - line 252
- `getShiftBounds_` - line 259
- `formatTimestamp_` - line 278
- `getCellValue_` - line 284
- `processScan_` - line 294
- `handleTerimaWrm_` - line 323
- `handleKirimMesin_` - line 390
- `handleChildCheckpoint_` - line 469
- `getReprintData_` - line 575
- `saveBatchReprint_` - line 658
- `deleteReprintBarcode_` - line 725

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
- `submitReservasiApi` - line 379

## Active/Index.html

- `escapeHtml` - line 564
- `formatNumberDisplay` - line 574
- `getSavedUser` - line 581
- `buildMesinColumns_` - line 666
- `showLogin` - line 726
- `openSidebar` - line 731
- `closeSidebar` - line 732
- `showApp` - line 734
- `setupMesinPicker` - line 765
- `buildDeeplinkUrl` - line 788
- `pushDeeplinkState` - line 810
- `_updateNavHrefs` - line 854
- `initDeeplinkUrlListener` - line 871
- `parseHashLocation` - line 886
- `restoreStateFromLocation` - line 901
- `switchTab` - line 934
- `formatCellVal` - line 955
- `buildStickyOffsets_` - line 975
- `stickyAttrs_` - line 987
- `renderTable` - line 996
- `renderPortalTable` - line 1041
- `downloadPortalCsv` - line 1096
- `showPopupModal` - line 1146
- `showConfirmModal` - line 1187
- `showPromptModal` - line 1237
- `openOverlayAnimation` - line 1281
- `closePopupModal` - line 1288
- `showFloatingLoading` - line 1296
- `hideFloatingLoading` - line 1306
- `switchStockSubnav` - line 1320
- `startTvAutoRefresh` - line 1343
- `stopTvAutoRefresh` - line 1361
- `toggleTvFullscreen` - line 1368
- `loadTspMesinMonitoring` - line 1428
- `renderNeracaBanner` - line 1529
- `tarikStokAwalHandler` - line 1575
- `konfirmasiStokHandler` - line 1609
- `konfirmasiItemBenar` - line 1648
- `konfirmasiItemRevisi` - line 1669
- `initHistoryTab` - line 1696
- `onHistoryTypeChange` - line 1721
- `loadHistoryData` - line 1731
- `loadMinMaxTab` - line 1802
- `switchMaterialSubnav` - line 1806
- `loadMaterialListTab` - line 1833
- `populateMaterialMidDatalist` - line 1857
- `filterMaterialListTable` - line 1869
- `renderMaterialListTable` - line 1880
- `openAddMaterialModal` - line 1914
- `editMaterialItem` - line 1924
- `closeMaterialModal` - line 1934
- `saveMaterialFromForm` - line 1938
- `confirmDeleteMaterialItem` - line 1972
- `downloadMaterialCsvTemplate` - line 2003
- `triggerMaterialCsvUpload` - line 2017
- `handleMaterialCsvFileSelected` - line 2023
- `processMaterialCsvContent` - line 2037
- `loadMinMaxSettingsTab` - line 2111
- `filterMinMaxTable` - line 2132
- `renderMinMaxTable` - line 2145
- `openAddMinMaxModal` - line 2193
- `editMinMaxItem` - line 2202
- `closeMinMaxModal` - line 2211
- `confirmDeleteMinMaxItem` - line 2215
- `saveMinMaxFromForm` - line 2245
- `downloadMinMaxCsvTemplate` - line 2279
- `triggerMinMaxCsvUpload` - line 2293
- `handleMinMaxCsvFileSelected` - line 2299
- `processMinMaxCsvContent` - line 2313
- `renderStockTableWithFilter` - line 2389
- `loadStockTab` - line 2420
- `loadShiftPanels` - line 2469
- `loadValidatorTab` - line 2513
- `handleNavClick` - line 2561
- `handleSubnavClick` - line 2570
- `tryRestoreSession` - line 2596
- `triggerReprintCamera` - line 2638
- `searchReprintData` - line 2669
- `deleteReprintLabel` - line 2703
- `_runDeleteReprint` - line 2721
- `restoreBtn` - line 2726
- `showReprintConfig` - line 2762
- `resetReprintSearch` - line 2804
- `generateReprintLabels` - line 2814
- `_parseNextSequence` - line 2889
- `_padSeq` - line 2902
- `applyReprintPageSize_` - line 2921
- `onReprintPresetChange` - line 2931
- `getSelectedReprintSizeConfig` - line 2950
- `_openBatchPrintModal` - line 2960
- `renderReprintLabelsWithCurrentSize` - line 2984
- `closeReprintLabel` - line 3051
- `printReprintLabel` - line 3055

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
- `submitReservasi_` - line 490

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

## tools/clasp_prune.py

- `die` - line 25
- `access_token` - line 30
- `api` - line 54
- `main` - line 61

## tools/generate_maps.py

- `create_maps` - line 6

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

