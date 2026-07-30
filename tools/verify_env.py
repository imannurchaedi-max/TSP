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

import sys
import subprocess
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).parent.parent


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
        except ImportError:
            print(f"  [FAIL] {pkg} not imported")
            all_ok = False
    return all_ok


def check_graphify():
    print("\n--- 2. Checking Graphify Tooling ---")
    script = WORKSPACE_ROOT / "tools" / "graphify_codebase.py"
    res = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
    if res.returncode == 0:
        print("  [OK] Graphify executed successfully:")
        print(f"       {res.stdout.strip()}")
        return True
    else:
        print(f"  [FAIL] Graphify error: {res.stderr}")
        return False


def check_mermaid():
    print("\n--- 3. Checking Mermaid Generator ---")
    script = WORKSPACE_ROOT / "tools" / "mermaid_generator.py"
    res = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
    if res.returncode == 0:
        print("  [OK] Mermaid generator executed successfully:")
        print(f"       {res.stdout.strip()}")
        return True
    else:
        print(f"  [FAIL] Mermaid generator error: {res.stderr}")
        return False


def check_langgraph():
    print("\n--- 4. Checking LangGraph Agent Engine ---")
    script = WORKSPACE_ROOT / "tools" / "langgraph_agent.py"
    res = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
    if res.returncode == 0:
        print("  [OK] LangGraph agent executed successfully:")
        print(f"       {res.stdout.strip()}")
        return True
    else:
        print(f"  [FAIL] LangGraph agent error: {res.stderr}")
        return False


def check_gitnexus():
    print("\n--- 5. Checking GitNexus CLI ---")
    res = subprocess.run(["npx", "gitnexus", "status"], capture_output=True, text=True, shell=True)
    if res.returncode == 0:
        print("  [OK] GitNexus status:")
        print(f"       {res.stdout.strip()}")
        return True
    else:
        print(f"  [FAIL] GitNexus status error: {res.stderr}")
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
