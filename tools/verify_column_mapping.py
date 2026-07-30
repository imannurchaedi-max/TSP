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


def extract_js_column_references():
    col_refs = {}
    for js_file in ACTIVE_DIR.glob("*.js"):
        content = js_file.read_text(encoding="utf-8")

        # Find string literals passed to column lookups
        # e.g., col['Column Name'], getCellValue_(row, 'Column Name'), headerMap['Column Name']
        matches = re.findall(r"['\"]([A-Za-z0-9 _/\-\(\)]+)['\"]", content)
        col_refs[js_file.name] = set(matches)

    return col_refs


def verify_columns():
    excel_map = load_excel_mapping()
    js_refs = extract_js_column_references()

    print("==================================================")
    print("  EXACT COLUMN CROSS-VERIFICATION REPORT          ")
    print("==================================================")

    # 1. Verification of BARCODE MATERIAL PRODUKSI
    barcode_excel_headers = set(excel_map.get("BARCODE MATERIAL PRODUKSI", {}).get("columns", []))
    print("\n--- 1. BARCODE MATERIAL PRODUKSI ---")
    print(f"Excel Headers ({len(barcode_excel_headers)}): {sorted(list(barcode_excel_headers))}")

    # Expected in Config.js
    config_js = (ACTIVE_DIR / "Config.js").read_text(encoding="utf-8")
    barcode_cols_config = re.findall(r"BARCODE_COLUMNS\s*=\s*\[(.*?)\];", config_js, re.DOTALL)

    config_headers = []
    if barcode_cols_config:
        config_headers = [c.strip("'\": ").strip() for c in barcode_cols_config[0].split("\n") if c.strip()]

    print(f"Config.js Headers ({len(config_headers)}): {config_headers}")

    mismatches = []
    for ch in config_headers:
        # Check case-insensitive match
        match_found = any(eh.strip().lower() == ch.strip().lower() for eh in barcode_excel_headers)
        exact_match = ch in barcode_excel_headers
        if not match_found:
            mismatches.append((ch, "NOT FOUND IN EXCEL"))
        elif not exact_match:
            matching_excel = [eh for eh in barcode_excel_headers if eh.strip().lower() == ch.strip().lower()][0]
            mismatches.append((ch, f"CASE/NAME MISMATCH -> Excel has '{matching_excel}'"))

    if mismatches:
        print("  [DISCREPANCIES FOUND]:")
        for code_col, reason in mismatches:
            print(f"    - '{code_col}': {reason}")
    else:
        print("  [PERFECT MATCH] All Config.js barcode headers match Excel!")

    # 2. Verification of BARCODE INCOMING WRM
    wrm_excel_headers = set(excel_map.get("BARCODE INCOMING WRM", {}).get("columns", []))
    print("\n--- 2. BARCODE INCOMING WRM ---")
    print(f"Excel Headers ({len(wrm_excel_headers)}): {sorted(list(wrm_excel_headers))}")

    code_wrm_lookups = ["Kode Unik", "Jumlah", "Qty /Palet", "Mid", "Description", "AKSI", "Keterangan", "NO PALLET"]
    print(f"Code Lookups: {code_wrm_lookups}")

    wrm_mismatches = []
    for c in code_wrm_lookups:
        exact = c in wrm_excel_headers
        ci = any(eh.strip().lower() == c.strip().lower() for eh in wrm_excel_headers)
        if not ci:
            wrm_mismatches.append((c, "NOT FOUND IN WRM SHEET"))
        elif not exact:
            match_name = [eh for eh in wrm_excel_headers if eh.strip().lower() == c.strip().lower()][0]
            wrm_mismatches.append((c, f"CASE MISMATCH -> Excel has '{match_name}'"))

    if wrm_mismatches:
        print("  [DISCREPANCIES FOUND]:")
        for c, reason in wrm_mismatches:
            print(f"    - '{c}': {reason}")
    else:
        print("  [PERFECT MATCH] All WRM lookups match Excel headers!")

    # 3. Verification of MID EXISTING
    mid_excel_headers = set(excel_map.get("MID EXISTING", {}).get("columns", []))
    print("\n--- 3. MID EXISTING ---")
    print(f"Excel Headers: {sorted(list(mid_excel_headers))}")

    code_mid_lookups = ["MID", "Deskripsi", "Material Description", "UOM"]
    for c in code_mid_lookups:
        match_name = [eh for eh in mid_excel_headers if eh.strip().lower() == c.strip().lower()]
        if match_name:
            print(f"  - '{c}' -> Matches Excel header '{match_name[0]}'")
        else:
            print(f"  - '{c}' -> NOT IN MID EXISTING")


if __name__ == "__main__":
    verify_columns()
