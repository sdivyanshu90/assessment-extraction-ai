"""Generate a deterministic, privacy-safe OCR/mapping benchmark fixture."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent / "fixtures"
OUT.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = 1200, 1600
PRINT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
PRINT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
HAND = "/usr/share/opentype/urw-base35/URWBookman-LightItalic.otf"


def paper():
    image = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(image)
    title = ImageFont.truetype(PRINT_BOLD, 42)
    body = ImageFont.truetype(PRINT, 31)
    small = ImageFont.truetype(PRINT, 24)
    draw.text((90, 75), "SCIENCE UNIT ASSESSMENT", font=title, fill="#16201d")
    draw.text((90, 135), "Answer all questions. Marks are shown in brackets.", font=small, fill="#5c6562")
    questions = [
        ("1.", "Define osmosis.", "[2]", 250),
        ("2.", "Explain photosynthesis and name the organelle involved.", "[3]", 430),
        ("3.", "State Newton's second law of motion.", "[2]", 650),
        ("11 (a)", "Define mitosis.", "[2]", 900),
        ("11 (b)", "Why is mitosis important to living organisms?", "[2]", 1080),
    ]
    for label, text, marks, y in questions:
        draw.text((90, y), label, font=body, fill="#111715")
        draw.text((245, y), text, font=body, fill="#111715")
        draw.text((1050, y), marks, font=small, fill="#444b48")
    image.save(OUT / "question-paper.png", quality=95)


def ruled_page(number, entries):
    image = Image.new("RGB", (WIDTH, HEIGHT), "#fffef9")
    draw = ImageDraw.Draw(image)
    for y in range(120, HEIGHT - 80, 46):
        draw.line((55, y, WIDTH - 45, y), fill="#cee0ec", width=2)
    draw.line((120, 40, 120, HEIGHT - 40), fill="#e9a99e", width=2)
    font = ImageFont.truetype(HAND, 32)
    label_font = ImageFont.truetype(HAND, 35)
    for entry in entries:
        y = entry[0]
        label = entry[1]
        lines = entry[2]
        if label:
            draw.text((145, y), label, font=label_font, fill="#253751")
        x = 235 if label else 150
        for i, line in enumerate(lines):
            draw.text((x if i == 0 else 150, y + i * 46), line, font=font, fill="#253751")
    draw.text((1060, 1520), str(number), font=ImageFont.truetype(PRINT, 20), fill="#707875")
    image.save(OUT / f"answer-page-{number}.png", quality=95)


paper()
ruled_page(1, [
    (155, "Q3)", ["Force equals mass multiplied by acceleration.", "Newton's second law is F = m × a."]),
    (515, "11a.", ["Mitosis is cell division that produces two", "genetically identical daughter cells."]),
    (965, "Q1)", ["Osmosis is the movement of water molecules", "through a partially permeable membrane..."]),
])
ruled_page(2, [
    (130, None, ["...from a dilute solution to a concentrated solution", "until the concentrations become balanced."]),
    (550, "11b)", ["It allows organisms to grow and repair", "damaged or worn-out tissues."]),
    (1120, None, ["Rough calculation:", "25 × 4 = 100"]),
])
print(f"Generated benchmark fixture in {OUT}")
