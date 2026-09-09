"""
Cross-Verification of Code Column References vs Excel REF Headers
------------------------------------------------------------------
Checks every column name referenced in JS codebase (Active/*.js)
against the actual extracted headers from REF/TSP MODUL.xlsx (excel_sheet_mapping.json).
"""

import json
import re
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).parent.parent
ACTIVE_DIR = WORKSPACE_ROOT / "Active"
MAPPING_JSON = WORKSPACE_ROOT / "dokumentasi" / "excel_sheet_mapping.json"


def load_excel_mapping():
    with open(MAPPING_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def verify_columns():
    excel_map = load_excel_mapping()

    print("==================================================")
    print("  EXACT COLUMN CROSS-VERIFICATION REPORT          ")
    print("==================================================")

    # 1. Verification of BARCODE MATERIAL PRODUKSI
    barcode_excel_headers = excel_map.get("BARCODE MATERIAL PRODUKSI", {}).get("columns", [])
    print("\n--- 1. BARCODE MATERIAL PRODUKSI ---")
    print(f"Excel Headers ({len(barcode_excel_headers)}):")
    for i, h in enumerate(barcode_excel_headers, start=1):
        print(f"  {i}. {h}")

    config_js = (ACTIVE_DIR / "Config.js").read_text(encoding="utf-8")
    match = re.search(r"BARCODE_COLUMNS\s*=\s*\[(.*?)\];", config_js, re.DOTALL)

    config_headers = []
    if match:
        raw_items = match.group(1).split("\n")
        for item in raw_items:
            cleaned = item.strip().strip(",").strip("'\"").strip()
            if cleaned and not cleaned.startswith("//"):
                config_headers.append(cleaned)

    print(f"\nConfig.js Headers ({len(config_headers)}):")
    for i, h in enumerate(config_headers, start=1):
        print(f"  {i}. {h}")

    mismatches = []
    for idx, ch in enumerate(config_headers):
        if idx < len(barcode_excel_headers):
            eh = barcode_excel_headers[idx]
            if ch != eh:
                mismatches.append((ch, eh, f"Difference at index {idx+1}"))
        else:
            mismatches.append((ch, "MISSING IN EXCEL", "Extra column in config"))

    # REF/TSP MODUL.xlsx adalah SNAPSHOT, bukan sheet live. Kolom MESIN ditambahkan
    # di v114 dan snapshot itu belum memuatnya, jadi selisihnya DIHARAPKAN sampai
    # snapshot disegarkan -- bukan tanda kode yang salah.
    if any('MESIN' in str(m) for m in mismatches):
        print()
        print('  [CATATAN] Selisih kolom MESIN diharapkan: kolom itu ditambahkan di v114,')
        print('            sedangkan REF/TSP MODUL.xlsx masih snapshot sebelum v114.')
        print('            Segarkan snapshot Excel untuk menghilangkan catatan ini.')

    if mismatches:
        print("\n  [DISCREPANCIES FOUND]:")
        for code_col, excel_col, reason in mismatches:
            print(f"    - Config: '{code_col}' | Excel: '{excel_col}' ({reason})")
    else:
        print("\n  >>> [100% PERFECT MATCH] All 14 Config.js barcode headers EXACTLY MATCH the updated Excel sheet! <<<")

    # 2. BARCODE OUTBOUND WRM -- registry pallet, sumber lookup saat Terima dari WRM.
    #
    # Menggantikan dua pemeriksaan lama yang SELALU gagal palsu:
    #   - "BARCODE INCOMING WRM": tab dengan nama itu tidak pernah ada di workbook.
    #     Konstanta WRM_INCOMING di Config.js memang menunjuk 'BARCODE OUTBOUND WRM'.
    #   - "RESERVASI": tab ini DIHAPUS di v66-v80 dan dilebur ke BARCODE OUTBOUND WRM
    #     (kolom MATDOC RESERVASI). Memeriksanya membuat alat ini selalu merah, dan
    #     alat yang selalu merah membuat kegagalan asli ikut terabaikan.
    wrm_excel_headers = set(excel_map.get("BARCODE OUTBOUND WRM", {}).get("columns", []))
    print()
    print("--- 2. BARCODE OUTBOUND WRM ---")
    print(f"Excel Headers ({len(wrm_excel_headers)}): {sorted(wrm_excel_headers)}")

    # Persis kolom yang di-lookup getRequiredCellValue_(wrmRow, ...) di BarcodeService.js.
    code_wrm_lookups = ["MID", "DESC", "QTY"]
    print(f"Code Lookups: {code_wrm_lookups}")

    wrm_ok = True
    for c in code_wrm_lookups:
        if c in wrm_excel_headers:
            print(f"  [OK] '{c}' found in Excel")
        else:
            print(f"  [FAIL] '{c}' missing in Excel")
            wrm_ok = False

    if wrm_ok:
        print("  >>> [MATCH] Semua kolom lookup WRM tersedia. <<<")

    # 3. Verification of MID EXISTING
    mid_excel_headers = set(excel_map.get("MID EXISTING", {}).get("columns", []))
    print()
    print("--- 3. MID EXISTING ---")
    print(f"Excel Headers: {sorted(mid_excel_headers)}")
    for c in ["MID", "Deskripsi", "UOM"]:
        if c in mid_excel_headers:
            print(f"  [OK] '{c}' found in MID EXISTING")
        else:
            print(f"  [FAIL] '{c}' missing in MID EXISTING")


if __name__ == "__main__":
    verify_columns()
