#!/usr/bin/env python3
"""
extract_mag_boxes.py – vector‑grid edition
-----------------------------------------

Cut every 4 × 6 skill cell from the FIG *MAG 2025‑2028 Code of Points* PDF.
The script now **reads the table grid directly from the page’s vector lines** – no
OpenCV heuristics – and therefore works consistently on all pages whose skill
tables are laid out as six equal columns × four skill rows (we explicitly skip
the 5×3 Vault pages).

Usage
-----
    python extract_mag_boxes.py MAG_CoP.pdf --out skills --dpi 300 [--debug]

Dependencies (install inside a Conda env for wheels):
    conda install -c conda-forge pymupdf numpy

Key steps
~~~~~~~~~
1.  **Hard‑coded PAGE_MAP** ⇒ (event, EG) for every skill page.
2.  For each page in PAGE_MAP:
    • Walk the drawing paths with `page.get_drawings()`.
    • Collect **long vertical** and **long horizontal** lines (|Δx|<1 pt or |Δy|<1 pt
      and length > 100 pt).
    • Cluster duplicates that lie within ±2 pt.
    • Expect **7 vertical** & **≥7 horizontal** lines → a 6‑column table.
3.  Use the grid to crop the four skill rows (skip the two header rows).
4.  Inside each cell, parse the first integer as the **skill number**.
5.  Save cell as `<event>_<EG>_<num>.png` (or fallback `row_col`).

Only pages that match the 4×6 pattern are processed; others are silently
skipped. Use `--debug` to dump an overlay PNG that shows the detected grid.
"""

import argparse
import os
import re
from typing import List, Tuple, Optional

import fitz  # PyMuPDF
import numpy as np

# ---------------------------------------------------------------------------
# Hard‑coded page → (event, EG) map (1‑based PDF page numbers)
# ---------------------------------------------------------------------------
PAGE_MAP = {
    **{p: ("FX", "I") for p in range(28, 33)},
    **{p: ("FX", "II") for p in range(33, 35)},
    **{p: ("FX", "III") for p in range(35, 38)},
    38: ("FX", "IV"),

    **{p: ("PH", "I") for p in range(47, 49)},
    **{p: ("PH", "II") for p in range(49, 54)},
    **{p: ("PH", "III") for p in range(54, 58)},
    58: ("PH", "IV"),

    **{p: ("SR", "I") for p in range(65, 67)},
    **{p: ("SR", "II") for p in range(67, 73)},
    **{p: ("SR", "III") for p in range(73, 77)},
    **{p: ("SR", "IV") for p in range(77, 79)},

    # skip Vault table (page 84‑91) because it is 5×3 not 4×6

    **{p: ("PB", "I") for p in range(99, 102)},
    **{p: ("PB", "II") for p in range(101, 105)},
    **{p: ("PB", "III") for p in range(105, 109)},
    **{p: ("PB", "IV") for p in range(109, 111)},

    **{p: ("HB", "I") for p in range(121, 124)},
    **{p: ("HB", "II") for p in range(123, 128)},
    **{p: ("HB", "III") for p in range(127, 132)},
    **{p: ("HB", "IV") for p in range(133, 135)},
}

# ---------------------------------------------------------------------------
# Helpers for grid detection
# ---------------------------------------------------------------------------

def _cluster(coords: List[float], tol: float = 2.0) -> List[float]:
    """Merge coordinates that are within ±tol points of each other (PDF units)."""
    if not coords:
        return []
    coords = sorted(coords)
    merged = [coords[0]]
    for c in coords[1:]:
        if abs(c - merged[-1]) <= tol:
            merged[-1] = (merged[-1] + c) / 2  # average
        else:
            merged.append(c)
    return merged


def extract_grid_lines(page: fitz.Page, min_len: float = 100.0) -> Tuple[List[float], List[float]]:
    """Return sorted (x) vertical and (y) horizontal line positions.

    A line is a drawing segment with |dx|<1 pt or |dy|<1 pt and length>min_len.
    """
    v_coords, h_coords = [], []
    drawings = page.get_drawings()
    print(drawings)
    for d in drawings:
        if d["type"] != "path":
            continue
        for seg in d["items"]:  # ((x0,y0),(x1,y1), cmd)
            (x0, y0), (x1, y1), _ = seg
            dx, dy = x1 - x0, y1 - y0
            length = (dx * dx + dy * dy) ** 0.5
            if length < min_len:
                continue
            if abs(dx) < 1.0 and abs(dy) > 0:  # vertical
                v_coords.append(x0)
            elif abs(dy) < 1.0 and abs(dx) > 0:  # horizontal
                h_coords.append(y0)
    v_unique = _cluster(v_coords)
    h_unique = _cluster(h_coords)
    return sorted(v_unique), sorted(h_unique)

# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------
NUM_RE = re.compile(r"\b(\d{1,3}[A-Za-z]?)\b")


def extract_skill_number(text: str) -> Optional[str]:
    """Return first number-like token in the cell."""
    m = NUM_RE.search(text)
    return m.group(1) if m else None

# ---------------------------------------------------------------------------
# Main per‑page processing
# ---------------------------------------------------------------------------

def process_page(page: fitz.Page, pdf_page_num: int, out_dir: str, dpi: int = 300, debug: bool = False) -> List[str]:
    event_eg = PAGE_MAP.get(pdf_page_num)
    if not event_eg:
        print(f"No event info for page {pdf_page_num}")
        return []  # skip non‑skill pages
    event, eg = event_eg

    v_lines, h_lines = extract_grid_lines(page)
    if not (len(v_lines) == 7 and len(h_lines) >= 7):  # Expect 6 columns / ≥6 rows
        print(f"Unexpected grid lines for page {pdf_page_num}: {len(v_lines)} vertical, {len(h_lines)} horizontal")
        return []

    # We assume two header rows; skill rows start at idx 2 (inclusive) -> 6 (exclusive)
    skill_rows = h_lines[2:6]
    if len(skill_rows) < 4:
        print(f"Unexpected skill rows for page {pdf_page_num}: {len(skill_rows)}")
        return []

    os.makedirs(out_dir, exist_ok=True)

    filepaths = []
    for row_idx in range(4):
        y0 = h_lines[2 + row_idx]
        y1 = h_lines[3 + row_idx]
        for col_idx in range(6):
            x0 = v_lines[col_idx]
            x1 = v_lines[col_idx + 1]
            bbox = fitz.Rect(x0, y0, x1, y1)
            text = page.get_textbox(bbox) or ""
            num = extract_skill_number(text)
            if not num:
                num = f"{row_idx}{col_idx}"  # fallback
            filename = f"{event}_{eg}_{num}.png"
            filepath = os.path.join(out_dir, filename)
            pix = page.get_pixmap(clip=bbox, dpi=dpi, alpha=False)
            pix.save(filepath)
            filepaths.append(filepath)

    if debug:
        # overlay image with grid (for QA)
        dbg = page.get_pixmap(dpi=150, alpha=False).samples
        # Optionally implement a debug overlay save here.
        pass

    return filepaths

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Extract 4×6 skill boxes from the MAG Code of Points PDF (vector‑grid method).")
    p.add_argument("pdf", help="Path to Code of Points PDF")
    p.add_argument("--out", default="skills", help="Output directory")
    p.add_argument("--dpi", type=int, default=300, help="PNG resolution (default 300 dpi)")
    p.add_argument("--debug", action="store_true", help="Dump per‑page debug overlay images")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    doc = fitz.open(args.pdf)

    total = 0
    for idx, page in enumerate(doc):
        pdf_pnum = idx + 1  # convert to 1‑based
        n = process_page(page, pdf_pnum, args.out, args.dpi, args.debug)
        if n:
            print(f"Page {pdf_pnum:3d}: {n} boxes")
        total += n

    print(f"\nDone. Saved {total} box images into {os.path.abspath(args.out)}")


if __name__ == "__main__":
    main()

