"""
Verification Script for TSP Modul Environment & Tooling
-------------------------------------------------------
Verifies:
1. Python environment and installed libraries (LangGraph, Graphify, NetworkX, Pandas, etc.)
2. Graphify Codebase Tool execution
3. Mermaid Generator Tool execution
4. LangGraph Agent State Machine execution
5. GitNexus status and repository index
"""

import os
import sys
import subprocess
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).parent.parent

# Ensure .venv site-packages is in sys.path if invoked directly
venv_site_packages = WORKSPACE_ROOT / ".venv" / "Lib" / "site-packages"
if venv_site_packages.exists() and str(venv_site_packages) not in sys.path:
    sys.path.insert(0, str(venv_site_packages))


def check_python_packages():
    print("\n--- 1. Checking Python Libraries ---")
    required = [
        "langgraph",
        "langchain",
        "pydantic",
        "networkx",
        "matplotlib",
        "pandas",
        "openpyxl",
        "pytest",
        "ruff",
        "black",
    ]
    all_ok = True
    for pkg in required:
        try:
            __import__(pkg)
            print(f"  [OK] {pkg}")
        except ImportError as e:
            print(f"  [FAIL] {pkg} not imported: {e}")
            all_ok = False
    return all_ok


def check_graphify():
    print("\n--- 2. Checking Graphify Tooling ---")
    script = WORKSPACE_ROOT / "tools" / "graphify_codebase.py"
    res = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    stdout = (res.stdout or "").strip()
    stderr = (res.stderr or "").strip()
    if res.returncode == 0:
        print("  [OK] Graphify executed successfully:")
        print(f"       {stdout}")
        return True
    else:
        print(f"  [FAIL] Graphify error: {stderr}")
        return False


def check_mermaid():
    print("\n--- 3. Checking Mermaid Generator ---")
    script = WORKSPACE_ROOT / "tools" / "mermaid_generator.py"
    res = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    stdout = (res.stdout or "").strip()
    stderr = (res.stderr or "").strip()
    if res.returncode == 0:
        print("  [OK] Mermaid generator executed successfully:")
        print(f"       {stdout}")
        return True
    else:
        print(f"  [FAIL] Mermaid generator error: {stderr}")
        return False


def check_langgraph():
    print("\n--- 4. Checking LangGraph Agent Engine ---")
    script = WORKSPACE_ROOT / "tools" / "langgraph_agent.py"
    res = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    stdout = (res.stdout or "").strip()
    stderr = (res.stderr or "").strip()
    if res.returncode == 0:
        print("  [OK] LangGraph agent executed successfully:")
        print(f"       {stdout}")
        return True
    else:
        print(f"  [FAIL] LangGraph agent error: {stderr}")
        return False


def check_gitnexus():
    print("\n--- 5. Checking GitNexus CLI ---")
    res = subprocess.run(
        ["npx", "gitnexus", "status"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=True
    )
    stdout = (res.stdout or "").strip()
    stderr = (res.stderr or "").strip()
    if res.returncode == 0:
        print("  [OK] GitNexus status:")
        print(f"       {stdout}")
        return True
    else:
        print(f"  [FAIL] GitNexus status error: {stderr if stderr else stdout}")
        return False


def main():
    print("==================================================")
    print("  TSP MODUL ENVIRONMENT & TOOLS VERIFICATION     ")
    print("==================================================")

    p1 = check_python_packages()
    p2 = check_graphify()
    p3 = check_mermaid()
    p4 = check_langgraph()
    p5 = check_gitnexus()

    print("\n==================================================")
    if p1 and p2 and p3 and p4 and p5:
        print(" SUCCESS: All Python tools, GitNexus, Graphify, LangGraph & Mermaid are fully operational!")
    else:
        print(" WARNING: Some components returned failures. Check logs above.")
    print("==================================================")


if __name__ == "__main__":
    main()
