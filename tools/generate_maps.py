import json
from pathlib import Path
import networkx as nx

WORKSPACE_ROOT = Path(__file__).parent.parent
DOCS_DIR = WORKSPACE_ROOT / "dokumentasi"

def create_maps():
    graph_path = DOCS_DIR / "code_graph.json"
    if not graph_path.exists():
        print("code_graph.json not found. Run graphify_codebase.py first.")
        return

    with open(graph_path, "r", encoding="utf-8") as f:
        graph_data = json.load(f)

    G = nx.DiGraph()
    for n, d in graph_data.get("nodes", []):
        G.add_node(n, **d)
    for u, v, d in graph_data.get("edges", []):
        G.add_edge(u, v, **d)

    functions = [n for n, d in G.nodes(data=True) if d.get("type") == "function"]

    # 1. SEMANTIC MAPPING
    semantic_clusters = {
        "Data Fetching": [],
        "Data Mutation": [],
        "UI & Render": [],
        "Utils & Helpers": [],
        "Scanner & Auth": [],
        "Others": []
    }
    
    for fn in functions:
        name = G.nodes[fn].get("name", "").lower()
        if any(kw in name for kw in ["get", "fetch", "load", "read", "find"]):
            semantic_clusters["Data Fetching"].append(fn)
        elif any(kw in name for kw in ["set", "update", "delete", "remove", "save", "write", "post", "create"]):
            semantic_clusters["Data Mutation"].append(fn)
        elif any(kw in name for kw in ["render", "show", "hide", "ui", "view", "display", "html"]):
            semantic_clusters["UI & Render"].append(fn)
        elif any(kw in name for kw in ["scan", "auth", "login", "validate", "token", "verify"]):
            semantic_clusters["Scanner & Auth"].append(fn)
        elif any(kw in name for kw in ["util", "helper", "format", "parse", "calc", "date"]):
            semantic_clusters["Utils & Helpers"].append(fn)
        else:
            semantic_clusters["Others"].append(fn)

    md_lines = ["# Semantic Mapping\n"]
    mmd_lines = ["graph TD"]
    
    for cluster, fns in semantic_clusters.items():
        if not fns: continue
        md_lines.append(f"## {cluster}")
        c_id = cluster.replace(' & ', '_').replace(' ', '_')
        mmd_lines.append(f"  subgraph {c_id} [{cluster}]")
        for fn in fns:
            fn_name = G.nodes[fn].get("name", fn)
            md_lines.append(f"- {fn_name} ({fn})")
            mmd_lines.append(f"    {fn.replace('::', '_').replace('.js', '_js')}:::semantic")
        mmd_lines.append("  end")
        md_lines.append("")

    (DOCS_DIR / "SEMANTIC_MAP.md").write_text("\n".join(md_lines), encoding="utf-8")
    (DOCS_DIR / "semantic_map.mmd").write_text("\n".join(mmd_lines), encoding="utf-8")

    # 2. NEURAL MAPPING (Layered topology)
    layers = {"Input (No Caller)": [], "Hidden (Intermediate)": [], "Output (No Callees)": []}
    
    for fn in functions:
        in_deg = G.in_degree(fn)
        out_deg = G.out_degree(fn)
        
        # relation='defines' gives +1 in-degree from file node. We only count 'calls'
        callers = [u for u, v, d in G.in_edges(fn, data=True) if d.get("relation") == "calls"]
        callees = [v for u, v, d in G.out_edges(fn, data=True) if d.get("relation") == "calls"]
        
        if len(callers) == 0:
            layers["Input (No Caller)"].append(fn)
        elif len(callees) == 0:
            layers["Output (No Callees)"].append(fn)
        else:
            layers["Hidden (Intermediate)"].append(fn)

    n_md_lines = ["# Neural Mapping (Execution Layers)\n"]
    n_mmd_lines = ["graph TD"]
    
    for layer, fns in layers.items():
        if not fns: continue
        n_md_lines.append(f"## {layer}")
        l_id = layer.split(' ')[0]
        n_mmd_lines.append(f"  subgraph {l_id} [\"{layer}\"]")
        for fn in fns:
            fn_name = G.nodes[fn].get("name", fn)
            n_md_lines.append(f"- {fn_name} ({fn})")
            n_mmd_lines.append(f"    {fn.replace('::', '_').replace('.js', '_js')}:::neural")
        n_mmd_lines.append("  end")
        n_md_lines.append("")
    
    # Add neural edges
    for u, v, d in G.edges(data=True):
        if d.get("relation") == "calls" and u in functions and v in functions:
            clean_u = u.replace('::', '_').replace('.js', '_js')
            clean_v = v.replace('::', '_').replace('.js', '_js')
            n_mmd_lines.append(f"  {clean_u} --> {clean_v}")

    (DOCS_DIR / "NEURAL_MAP.md").write_text("\n".join(n_md_lines), encoding="utf-8")
    (DOCS_DIR / "neural_map.mmd").write_text("\n".join(n_mmd_lines), encoding="utf-8")

    print("Created SEMANTIC_MAP.md, NEURAL_MAP.md and their .mmd files.")

if __name__ == "__main__":
    create_maps()
