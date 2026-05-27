"""
OG images built on the thumb-keyhole emblem (cosmic purple field, gold
radiant keyhole, faint stars, gold double-ring "seal").

Outputs (full-bleed, opaque — OG images must not be transparent):
  og-keyhole-large.jpg         1200x630  seal-on-field, "KENT" above the
                                          keyhole and "OSBORN" below; emblem
                                          kept inside the center 630 square so
                                          it survives square-cropping.
  og-keyhole-square.jpg         800x800   square cut, with KENT / OSBORN.
  og-keyhole-square-notext.jpg  800x800   square cut, text-free.
"""
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "public"

GOLD = (210, 172, 104)
GOLD_BRIGHT = (255, 219, 130)
CREAM = (245, 231, 200)
PURPLE_MID = (58, 26, 92)
PURPLE_DEEP = (26, 10, 43)


def find_font(candidates, size):
    for name in candidates:
        for base in ("C:/Windows/Fonts/", "/usr/share/fonts/", "/Library/Fonts/"):
            p = Path(base) / name
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def radial_field(w, h, cx, cy, inner, outer):
    """Full-bleed radial gradient (rendered small, upscaled — smooth + fast)."""
    sf = 4
    sw, sh = w // sf, h // sf
    scx, scy = cx / sf, cy / sf
    maxr = math.hypot(max(scx, sw - scx), max(scy, sh - scy))
    img = Image.new("RGB", (sw, sh), outer)
    d = ImageDraw.Draw(img)
    steps = int(maxr)
    for i in range(steps, 0, -1):
        t = i / steps
        d.ellipse((scx - i, scy - i, scx + i, scy + i), fill=lerp(inner, outer, t))
    return img.resize((w, h), Image.LANCZOS)


def scatter_stars(img, seed, n, region=None):
    d = ImageDraw.Draw(img, "RGBA")
    rnd = random.Random(seed)
    W, H = img.size
    x0, y0, x1, y1 = region or (0, 0, W, H)
    for _ in range(n):
        x = rnd.uniform(x0, x1)
        y = rnd.uniform(y0, y1)
        s = rnd.choice([1, 1, 1.5, 2])
        a = rnd.randint(50, 150)
        d.ellipse((x - s, y - s, x + s, y + s), fill=(*CREAM, a))


def radiance(img, cx, cy, r_in, r_out, glow_r, n=28):
    """Soft gold glow + radiant rays behind the keyhole."""
    W, H = img.size
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r), fill=(*GOLD_BRIGHT, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(glow_r // 3))
    img.alpha_composite(glow)

    rays = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    for i in range(n):
        ang = (2 * math.pi / n) * i
        x1 = cx + r_in * math.cos(ang)
        y1 = cy + r_in * math.sin(ang)
        x2 = cx + r_out * math.cos(ang)
        y2 = cy + r_out * math.sin(ang)
        rd.line((x1, y1, x2, y2), fill=(*GOLD_BRIGHT, 45), width=2)
    img.alpha_composite(rays.filter(ImageFilter.GaussianBlur(1)))


def draw_keyhole(img, cx, top_y, circle_r, stem_top_half, stem_bot_half, stem_bottom_y):
    W, H = img.size
    circle_cy = top_y + circle_r
    stem_top_y = circle_cy + circle_r * 0.55
    trap = [
        (cx - stem_top_half, stem_top_y),
        (cx + stem_top_half, stem_top_y),
        (cx + stem_bot_half, stem_bottom_y),
        (cx - stem_bot_half, stem_bottom_y),
    ]
    # glow under keyhole
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((cx - circle_r - 8, circle_cy - circle_r - 8, cx + circle_r + 8, circle_cy + circle_r + 8), fill=(*GOLD_BRIGHT, 110))
    gd.polygon(trap, fill=(*GOLD_BRIGHT, 110))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(12)))

    # solid keyhole with vertical gold gradient
    keymask = Image.new("L", (W, H), 0)
    km = ImageDraw.Draw(keymask)
    km.ellipse((cx - circle_r, circle_cy - circle_r, cx + circle_r, circle_cy + circle_r), fill=255)
    km.polygon(trap, fill=255)
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    y0, y1 = int(top_y), int(stem_bottom_y)
    for y in range(y0, y1 + 1):
        t = (y - y0) / max(1, (y1 - y0))
        gd.line((0, y, W, y), fill=(*lerp(GOLD_BRIGHT, GOLD, t), 255))
    img.paste(grad, (0, 0), keymask)


def draw_ring(img, cx, cy, r):
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(*GOLD, 255), width=max(6, r // 45))
    inner = int(r * 0.94)
    d.ellipse((cx - inner, cy - inner, cx + inner, cy + inner), outline=(*GOLD, 150), width=2)


def fit_font(words, max_w, base_size, spacing=" "):
    """Largest font (<= base_size) at which every word's letter-spaced width
    fits within max_w. Sizing to the longest word keeps glyphs consistent."""
    d = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    size = base_size
    while size > 18:
        f = find_font(["georgiab.ttf", "Georgia Bold.ttf", "DejaVuSerif-Bold.ttf"], size)
        widest = max(d.textlength(spacing.join(list(w.upper())), font=f) for w in words)
        if widest <= max_w:
            return f
        size -= 2
    return find_font(["georgiab.ttf", "Georgia Bold.ttf", "DejaVuSerif-Bold.ttf"], 18)


def caps(img, text, cx, baseline_y, font, spacing=" "):
    """Centered, letter-spaced gold caps with a soft shadow."""
    W, H = img.size
    spaced = spacing.join(list(text.upper()))
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), spaced, font=font)
    tw = bbox[2] - bbox[0]
    tx = cx - tw // 2
    ty = baseline_y
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((tx + 2, ty + 3), spaced, font=font, fill=(0, 0, 0, 170))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(2)))
    ImageDraw.Draw(img).text((tx, ty), spaced, font=font, fill=(*GOLD, 255))


def draw_star(d, cx, cy, r, color):
    inr = r * 0.38
    pts = [
        (cx, cy - r), (cx + inr, cy - inr), (cx + r, cy), (cx + inr, cy + inr),
        (cx, cy + r), (cx - inr, cy + inr), (cx - r, cy), (cx - inr, cy - inr),
    ]
    d.polygon(pts, fill=color)


def draw_rect_frame(img, inset):
    """Gold double-rule rectangular border with small star corner ornaments."""
    W, H = img.size
    d = ImageDraw.Draw(img, "RGBA")
    o = inset
    d.rectangle((o, o, W - o, H - o), outline=(*GOLD, 255), width=3)
    i = inset + 12
    d.rectangle((i, i, W - i, H - i), outline=(*GOLD, 140), width=1)
    for (cx, cy) in [(o, o), (W - o, o), (o, H - o), (W - o, H - o)]:
        draw_star(d, cx, cy, 11, (*GOLD_BRIGHT, 255))


def build_fullbleed():
    W, H = 1200, 630
    cx = 600
    img = radial_field(W, H, cx, 300, PURPLE_MID, PURPLE_DEEP).convert("RGBA")
    scatter_stars(img, seed=41, n=110)
    # Wider, more dramatic radiance spreading across the landscape.
    radiance(img, cx, 300, r_in=72, r_out=320, glow_r=240, n=36)
    draw_keyhole(img, cx, top_y=180, circle_r=70, stem_top_half=30, stem_bot_half=92, stem_bottom_y=452)
    f = fit_font(["KENT", "OSBORN"], max_w=540, base_size=62, spacing="  ")
    caps(img, "Kent", cx, 96, f, spacing="  ")
    caps(img, "Osborn", cx, 488, f, spacing="  ")
    draw_rect_frame(img, inset=26)
    img.convert("RGB").save(PUB / "og-keyhole-large-fullbleed.jpg", "JPEG", quality=88, optimize=True, progressive=True)
    print("wrote og-keyhole-large-fullbleed.jpg (1200x630)")


def build_large():
    W, H = 1200, 630
    cx, cy = 600, 315
    img = radial_field(W, H, cx, 290, PURPLE_MID, PURPLE_DEEP).convert("RGBA")
    scatter_stars(img, seed=11, n=90)
    radiance(img, cx, 285, r_in=66, r_out=205, glow_r=180)
    draw_keyhole(img, cx, top_y=200, circle_r=58, stem_top_half=25, stem_bot_half=74, stem_bottom_y=405)
    f = fit_font(["KENT", "OSBORN"], max_w=420, base_size=52)
    caps(img, "Kent", cx, 132, f)
    caps(img, "Osborn", cx, 470, f)
    draw_ring(img, cx, cy, 300)
    img.convert("RGB").save(PUB / "og-keyhole-large.jpg", "JPEG", quality=88, optimize=True, progressive=True)
    print("wrote og-keyhole-large.jpg (1200x630)")


def build_square(with_text):
    W = H = 800
    cx, cy = 400, 400
    img = radial_field(W, H, cx, cy, PURPLE_MID, PURPLE_DEEP).convert("RGBA")
    scatter_stars(img, seed=23, n=70)
    radiance(img, cx, 388, r_in=90, r_out=265, glow_r=230)
    draw_keyhole(img, cx, top_y=300, circle_r=80, stem_top_half=34, stem_bot_half=100, stem_bottom_y=548)
    if with_text:
        f = fit_font(["KENT", "OSBORN"], max_w=560, base_size=66)
        caps(img, "Kent", cx, 168, f)
        caps(img, "Osborn", cx, 600, f)
    draw_ring(img, cx, cy, 392)
    name = "og-keyhole-square.jpg" if with_text else "og-keyhole-square-notext.jpg"
    img.convert("RGB").save(PUB / name, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"wrote {name} (800x800){' with text' if with_text else ' text-free'}")


if __name__ == "__main__":
    build_large()
    build_fullbleed()
    build_square(with_text=True)
    build_square(with_text=False)
