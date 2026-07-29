from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(r"C:\PROJETS\madgi-esr\.codex-esr-audit")

for path in sorted(list(ROOT.glob("*.xlsx.json")) + list(ROOT.glob("*.xlsm.json"))):
    data = json.loads(path.read_text(encoding="utf-8"))
    print(f"\n### {path.name}")
    for sheet in data.get("sheets", []):
        values = sheet["nonempty"]
        formulas = sheet["formulas"]
        print(
            f"{sheet['name']} | dimensions={sheet['max_row']}x{sheet['max_column']} "
            f"| cellules={len(values)} | formules={len(formulas)}"
        )
        print(
            "VALEURS: "
            + " | ".join(
                f"{item['cell']}={item['value']}" for item in values[:25]
            )
        )
        print(
            "FORMULES: "
            + " | ".join(
                f"{item['cell']}:{item['formula']}=>{item['computed']}"
                for item in formulas[:18]
            )
        )
