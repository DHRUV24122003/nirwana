#!/usr/bin/env bash
set -euo pipefail

# Run from ai-voice-studio-app project root:
#   bash upgrade_backend_languages.sh

BACKEND_FILE="backend/video-processing/main.py"

if [ ! -f "$BACKEND_FILE" ]; then
  echo "ERROR: Missing $BACKEND_FILE"
  exit 1
fi

python3 <<'PY'
from pathlib import Path
import re
import shutil

path = Path("backend/video-processing/main.py")
backup = Path("backend/video-processing/main.py.before-language-upgrade.bak")

if not backup.exists():
    shutil.copy2(path, backup)

text = path.read_text(encoding="utf-8")

new_map = '''LANGUAGE_NAMES = {
    "auto": "Auto Detect",
    "en": "English",
    "hi": "Hindi",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "it": "Italian",
    "ja": "Japanese",
    "zh": "Chinese",
    "ko": "Korean",
    "ar": "Arabic",
    "ru": "Russian",
    "nl": "Dutch",
    "tr": "Turkish",
    "fil": "Filipino",
    "pl": "Polish",
    "id": "Indonesian",
    "sv": "Swedish",
    "ro": "Romanian",
    "cs": "Czech",
    "el": "Greek",
    "fi": "Finnish",
    "ta": "Tamil",
    "uk": "Ukrainian",
    "ms": "Malay",
}'''

pattern = re.compile(
    r'LANGUAGE_NAMES\s*=\s*\{.*?\n\}',
    re.S,
)

text, count = pattern.subn(new_map, text, count=1)

if count != 1:
    raise RuntimeError("Could not find LANGUAGE_NAMES block in backend main.py")

path.write_text(text, encoding="utf-8")

print("Backend LANGUAGE_NAMES updated ✅")
print()
print(new_map)
PY

echo
echo "Checking Python syntax..."
python3 -m py_compile "$BACKEND_FILE"

echo
echo "Backend language upgrade complete ✅"
echo "IMPORTANT: Restart uvicorn now."
