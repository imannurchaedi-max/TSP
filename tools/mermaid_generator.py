"""
Mermaid Generator for TSP Modul
------------------------------
Generates Mermaid diagrams for 6 Checkpoint State Machine and Barcode Lifecycle.
"""

from pathlib import Path
import subprocess

WORKSPACE_ROOT = Path(__file__).parent.parent
DOCS_DIR = WORKSPACE_ROOT / "dokumentasi"


CHECKPOINT_MERMAID = """```mermaid
graph TD
    classDef wrm fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef tsp fill:#fff3e0,stroke:#f57c00,stroke-width:2px;
    classDef operator fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;

    WRM[WRM Gudang: Pallet Registry]:::wrm -->|1. terima_wrm| StockTSP[Stock TSP Barcode Induk]:::tsp
    StockTSP -->|2. kirim_mesin: Split Qty| ChildBarcode[Barcode Anak - Urutan 01, 02...]:::tsp
    ChildBarcode -->|3. terima_operator| OperatorStock[Stock Mesin / Operator]:::operator
    OperatorStock -->|4. consume_operator| Consumed[Barang Diconsume / Habis]:::operator
    OperatorStock -->|5. retur_dari_mesin| StockTSP
    StockTSP -->|6. retur_ke_wrm| WRM
```"""


def generate_mermaid_docs():
    """Write Mermaid documentation markdown and .mmd file."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    
    mermaid_md_path = DOCS_DIR / "STATE_MACHINE_DIAGRAM.md"
    content = f"# TSP Modul State Machine & Barcode Lifecycle\n\n{CHECKPOINT_MERMAID}\n"
    mermaid_md_path.write_text(content, encoding="utf-8")
    
    mmd_path = DOCS_DIR / "state_machine.mmd"
    # Clean code block ticks
    raw_mermaid = CHECKPOINT_MERMAID.replace("```mermaid\n", "").replace("\n```", "")
    mmd_path.write_text(raw_mermaid, encoding="utf-8")
    
    print(f"[Mermaid Generator] Written diagram to {mermaid_md_path}")
    print(f"[Mermaid Generator] Written raw .mmd to {mmd_path}")

    # Attempt rendering PNG via npx @mermaid-js/mermaid-cli if installed
    png_path = DOCS_DIR / "state_machine.png"
    try:
        res = subprocess.run(
            ["npx", "--no-install", "mmdc", "-i", str(mmd_path), "-o", str(png_path)],
            capture_output=True,
            text=True,
            shell=True
        )
        if res.returncode == 0:
            print(f"[Mermaid CLI] Successfully generated image: {png_path}")
        else:
            print(f"[Mermaid CLI] mmdc render notice: {res.stderr.strip()}")
    except Exception as e:
        print(f"[Mermaid CLI] Note: mmdc render skipped ({e})")


if __name__ == "__main__":
    generate_mermaid_docs()
