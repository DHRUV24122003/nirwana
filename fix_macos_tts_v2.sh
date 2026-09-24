#!/usr/bin/env bash
set -euo pipefail

BACKEND_FILE="backend/video-processing/main.py"
ENV_FILE="backend/video-processing/.env"

if [ ! -f "$BACKEND_FILE" ] || [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Run this from the ai-voice-studio-app project root."
  exit 1
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "ERROR: macOS local TTS requires macOS."
  exit 1
fi

if ! command -v say >/dev/null 2>&1; then
  echo "ERROR: macOS 'say' command was not found."
  exit 1
fi

python3 <<'PY'
from pathlib import Path
import re
import shutil

backend = Path("backend/video-processing/main.py")
env_path = Path("backend/video-processing/.env")
backup = Path("backend/video-processing/main.py.before-macos-tts-v2.bak")

if not backup.exists():
    shutil.copy2(backend, backup)

text = backend.read_text(encoding="utf-8")

# 1) Add macos to supported providers.
provider_match = re.search(
    r'SUPPORTED_TTS_PROVIDERS\s*=\s*\{(?P<body>.*?)\}',
    text,
    flags=re.S,
)
if not provider_match:
    raise RuntimeError("SUPPORTED_TTS_PROVIDERS block not found.")

if '"macos"' not in provider_match.group("body"):
    body = provider_match.group("body").rstrip() + '\n    "macos",\n'
    text = text[:provider_match.start("body")] + body + text[provider_match.end("body"):]

# 2) Insert macOS TTS helpers before write_tts_audio.
helpers = '''
MACOS_LANGUAGE_LOCALES = {
    "en": ["en_US", "en_GB", "en_IN"],
    "hi": ["hi_IN"],
    "es": ["es_ES", "es_MX"],
    "fr": ["fr_FR", "fr_CA"],
    "de": ["de_DE"],
    "pt": ["pt_BR", "pt_PT"],
    "it": ["it_IT"],
    "ja": ["ja_JP"],
    "zh": ["zh_CN", "zh_TW", "zh_HK"],
    "ko": ["ko_KR"],
    "ar": ["ar_SA"],
    "ru": ["ru_RU"],
    "nl": ["nl_NL", "nl_BE"],
    "tr": ["tr_TR"],
    "fil": ["fil_PH", "en_PH"],
    "pl": ["pl_PL"],
    "id": ["id_ID"],
    "sv": ["sv_SE"],
    "ro": ["ro_RO"],
    "cs": ["cs_CZ"],
    "el": ["el_GR"],
    "fi": ["fi_FI"],
    "ta": ["ta_IN"],
    "uk": ["uk_UA"],
    "ms": ["ms_MY"],
}


def get_macos_voices() -> list[tuple[str, str]]:
    process = subprocess.run(
        ["say", "-v", "?"],
        capture_output=True,
        text=True,
    )

    if process.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail="Could not list macOS voices.",
        )

    voices = []

    for line in process.stdout.splitlines():
        match = re.match(
            r"^(.+?)\\s+([a-z]{2,3}_[A-Z]{2})\\s+#",
            line.strip(),
        )
        if match:
            voices.append((match.group(1).strip(), match.group(2).strip()))

    return voices


def get_macos_voice(language_code: str) -> tuple[str, str]:
    preferred_locales = MACOS_LANGUAGE_LOCALES.get(language_code, [])
    voices = get_macos_voices()

    for preferred_locale in preferred_locales:
        for voice_name, locale in voices:
            if locale == preferred_locale:
                return voice_name, locale

    prefix = f"{language_code}_"
    for voice_name, locale in voices:
        if locale.startswith(prefix):
            return voice_name, locale

    raise HTTPException(
        status_code=503,
        detail=(
            f"No macOS voice is installed for "
            f"{LANGUAGE_NAMES.get(language_code, language_code)}. "
            "Install a compatible voice in macOS System Settings "
            "or switch TTS_PROVIDER to elevenlabs."
        ),
    )


def write_macos_audio(
    text: str,
    language_code: str,
    speed: float,
    output_path: Path,
) -> None:
    voice_name, locale = get_macos_voice(language_code)
    words_per_minute = int(clamp(185.0 * speed, 120.0, 260.0))
    temporary_aiff = output_path.parent / f"{output_path.stem}-macos.aiff"

    print(
        "macOS TTS:",
        f"voice={voice_name}",
        f"locale={locale}",
        f"rate={words_per_minute}",
    )

    say_process = subprocess.run(
        [
            "say",
            "-v",
            voice_name,
            "-r",
            str(words_per_minute),
            "-o",
            str(temporary_aiff),
            text,
        ],
        capture_output=True,
        text=True,
    )

    if say_process.returncode != 0:
        print("macOS say error:", say_process.stderr)
        raise HTTPException(
            status_code=500,
            detail="macOS speech generation failed.",
        )

    convert_process = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(temporary_aiff),
            "-ar",
            "44100",
            "-ac",
            "1",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "128k",
            str(output_path),
        ],
        capture_output=True,
        text=True,
    )

    temporary_aiff.unlink(missing_ok=True)

    if convert_process.returncode != 0:
        print("macOS TTS FFmpeg error:", convert_process.stderr)
        raise HTTPException(
            status_code=500,
            detail="Could not convert macOS speech audio.",
        )

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise HTTPException(
            status_code=500,
            detail="macOS TTS returned an empty audio file.",
        )
'''

if "def write_macos_audio(" not in text:
    pos = text.find("def write_tts_audio(")
    if pos == -1:
        raise RuntimeError("write_tts_audio function not found.")
    text = text[:pos] + helpers + "\n\n" + text[pos:]

# 3) Replace write_tts_audio router entirely.
start = text.find("def write_tts_audio(")
if start == -1:
    raise RuntimeError("write_tts_audio function not found.")

end = text.find("# =========================================================", start)
if end == -1:
    raise RuntimeError("Could not locate end of write_tts_audio section.")

router = '''def write_tts_audio(
    client: Optional[ElevenLabs],
    voice_id: str,
    text: str,
    target_language: str,
    voice_settings_data: dict,
    speed: float,
    output_path: Path,
) -> None:
    if TTS_PROVIDER == "mock":
        print("Mock TTS:", text[:80])
        write_mock_audio(
            text=text,
            output_path=output_path,
        )
        return

    if TTS_PROVIDER == "macos":
        write_macos_audio(
            text=text,
            language_code=target_language,
            speed=speed,
            output_path=output_path,
        )
        return

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="ElevenLabs client is not available.",
        )

    write_elevenlabs_audio(
        client=client,
        voice_id=voice_id,
        text=text,
        voice_settings_data=voice_settings_data,
        speed=speed,
        output_path=output_path,
    )


'''
text = text[:start] + router + text[end:]

# 4) Add target_language to every STEP 4 write_tts_audio call.
step4 = text.find("# STEP 4 - V1")
if step4 == -1:
    raise RuntimeError("STEP 4 section not found.")

head = text[:step4]
tail = text[step4:]

pattern = re.compile(
    r'(write_tts_audio\(\s*\n'
    r'(?P<indent>\s*)client=client,\s*\n'
    r'(?P=indent)voice_id=voice_id,\s*\n'
    r'(?P=indent)text=[^,\n]+,\s*\n)'
    r'(?!' + r'(?P=indent)target_language=)',
    flags=re.M,
)

def inject(match):
    indent = match.group("indent")
    return match.group(1) + f"{indent}target_language=request.target_language,\n"

tail, replacements = pattern.subn(inject, tail)
text = head + tail

backend.write_text(text, encoding="utf-8")

# 5) Switch provider in .env.
env_text = env_path.read_text(encoding="utf-8")
if re.search(r"(?m)^\s*TTS_PROVIDER\s*=", env_text):
    env_text = re.sub(
        r"(?m)^\s*TTS_PROVIDER\s*=.*$",
        "TTS_PROVIDER=macos",
        env_text,
        count=1,
    )
else:
    if env_text and not env_text.endswith("\n"):
        env_text += "\n"
    env_text += "TTS_PROVIDER=macos\n"

env_path.write_text(env_text, encoding="utf-8")

print("macOS TTS patch applied ✅")
print("TTS calls updated:", replacements)
print("Backup:", backup)
PY

echo
echo "Checking Python syntax..."
python3 -m py_compile "$BACKEND_FILE"

echo
echo "Current provider:"
grep '^TTS_PROVIDER=' "$ENV_FILE"

echo
echo "macOS router line:"
grep -n 'TTS_PROVIDER == "macos"' "$BACKEND_FILE"

echo
echo "Italian voices installed:"
say -v '?' | grep 'it_IT' || true

echo
echo "SUCCESS ✅"
echo "Restart uvicorn, then test Video Dubbing again."
