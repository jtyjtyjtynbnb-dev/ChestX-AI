"""Build a clean, cross-computer competition ZIP package strictly under 200 MB."""

import os
import zipfile
from pathlib import Path

EXCLUDE_DIRS = {".venv", "venv", "__pycache__", ".git", "node_modules", "data", ".pytest_cache"}
EXCLUDE_EXTS = {".pyc", ".pyo", ".log", ".pid", ".db", ".sqlite3"}


def build_package(
    source_dir: str = ".",
    out_zip: str = "ChestX-AI-跨电脑演示包-优化版.zip",
) -> float:
    src_path = Path(source_dir).resolve()
    out_path = Path(out_zip).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(src_path):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                fp = Path(root) / file
                if fp == out_path or fp.suffix.lower() in EXCLUDE_EXTS:
                    continue
                arcname = Path("ChestX-AI-演示运行包") / fp.relative_to(src_path)
                zf.write(fp, arcname)
    size_mb = out_path.stat().st_size / (1024 * 1024)
    assert size_mb < 200.0, f"Package exceeded 200MB limit: {size_mb:.2f} MB"
    print(f"[OK] Built {out_path.name}: {size_mb:.2f} MB (limit: 200.00 MB)")
    return size_mb


if __name__ == "__main__":
    build_package()
