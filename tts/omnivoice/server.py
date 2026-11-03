"""Local OmniVoice TTS server for Reel Studio (127.0.0.1 only).

Usage:
  python server.py                                   # serve on OMNIVOICE_PORT (default 17600)
  python server.py add-voice <id> <audio> "<exact transcript>" [display name]

OmniVoice code is Apache-2.0; the pretrained weights are CC-BY-NC (non-commercial).
"""
from __future__ import annotations

import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

SAMPLE_RATE = 24000
MAX_TEXT = 1000
MAX_BODY = 16 * 1024
MAX_REF_SECONDS = 12.0
VOICE_ID_RE = re.compile(r"^[a-z0-9-]{1,40}$")
LANGUAGES = {"id", "en"}
ALLOWED_HOSTS = {"localhost", "127.0.0.1"}
VOICES_DIR = Path.home() / ".cache" / "reel-studio" / "omnivoice-voices"
BUILTIN_TEXT = (
    "Halo, selamat datang. Hari ini kita akan membahas sesuatu yang menarik, "
    "jadi simak baik-baik sampai selesai ya."
)
BUILTINS: dict[str, dict[str, Any]] = {
    "wanita": {"name": "Wanita", "instruct": "female", "seed": 1234},
    "pria": {"name": "Pria", "instruct": "male", "seed": 4321},
}


class ApiError(Exception):
    def __init__(self, status: int, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.detail = detail


def log(msg: str) -> None:
    print(f"[omnivoice] {time.strftime('%H:%M:%S')} {msg}", file=sys.stderr, flush=True)


def voice_paths(voice_id: str) -> tuple[Path, Path, Path]:
    if not VOICE_ID_RE.match(voice_id):
        raise ApiError(400, "invalid voice id")
    base = VOICES_DIR / voice_id
    return base.with_suffix(".wav"), base.with_suffix(".txt"), base.with_suffix(".json")


def read_display_name(meta_path: Path, fallback: str) -> str:
    try:
        name = json.loads(meta_path.read_text(encoding="utf-8")).get("name")
    except (OSError, ValueError, AttributeError):
        return fallback
    return name[:80] if isinstance(name, str) and name.strip() else fallback


def list_voices() -> list[dict[str, Any]]:
    voices = [{"id": vid, "name": spec["name"], "builtin": True} for vid, spec in BUILTINS.items()]
    if VOICES_DIR.is_dir():
        for wav in sorted(VOICES_DIR.glob("*.wav")):
            vid = wav.stem
            if vid in BUILTINS or not VOICE_ID_RE.match(vid) or not wav.with_suffix(".txt").is_file():
                continue
            name = read_display_name(wav.with_suffix(".json"), vid)
            voices.append({"id": vid, "name": name, "builtin": False})
    return voices


def to_pcm16_wav(audio: np.ndarray) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, np.clip(np.asarray(audio, dtype=np.float32).reshape(-1), -1.0, 1.0),
             SAMPLE_RATE, format="WAV", subtype="PCM_16")
    return buf.getvalue()


class Engine:
    """Owns the model; every model call happens under one lock."""

    def __init__(self) -> None:
        import torch
        from omnivoice import OmniVoice

        self.torch = torch
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        dtype = torch.float16 if self.device == "mps" else torch.float32
        log(f"loading k2-fsa/OmniVoice on {self.device}...")
        self.model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map=self.device, dtype=dtype)
        self.lock = threading.Lock()
        self.prompts: dict[str, Any] = {}
        log("model loaded")

    def _ensure_builtin(self, voice_id: str) -> None:
        wav_path, txt_path, _ = voice_paths(voice_id)
        if wav_path.is_file() and txt_path.is_file():
            return
        spec = BUILTINS[voice_id]
        log(f"creating builtin voice '{voice_id}'")
        self.torch.manual_seed(spec["seed"])
        np.random.seed(spec["seed"])
        audio = self.model.generate(BUILTIN_TEXT, language="id", instruct=spec["instruct"])[0]
        VOICES_DIR.mkdir(parents=True, exist_ok=True)
        sf.write(str(wav_path), np.clip(audio.reshape(-1), -1, 1), SAMPLE_RATE, subtype="PCM_16")
        txt_path.write_text(BUILTIN_TEXT, encoding="utf-8")

    def _prompt(self, voice_id: str) -> Any:
        if voice_id in BUILTINS:
            self._ensure_builtin(voice_id)
        wav_path, txt_path, _ = voice_paths(voice_id)
        if not (wav_path.is_file() and txt_path.is_file()):
            self.prompts.pop(voice_id, None)
            raise ApiError(404, f"unknown voice: {voice_id}")
        # Keyed by file stats, so re-adding a voice with add-voice takes effect without a restart.
        stamp = tuple((p.stat().st_mtime_ns, p.stat().st_size) for p in (wav_path, txt_path))
        cached = self.prompts.get(voice_id)
        if cached and cached[0] == stamp:
            return cached[1]
        ref_text = txt_path.read_text(encoding="utf-8").strip()
        prompt = self.model.create_voice_clone_prompt(ref_audio=str(wav_path), ref_text=ref_text)
        self.prompts[voice_id] = (stamp, prompt)
        return prompt

    def synthesize(self, text: str, language: str, voice_id: str, speed: float | None) -> bytes:
        with self.lock:
            prompt = self._prompt(voice_id)
            audio = self.model.generate(text, language=language, voice_clone_prompt=prompt, speed=speed)[0]
        return to_pcm16_wav(audio)


def parse_tts_request(body: Any) -> tuple[str, str, str, float | None]:
    if not isinstance(body, dict):
        raise ApiError(400, "body must be a JSON object")
    text, language, voice, speed = (body.get(k) for k in ("text", "language", "voice", "speed"))
    if not isinstance(text, str) or not text.strip() or len(text) > MAX_TEXT:
        raise ApiError(400, f"text must be a non-empty string of at most {MAX_TEXT} chars")
    if language not in LANGUAGES:
        raise ApiError(400, "language must be 'id' or 'en'")
    if not isinstance(voice, str) or not VOICE_ID_RE.match(voice):
        raise ApiError(400, "voice must match ^[a-z0-9-]{1,40}$")
    if speed is not None:
        if isinstance(speed, bool) or not isinstance(speed, (int, float)) or not 0.7 <= speed <= 1.3:
            raise ApiError(400, "speed must be a number between 0.7 and 1.3")
        speed = float(speed)
    return text.strip(), language, voice, speed


class Handler(BaseHTTPRequestHandler):
    engine: Engine
    server_version = "OmniVoiceLocal/1.0"

    def log_message(self, format: str, *args: Any) -> None:  # silence default access log
        pass

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        elapsed = (time.monotonic() - self._t0) * 1000
        log(f"{self.command} {self.path.split('?')[0][:60]} {status} {len(body)}B {elapsed:.0f}ms")

    def _json(self, status: int, payload: Any) -> None:
        self._send(status, json.dumps(payload).encode("utf-8"), "application/json")

    def _host_ok(self) -> bool:
        host = (self.headers.get("Host") or "").strip().lower()
        hostname = host.rsplit(":", 1)[0] if ":" in host else host
        return hostname in ALLOWED_HOSTS

    def _guard(self) -> bool:
        self._t0 = time.monotonic()
        if not self._host_ok():
            self._json(403, {"detail": "forbidden host"})
            return False
        return True

    def do_GET(self) -> None:
        if not self._guard():
            return
        path = self.path.split("?")[0]
        if path == "/health":
            self._json(200, {"status": "ok", "device": self.engine.device, "model_loaded": True})
        elif path == "/voices":
            self._json(200, list_voices())
        else:
            self._json(404, {"detail": "not found"})

    def do_POST(self) -> None:
        if not self._guard():
            return
        if self.path.split("?")[0] != "/tts":
            self._json(404, {"detail": "not found"})
            return
        try:
            self._synthesize(self._read_json())
        except ApiError as err:
            self._json(err.status, {"detail": err.detail})
        except Exception as exc:  # any other bug still gets a JSON answer instead of a dropped connection
            log(f"request failed: {type(exc).__name__}: {exc}")
            self._json(500, {"detail": "internal error"})

    def _read_json(self) -> Any:
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if ctype != "application/json":
            raise ApiError(415, "Content-Type must be application/json")
        try:
            length = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            raise ApiError(400, "invalid Content-Length") from None
        if length <= 0 or length > MAX_BODY:
            raise ApiError(400, f"body must be 1..{MAX_BODY} bytes")
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, ValueError, RecursionError):
            raise ApiError(400, "invalid JSON") from None

    def _synthesize(self, body: Any) -> None:
        text, language, voice, speed = parse_tts_request(body)
        try:
            wav = self.engine.synthesize(text, language, voice, speed)
        except ApiError:
            raise
        except Exception as exc:  # model failures must not kill the server
            log(f"generation failed: {type(exc).__name__}: {exc}")
            raise ApiError(500, "generation failed") from None
        self._send(200, wav, "audio/wav")


def convert_reference(src: Path, dst: Path) -> None:
    if shutil.which("ffmpeg"):
        cmd = ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(src),
               "-ac", "1", "-ar", str(SAMPLE_RATE), "-t", str(MAX_REF_SECONDS), "-c:a", "pcm_s16le", str(dst)]
        subprocess.run(cmd, check=True)
        return
    data, rate = sf.read(str(src), dtype="float32", always_2d=True)
    mono = data.mean(axis=1)
    if rate != SAMPLE_RATE:
        n_out = int(len(mono) * SAMPLE_RATE / rate)
        mono = np.interp(np.linspace(0, len(mono) - 1, n_out), np.arange(len(mono)), mono)
    sf.write(str(dst), mono[: int(MAX_REF_SECONDS * SAMPLE_RATE)], SAMPLE_RATE, subtype="PCM_16")


def add_voice(args: list[str]) -> int:
    if len(args) not in (3, 4):
        print('usage: server.py add-voice <id> <audio-file> "<exact transcript>" [display name]', file=sys.stderr)
        return 2
    voice_id, src, transcript = args[0], Path(args[1]).expanduser(), args[2].strip()
    if not VOICE_ID_RE.match(voice_id) or voice_id in BUILTINS:
        print("error: id must match ^[a-z0-9-]{1,40}$ and not be a builtin", file=sys.stderr)
        return 2
    if not src.is_file() or not transcript or len(transcript) > MAX_TEXT:
        print("error: audio file must exist and transcript must be 1..1000 chars", file=sys.stderr)
        return 2
    wav_path, txt_path, meta_path = voice_paths(voice_id)
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_wav = Path(tmp) / "ref.wav"
        try:
            convert_reference(src, tmp_wav)
        except (subprocess.CalledProcessError, RuntimeError, OSError) as exc:
            print(f"error: could not convert audio: {exc}", file=sys.stderr)
            return 1
        shutil.move(str(tmp_wav), wav_path)
    txt_path.write_text(transcript, encoding="utf-8")
    name = args[3].strip() if len(args) == 4 and args[3].strip() else voice_id
    meta_path.write_text(json.dumps({"name": name[:80]}), encoding="utf-8")
    print(f"saved voice '{voice_id}' ({sf.info(str(wav_path)).duration:.1f}s) to {wav_path}")
    if sf.info(str(wav_path)).duration >= MAX_REF_SECONDS - 0.05:
        print("note: audio trimmed to 12 s; make sure the transcript matches the kept part")
    return 0


def serve() -> int:
    port = int(os.environ.get("OMNIVOICE_PORT", "17600"))
    Handler.engine = Engine()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    log(f"listening on http://127.0.0.1:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "add-voice":
        sys.exit(add_voice(sys.argv[2:]))
    if len(sys.argv) > 1:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    sys.exit(serve())
