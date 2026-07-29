from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw


source_dir = Path(sys.argv[1])
output_path = Path(sys.argv[2])
paths = sorted(source_dir.glob("page-*.png"))
images = [Image.open(path).convert("RGB") for path in paths]

thumb_width = 680
thumbs = []
for image in images:
    ratio = thumb_width / image.width
    thumbs.append(image.resize((thumb_width, int(image.height * ratio))))

gap = 28
label_height = 34
columns = 2
rows = (len(thumbs) + columns - 1) // columns
cell_height = max(image.height for image in thumbs) + label_height
sheet = Image.new(
    "RGB",
    (columns * thumb_width + (columns + 1) * gap, rows * cell_height + (rows + 1) * gap),
    "white",
)
draw = ImageDraw.Draw(sheet)
for index, image in enumerate(thumbs):
    row, column = divmod(index, columns)
    x = gap + column * (thumb_width + gap)
    y = gap + row * (cell_height + gap)
    draw.text((x, y), f"Page {index + 1}", fill="black")
    sheet.paste(image, (x, y + label_height))

sheet.save(output_path, quality=92)
print(output_path)
