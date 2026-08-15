"""
Kaggriculture Submission Bundler
Bundles state_helper.py, market_engine.py, pathfinder.py, and multi_tile_planner.py
into a clean, 100% pure Python single-file agent submission.
"""

import os
import re

BOT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BOT_DIR, "submission_main.py")

MODULES = [
    "state_helper.py",
    "market_engine.py",
    "pathfinder.py",
    "multi_tile_planner.py"
]

module_names = [m.replace(".py", "") for m in MODULES]

def clean_python_code(code_str):
    # Remove triple-quoted docstrings
    code_str = re.sub(r'"""[\s\S]*?"""', '', code_str)
    code_str = re.sub(r"'''[\s\S]*?'''", '', code_str)
    
    clean_lines = []
    in_multiline_docstring = False
    
    for line in code_str.splitlines():
        stripped = line.strip()
        # Skip intra-module imports
        if (stripped.startswith("from .") or 
            stripped.startswith("import .") or 
            any(stripped.startswith(f"from {m}") for m in module_names) or
            any(stripped.startswith(f"import {m}") for m in module_names)):
            continue
        clean_lines.append(line)
        
    return "\n".join(clean_lines)

def build_standalone_agent():
    combined_code = [
        "# Kaggriculture Autonomous Tournament Agent",
        "import math",
        "import sys",
        "import os\n"
    ]

    for mod in MODULES:
        filepath = os.path.join(BOT_DIR, mod)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                cleaned = clean_python_code(content)
                combined_code.append(f"# --- {mod} ---")
                combined_code.append(cleaned)
                combined_code.append("\n")

    # Add main agent wrapper
    combined_code.append("""
planner_instance = None

def agent(obs):
    global planner_instance
    if planner_instance is None:
        planner_instance = MultiTilePlanner()

    try:
        return planner_instance.plan_turn(obs)
    except Exception as e:
        return {"farmer": ["PASS"], "hands": [], "market": []}
""")

    final_code = "\n".join(combined_code)

    # Validate Python syntax before saving
    try:
        compile(final_code, "<string>", "exec")
        print("Python syntax validation PASSED!")
    except Exception as err:
        print(f"Syntax validation FAILED: {err}")
        return

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write(final_code)

    print(f"Clean self-contained submission generated at: {OUTPUT_FILE}")

if __name__ == "__main__":
    build_standalone_agent()
