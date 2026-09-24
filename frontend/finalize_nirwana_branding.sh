#!/usr/bin/env bash
set -euo pipefail

# Run from the frontend directory:
#   bash fix_all_visible_voxlingo.sh

if [ ! -d "src" ]; then
  echo "ERROR: Run this script from ai-voice-studio-app/frontend"
  exit 1
fi

python3 <<'PY'
from pathlib import Path

ROOT = Path(".")
SKIP_DIRS = {
    "node_modules",
    ".next",
    ".git",
    ".turbo",
    "dist",
    "build",
    "coverage",
}

changed = []

for path in ROOT.rglob("*"):
    if not path.is_file():
        continue

    if any(part in SKIP_DIRS for part in path.parts):
        continue

    # Skip obvious binary/media files.
    if path.suffix.lower() in {
        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico",
        ".mp3", ".wav", ".mp4", ".mov", ".pdf", ".woff",
        ".woff2", ".ttf", ".otf", ".zip",
    }:
        continue

    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue

    new_text = (
        text
        .replace("Nirwana", "Nirwana")
        .replace("NIRWANA", "NIRWANA")
    )

    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        changed.append(str(path))

print(f"\nUpdated {len(changed)} file(s):")
for item in changed:
    print(f"  {item}")
PY

echo
echo "=================================================="
echo "CHECK 1: Remaining capitalized Nirwana references"
echo "=================================================="

if grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  --exclude-dir=.turbo \
  --exclude-dir=dist \
  --exclude-dir=build \
  -E 'Nirwana|NIRWANA' .; then
  echo
  echo "WARNING: The lines above still contain old visible branding."
else
  echo "None ✅"
fi

echo
echo "=================================================="
echo "CHECK 2: Remaining lowercase 'voxlingo' references"
echo "=================================================="
echo "These may be internal filenames/identifiers. Review only; they are NOT auto-changed."

grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  --exclude-dir=.turbo \
  --exclude-dir=dist \
  --exclude-dir=build \
  'voxlingo' . || true

echo
echo "=================================================="
echo "Clearing Next.js cache"
echo "=================================================="

rm -rf .next

echo
echo "Done ✅"
echo "Now run: npm run dev"
