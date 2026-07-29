from __future__ import annotations

import sys
from pathlib import Path

import fitz


pdf_path = Path(sys.argv[1])
output_dir = Path(sys.argv[2])
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(pdf_path)
for index, page in enumerate(document, 1):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.7, 1.7), alpha=False)
    pixmap.save(output_dir / f"page-{index}.png")

print(f"{len(document)} pages")
