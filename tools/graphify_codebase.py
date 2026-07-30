"""
Graphify Codebase Tool for TSP Modul
------------------------------------
Parses JavaScript files and Markdown documentation in TSP Modul,
constructs a NetworkX dependency/call graph, calculates centrality metrics,
and exports JSON and Mermaid graph representations.
"""

import json
import re
from pathlib import Path
import networkx as nx

WORKSPACE_ROOT = Path(__file__).parent.parent
ACTIVE_DIR = WORKSPACE_ROOT / "Active"
DOCS_DIR = WORKSPACE_ROOT / "dokumentasi"


def extract_js_functions(file_path: Path):
    """Extract function declarations and call references from a JS file."""
    content = file_path.read_text(encoding="utf-8")
    filename = file_path.name

    # Regex for function declarations: function funcName(...)
    funcs = re.findall(r"function\s+([a-zA-Z0-9_$]+)\s*\(", content)

    # Regex for function calls: funcName(...)
    all_calls = re.findall(r"([a-zA-Z0-9_$]+)\s*\(", content)

    return filename, set(funcs), all_calls


def build_codebase_graph():
    """Build NetworkX Graph from JS files in Active/."""
    G = nx.DiGraph()

    file_funcs = {}
    func_to_file = {}

    js_files = list(ACTIVE_DIR.glob("*.js"))
    for js_file in js_files:
        filename, funcs, calls = extract_js_functions(js_file)
        file_funcs[filename] = {"funcs": funcs, "calls": calls}
        G.add_node(filename, type="file")

        for fn in funcs:
            func_node = f"{filename}::{fn}"
            G.add_node(func_node, type="function", file=filename, name=fn)
            G.add_edge(filename, func_node, relation="defines")
            func_to_file[fn] = func_node

    # Link function calls
    for filename, data in file_funcs.items():
        for call_name in data["calls"]:
            if call_name in func_to_file:
                target_node = func_to_file[call_name]
                source_file = filename
                if not G.has_edge(source_file, target_node):
                    G.add_edge(source_file, target_node, relation="calls")

    return G


def export_graph_summary(G: nx.DiGraph):
    """Export summary metrics and Mermaid chart."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Export JSON representation
    graph_data = {
        "nodes": list(G.nodes(data=True)),
        "edges": [(u, v, d) for u, v, d in G.edges(data=True)],
        "metrics": {
            "num_nodes": G.number_of_nodes(),
            "num_edges": G.number_of_edges(),
            "degree_centrality": nx.degree_centrality(G)
            if len(G) > 0
            else {},
        },
    }

    json_path = DOCS_DIR / "code_graph.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(graph_data, f, indent=2)

    # 2. Export Mermaid diagram (.mmd)
    mermaid_lines = ["graph TD"]
    for u, v, d in G.edges(data=True):
        rel = d.get("relation", "")
        clean_u = u.replace(".js", "_js").replace("::", "_")
        clean_v = v.replace(".js", "_js").replace("::", "_")
        if rel == "defines":
            mermaid_lines.append(f"  {clean_u} -->|defines| {clean_v}")
        elif rel == "calls":
            mermaid_lines.append(f"  {clean_u} -.->|calls| {clean_v}")

    mmd_path = DOCS_DIR / "code_graph.mmd"
    mmd_path.write_text("\n".join(mermaid_lines), encoding="utf-8")

    print(f"[Graphify] Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")
    print(f"[Graphify] Saved JSON graph to {json_path}")
    print(f"[Graphify] Saved Mermaid graph to {mmd_path}")


if __name__ == "__main__":
    g = build_codebase_graph()
    export_graph_summary(g)
