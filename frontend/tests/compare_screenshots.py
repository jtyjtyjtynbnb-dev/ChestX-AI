from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).parent
PAGES = ("home", "interpret", "records", "knowledge", "academy", "about")


def screenshot_path(prefix: str, page: str) -> Path:
    if page == "home":
        return ROOT / ("vue-home-1440-v2.png" if prefix == "vue" else "reference-local-home-1440.png")
    if page == "interpret":
        return ROOT / ("vue-interpret-1440-v3.png" if prefix == "vue" else "reference-interpret-1440-v2.png")
    return ROOT / f"{prefix}-{page}-1440.png"


for page in PAGES:
    actual = Image.open(screenshot_path("vue", page)).convert("RGB")
    expected = Image.open(screenshot_path("reference", page)).convert("RGB")
    if actual.size != expected.size:
        print(f"{page}: size mismatch {actual.size} != {expected.size}")
        continue
    diff = ImageChops.difference(actual, expected)
    different_pixels = sum(pixel != (0, 0, 0) for pixel in diff.getdata())
    print(f"{page}: size={actual.size}, bbox={diff.getbbox()}, different_pixels={different_pixels}")
