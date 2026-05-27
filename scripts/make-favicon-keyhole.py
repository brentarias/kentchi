"""
Emit a TRUE vector SVG (no embedded raster) of the keyhole emblem from
thumb-keyhole.png, tuned for favicon use:

  1. No "Kentchi" text.
  2. Keyhole enlarged to nearly fill the medallion.
  3. Embellishments kept but subtle (radiant rays + soft glow + a few faint
     stars) — they enrich large renders and fade out cleanly at 16px.
  4. Outer ring simplified to a single clean gold ring.

Colors sampled from K-monogram.png: navy #190D2B, gold #E4B423.
Writes public/favicon-keyhole.svg.
"""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "favicon-keyhole.svg"

# Keyhole geometry (viewBox 0..100). Round top + flared trapezoid stem.
KX = 50.0
CIRCLE_CY, CIRCLE_R = 38.0, 20.0
STEM_TOP_Y, STEM_TOP_HALF = 53.0, 8.5
STEM_BOT_Y, STEM_BOT_HALF = 80.0, 26.0

RAY_CX, RAY_CY = KX, CIRCLE_CY     # rays emanate from the round top's center
RAY_IN, RAY_OUT = 23.0, 40.0
N_RAYS = 20

# A few faint stars, placed in the open field, clear of the keyhole.
STARS = [
    (22, 24, 1.1), (78, 24, 1.1), (15, 49, 0.9), (85, 49, 0.9),
    (30, 14, 0.8), (70, 14, 0.8), (50, 9, 1.0),
]


def main() -> None:
    rays = []
    for i in range(N_RAYS):
        ang = (2 * math.pi / N_RAYS) * i
        x1 = RAY_CX + RAY_IN * math.cos(ang)
        y1 = RAY_CY + RAY_IN * math.sin(ang)
        x2 = RAY_CX + RAY_OUT * math.cos(ang)
        y2 = RAY_CY + RAY_OUT * math.sin(ang)
        rays.append(f'    <line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}"/>')
    rays_svg = "\n".join(rays)

    stars_svg = "\n".join(
        f'    <circle cx="{x}" cy="{y}" r="{r}"/>' for (x, y, r) in STARS
    )

    # Keyhole as a single path: arc for the round top, then down the flared stem.
    # Start at the left side where the circle meets the stem, sweep the top arc
    # clockwise to the right side, then trace the trapezoid down and back.
    keyhole_path = (
        f'M {KX - STEM_TOP_HALF:.2f} {STEM_TOP_Y:.2f} '
        f'L {KX - STEM_BOT_HALF:.2f} {STEM_BOT_Y:.2f} '
        f'L {KX + STEM_BOT_HALF:.2f} {STEM_BOT_Y:.2f} '
        f'L {KX + STEM_TOP_HALF:.2f} {STEM_TOP_Y:.2f} '
        f'A {CIRCLE_R:.2f} {CIRCLE_R:.2f} 0 1 0 '
        f'{KX - STEM_TOP_HALF:.2f} {STEM_TOP_Y:.2f} Z'
    )

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="#3a1a5c"/>
      <stop offset="100%" stop-color="#190D2B"/>
    </radialGradient>
    <linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="50" y1="18" x2="50" y2="80">
      <stop offset="0%" stop-color="#FFE3A6"/>
      <stop offset="55%" stop-color="#E4B423"/>
      <stop offset="100%" stop-color="#C8922E"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFD782" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#FFD782" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Navy field -->
  <circle cx="50" cy="50" r="50" fill="url(#bg)"/>

  <!-- Embellishments: soft glow + radiant rays + faint stars.
       All fade to nothing at favicon sizes; visible at large sizes. -->
  <circle cx="{RAY_CX}" cy="{RAY_CY}" r="30" fill="url(#glow)"/>
  <g stroke="#FFD782" stroke-width="0.7" stroke-opacity="0.22" stroke-linecap="round">
{rays_svg}
  </g>
  <g fill="#F5E7C8" fill-opacity="0.55">
{stars_svg}
  </g>

  <!-- Keyhole: round top + flared stem, vertical gold gradient -->
  <path d="{keyhole_path}" fill="url(#gold)"/>

  <!-- Simplified single gold ring -->
  <circle cx="50" cy="50" r="46.5" fill="none" stroke="#E4B423" stroke-width="3"/>
</svg>
'''
    OUT.write_text(svg, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}  ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
