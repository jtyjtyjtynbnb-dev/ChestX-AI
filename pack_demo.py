"""Build a clean, cross-computer demo ZIP package strictly under 200 MB."""

import os
import zipfile
from fnmatch import fnmatch
from pathlib import Path

EXCLUDE_DIR_NAMES = {".venv", "venv", "__pycache__", ".git", "node_modules", "data", ".pytest_cache", "tests"}
EXCLUDE_DIR_PATTERNS = ("frontend.backup-*", "legacy-backup-*", "ChestX-AI-跨电脑演示包-*")
EXCLUDE_FILE_NAMES = {".env", ".env.local", "1121.py"}
# Keep .env.example in the package on purpose: it is the configuration template.
EXCLUDE_FILE_PATTERNS = ()
EXCLUDE_EXTS = {".pyc", ".pyo", ".log", ".pid", ".db", ".sqlite3"}


def build_package(
    source_dir: str = ".",
    out_zip: str = "ChestX-AI-跨电脑演示包-优化版.zip",
) -> float:
    src_path = Path(source_dir).resolve()
    out_path = Path(out_zip).resolve()
    assert (src_path / "frontend" / "dist" / "index.html").exists(), "先运行 npm run build"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(src_path):
            dirs[:] = [
                d for d in dirs
                if d not in EXCLUDE_DIR_NAMES and not any(fnmatch(d, pattern) for pattern in EXCLUDE_DIR_PATTERNS)
            ]
            for file in files:
                fp = Path(root) / file
                relative = fp.relative_to(src_path)
                if (
                    fp == out_path
                    or file in EXCLUDE_FILE_NAMES
                    or any(fnmatch(file, pattern) for pattern in EXCLUDE_FILE_PATTERNS)
                    or fp.suffix.lower() in EXCLUDE_EXTS
                    or relative.as_posix() == "frontend/1"
                ):
                    continue
                arcname = Path("ChestX-AI-演示运行包") / relative
                zf.write(fp, arcname)
        names = zf.namelist()
        assert not any(n.endswith("/backend/.env") or n.endswith("/.env.local") for n in names)
        assert any(n.endswith("/.env.example") for n in names)
        assert any(n.endswith("/frontend/dist/index.html") for n in names)
        assert any(n.endswith("/frontend/dist/assets/sample_1.jpg") for n in names)
    size_mb = out_path.stat().st_size / (1024 * 1024)
    assert size_mb < 200.0, f"Package exceeded 200MB limit: {size_mb:.2f} MB"
    print(f"[OK] Built {out_path.name}: {size_mb:.2f} MB (limit: 200.00 MB)")
    return size_mb


if __name__ == "__main__":
    build_package()
