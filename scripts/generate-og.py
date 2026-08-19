#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Генератор OG-превью (соцсети) для портфолио.

Рисует карточку 1200x630 в стилистике сайта и сохраняет в public/og-image.png.
Запуск:  python scripts/generate-og.py
"""

import os
from PIL import Image, ImageDraw, ImageFont

# ── Палитра сайта (src/index.css) ─────────────────────────────────────────────
BG      = (8, 8, 24)          # --bg          #080818
ACCENT  = (199, 112, 240)     # --accent      #c770f0
ACCENT2 = (56, 189, 248)      # --accent2     #38bdf8
TEXT    = (226, 232, 240)     # --text        #e2e8f0
MUTED   = (100, 116, 139)     # --text-muted  #64748b
DIM     = (148, 163, 184)
GREEN   = (74, 222, 128)
STR     = (134, 239, 172)     # строки в код-карточке

W, H = 1200, 630
X = 84                        # левое поле

# ── Шрифты (системные Windows: Raleway с сайта локально недоступен) ──────────
FONT_DIR = os.environ.get("WINDIR", "C:/Windows") + "/Fonts/"

def font(name, size):
    return ImageFont.truetype(FONT_DIR + name, size)

F_TITLE  = font("seguibl.ttf", 88)   # Segoe UI Black — заголовок
F_NAME   = font("seguisb.ttf", 34)   # Semibold       — имя
F_BODY   = font("segoeui.ttf", 25)   # Regular        — стек
F_BADGE  = font("seguisb.ttf", 17)   # Semibold       — плашка
F_URL    = font("segoeui.ttf", 21)
F_CODE   = font("consola.ttf", 18)   # Consolas       — код-карточка
F_CODE_S = font("consola.ttf", 15)

TRACK = 1.6                          # разрядка плашки


# ── Помощники ────────────────────────────────────────────────────────────────
def radial_blob(size, color, alpha, falloff=2.2):
    """Мягкое цветное пятно — аналог .blob на сайте. Возвращает RGBA-слой."""
    r = 192
    mask = Image.new("L", (r, r))
    px = mask.load()
    c = (r - 1) / 2
    for y in range(r):
        for x in range(r):
            d = (((x - c) ** 2 + (y - c) ** 2) ** 0.5) / c
            px[x, y] = int(max(0.0, 1.0 - d) ** falloff * alpha)
    layer = Image.new("RGBA", (size, size), color + (0,))
    layer.putalpha(mask.resize((size, size), Image.BICUBIC))
    return layer


def h_gradient(size, c1, c2):
    """Горизонтальный градиент c1 → c2."""
    w, h = size
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for x in range(w):
        t = x / max(1, w - 1)
        d.line([(x, 0), (x, h)], fill=tuple(
            int(a + (b - a) * t) for a, b in zip(c1, c2)
        ))
    return img


def gradient_text(target, xy, text, fnt, c1, c2):
    """Текст, залитый градиентом — как .section-title на сайте."""
    tw = int(fnt.getlength(text)) + 4
    th = sum(fnt.getmetrics())
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).text((0, 0), text, font=fnt, fill=255)
    target.paste(h_gradient((tw, th), c1, c2), xy, mask)


def tracked(draw, xy, text, fnt, fill, tracking=TRACK):
    """Текст с разрядкой между буквами."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += fnt.getlength(ch) + tracking
    return x - xy[0]


def tracked_width(text, fnt, tracking=TRACK):
    return sum(fnt.getlength(c) + tracking for c in text)


# ══ 1. Фон + все полупрозрачные слои — один композит ═════════════════════════
img = Image.new("RGBA", (W, H), BG + (255,))

for layer, pos in (
    (radial_blob(900, ACCENT, 86), (W - 620, -280)),
    (radial_blob(820, ACCENT2, 64), (-300, H - 480)),
):
    img.alpha_composite(layer, pos)

soft = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(soft)

# точечная сетка — лёгкая техно-текстура
for gy in range(40, H, 34):
    for gx in range(40, W, 34):
        sd.ellipse([gx, gy, gx + 1, gy + 1], fill=(255, 255, 255, 16))

# плашка «Открыт для новых проектов»
BADGE = "ОТКРЫТ ДЛЯ НОВЫХ ПРОЕКТОВ"
PILL_W = int(tracked_width(BADGE, F_BADGE)) + 68
sd.rounded_rectangle([X, 86, X + PILL_W, 132], radius=23,
                     fill=(255, 255, 255, 12), outline=(255, 255, 255, 30), width=1)

# код-карточка справа — эхо hero-секции
CX, CY, CW, CH = 742, 176, 374, 268
sd.rounded_rectangle([CX, CY, CX + CW, CY + CH], radius=16,
                     fill=(255, 255, 255, 10), outline=(255, 255, 255, 26), width=1)
sd.line([CX + 1, CY + 44, CX + CW - 1, CY + 44], fill=(255, 255, 255, 20), width=1)

img = Image.alpha_composite(img, soft).convert("RGB")

# ══ 2. Непрозрачный текст и детали ══════════════════════════════════════════
d = ImageDraw.Draw(img)

# плашка: зелёная точка + разряжённый текст
d.ellipse([X + 26, 105, X + 34, 113], fill=GREEN)
tracked(d, (X + 46, 99), BADGE, F_BADGE, DIM)

# заголовок
d.text((X, 158), "Full Stack", font=F_TITLE, fill=TEXT)
gradient_text(img, (X, 258), "разработчик", F_TITLE, ACCENT, ACCENT2)
d = ImageDraw.Draw(img)

# имя и стек
d.text((X + 3, 392), "Погуляйченко Вячеслав", font=F_NAME, fill=DIM)
d.text((X + 3, 442), "React · Node.js · PostgreSQL · TypeScript", font=F_BODY, fill=MUTED)

# ссылка внизу
d.rectangle([X + 3, 528, X + 47, 531], fill=ACCENT)
d.text((X + 62, 517), "refteen.github.io/refteen", font=F_URL, fill=DIM)

# «светофор» и заголовок код-карточки
for i, col in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
    d.ellipse([CX + 20 + i * 20, CY + 18, CX + 28 + i * 20, CY + 26], fill=col)
d.text((CX + 150, CY + 14), "dev.js", font=F_CODE_S, fill=(90, 100, 120))

CODE = [
    [("const ", ACCENT), ("developer", TEXT), (" = {", MUTED)],
    [("  role", ACCENT2), (": ", MUTED), ('"Full Stack"', STR)],
    [("  stack", ACCENT2), (": ", MUTED), ("[", MUTED), ('"React"', STR),
     (", ", MUTED), ('"Node"', STR), ("]", MUTED)],
    [("  db", ACCENT2), (": ", MUTED), ('"PostgreSQL"', STR)],
    [("  available", ACCENT2), (": ", MUTED), ("true", ACCENT)],
    [("};", MUTED)],
    [],
    [("developer", TEXT), (".", MUTED), ("build", ACCENT2), ("(", MUTED),
     ('"your_idea"', STR), (");", MUTED)],
]
cy = CY + 66
for line in CODE:
    cx = CX + 22
    for txt, col in line:
        d.text((cx, cy), txt, font=F_CODE, fill=col)
        cx += F_CODE.getlength(txt)
    cy += 25

# градиентная полоса по нижней кромке
img.paste(h_gradient((W, 6), ACCENT, ACCENT2), (0, H - 6))

# ══ 3. Сохранение ═══════════════════════════════════════════════════════════
out = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "public", "og-image.png"))
img.save(out, "PNG", optimize=True)
print("OK ->", out, os.path.getsize(out) // 1024, "KB")
