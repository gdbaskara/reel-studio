#!/usr/bin/env bash
# Runs the local OmniVoice TTS server (binds 127.0.0.1, port $OMNIVOICE_PORT or 17600).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER="${ROOT_DIR}/tts/omnivoice/server.py"
VENV_PYTHON="${ROOT_DIR}/tts/omnivoice/.venv/bin/python"

if [ -n "${OMNIVOICE_PYTHON:-}" ]; then
  PYTHON="${OMNIVOICE_PYTHON}"
elif [ -x "${VENV_PYTHON}" ]; then
  PYTHON="${VENV_PYTHON}"
else
  echo "No Python environment for OmniVoice found." >&2
  echo "Run scripts/setup-omnivoice.sh first, or set OMNIVOICE_PYTHON=/path/to/python." >&2
  exit 1
fi

exec "${PYTHON}" "${SERVER}" "$@"
