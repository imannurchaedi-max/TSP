"""
Parse Excel Reference File (REF/TSP MODUL.xlsx)
-----------------------------------------------
Reads all sheets in REF/TSP MODUL.xlsx, excluding 'workflow' and 'panduan mb51' / 'paduan mb51'.
Generates column mapping and structure summary in JSON and Markdown documentation.
"""

import json
from pathlib import Path
import openpyxl
import pandas as pd

WORKSPACE_ROOT = Path(__file__).parent.parent
EXCEL_FILE = WORKSPACE_ROOT / "REF" / "TSP MODUL.xlsx"
DOCS_DIR = WORKSPACE_ROOT / "dokumentasi"

EXCLUDE_TABS = ["workflow", "panduan mb51", "paduan mb51"]


def analyze_excel():
    if not EXCEL_FILE.exists():
        print(f"Error: {EXCEL_FILE} does not exist.")
        return

    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    all_sheets = wb.sheetnames
    print(f"Total Sheets in Workbook: {len(all_sheets)}")
    print(f"Sheet Names: {all_sheets}")

    mapping_result = {}

    for sheet in all_sheets:
        clean_sheet = sheet.strip().lower()
        if any(exc in clean_sheet for exc in EXCLUDE_TABS):
            print(f"  [Skipping excluded tab]: '{sheet}'")
            continue

        print(f"\n--- Analyzing Sheet: '{sheet}' ---")
        df = pd.read_excel(EXCEL_FILE, sheet_name=sheet)

        num_rows, num_cols = df.shape
        columns = [str(c).strip() for c in df.columns]
        sample_rows = df.head(3).to_dict(orient="records")

        # Sanitize data types
        dtypes = {str(col).strip(): str(dtype) for col, dtype in df.dtypes.items()}

        sheet_info = {
            "sheet_name": sheet,
            "row_count": num_rows,
            "column_count": num_cols,
            "columns": columns,
            "dtypes": dtypes,
            "sample_data": sample_rows
        }
        mapping_result[sheet] = sheet_info

        print(f"  Rows: {num_rows}, Columns: {num_cols}")
        print(f"  Headers: {columns}")

    # Export mapping result to JSON and Markdown
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    json_output = DOCS_DIR / "excel_sheet_mapping.json"
    with open(json_output, "w", encoding="utf-8") as f:
        def default_converter(o):
            return str(o)
        json.dump(mapping_result, f, indent=2, default=default_converter)

    # Markdown documentation export
    md_lines = [
        "# Excel Column Mapping & Sheet Structure (`REF/TSP MODUL.xlsx`)",
        "",
        "> Dokumentasi otomatis peta kolom dan struktur sheet kerja dalam file `REF/TSP MODUL.xlsx`.",
        "> **Tab yang dikecualikan (non-kerja)**: `Workflow`, `Panduan MB51`.",
        "",
    ]

    for sheet, info in mapping_result.items():
        md_lines.append(f"## Sheet: `{sheet}`")
        md_lines.append(f"- **Jumlah Baris**: {info['row_count']}")
        md_lines.append(f"- **Jumlah Kolom**: {info['column_count']}")
        md_lines.append("")
        md_lines.append("### Daftar Kolom & Data Type")
        md_lines.append("| No | Nama Kolom | Type Data | Sample Nilai |")
        md_lines.append("|---|---|---|---|")

        for idx, col in enumerate(info['columns'], start=1):
            dtype = info['dtypes'].get(col, "string")
            sample_val = "-"
            if info['sample_data'] and len(info['sample_data']) > 0:
                first_row = info['sample_data'][0]
                # Match column name directly or via list index
                val = first_row.get(col, list(first_row.values())[idx-1] if idx-1 < len(first_row) else None)
                if val is not None and not pd.isna(val):
                    sample_val = str(val).replace("\n", " ")
                    if len(sample_val) > 40:
                        sample_val = sample_val[:37] + "..."

            md_lines.append(f"| {idx} | `{col}` | `{dtype}` | {sample_val} |")
        md_lines.append("\n---")

    md_output = DOCS_DIR / "EXCEL_SHEET_MAPPING.md"
    md_output.write_text("\n".join(md_lines), encoding="utf-8")

    print(f"\n[Excel Parser] Mapping saved to JSON: {json_output}")
    print(f"[Excel Parser] Mapping saved to Markdown: {md_output}")


if __name__ == "__main__":
    analyze_excel()
