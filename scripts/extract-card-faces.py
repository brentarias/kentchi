#!/usr/bin/env python
"""
extract-card-faces.py — render composed oracle-card faces from a deck PDF.

The deck PDFs lay out one finished card per page: ornate frame, the cropped
artwork, the card name and number. That composed face is what a shopper needs
to see in the /decks carousels — the loose paintings in the site gallery are
the *originals*, before cropping and card layout, so they misrepresent the
product.

Renders whole pages rather than pulling the embedded images out, because the
embedded raster is only the artwork layer: no frame, no title, no number.

    python scripts/extract-card-faces.py <deck.pdf> --prefix ww --out DIR
    python scripts/extract-card-faces.py <deck.pdf> --prefix ww --out DIR --cards 1,7,14
    python scripts/extract-card-faces.py <deck.pdf> --list

Output names are <prefix>_<number>_<slugified name>.jpg, e.g.
ww_14_feathered_serpent.jpg, matching the naming already used for the Shinan
card assets on Cloudinary.
"""
import argparse
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

# Long side of the rendered card. 1200 matches the Shinan card assets already
# in Cloudinary, so both carousels sit at the same scale.
#
# Note this is an upscale: the raster layers inside these PDFs are native to a
# card height of roughly 830px. The frame and lettering are vector and do get
# genuinely sharper, but the painting itself is interpolated above ~830px. If
# higher-resolution card exports ever surface, re-run against those instead.
TARGET_LONG_SIDE = 1200
JPEG_QUALITY = 88


def card_entries(doc):
    """[(page_index, number, name)] — read from each page's own text."""
    out = []
    for i, page in enumerate(doc):
        lines, seen = [], set()
        for raw in page.get_text().strip().split("\n"):
            line = raw.strip()
            if line and line not in seen:
                seen.add(line)
                lines.append(line)
        if not lines:
            continue
        number = lines[0] if lines[0].isdigit() else str(i + 1)
        # Titles can arrive split across lines ("Maloka" / "Spaceship"); the
        # longest remaining line is the fullest rendering of the name.
        rest = [l for l in lines[1:]] or [f"card-{number}"]
        name = max(rest, key=len)
        out.append((i, int(number), name))
    return out


def slugify(name):
    s = name.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--prefix", default="card", help="asset name prefix, e.g. ww")
    ap.add_argument("--out", default="scratch_pad/ww-cards")
    ap.add_argument("--cards", help="comma-separated card numbers; default all")
    ap.add_argument("--list", action="store_true", help="list cards and exit")
    args = ap.parse_args()

    pdf = Path(args.pdf)
    if not pdf.exists():
        sys.exit(f"No such file: {pdf}")
    doc = fitz.open(pdf)
    entries = card_entries(doc)

    if args.list:
        for _, number, name in entries:
            print(f"{number:>3}  {name}   ->  {args.prefix}_{number}_{slugify(name)}.jpg")
        return

    wanted = None
    if args.cards:
        wanted = {int(c) for c in args.cards.split(",") if c.strip()}
        missing = wanted - {n for _, n, _ in entries}
        if missing:
            sys.exit(f"Card number(s) not in this PDF: {sorted(missing)}")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    for page_index, number, name in entries:
        if wanted is not None and number not in wanted:
            continue
        page = doc[page_index]
        zoom = TARGET_LONG_SIDE / max(page.rect.width, page.rect.height)
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        dest = out_dir / f"{args.prefix}_{number}_{slugify(name)}.jpg"
        pix.save(dest, jpg_quality=JPEG_QUALITY)
        print(f"card {number:>3}  {name:<28} -> {dest}  ({pix.width}x{pix.height})")


if __name__ == "__main__":
    main()
