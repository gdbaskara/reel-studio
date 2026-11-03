#!/usr/bin/env bash
# Creates tts/omnivoice/.venv (Python 3.12) and installs the local OmniVoice TTS server deps.
# Note: OmniVoice code is Apache-2.0, pretrained weights are CC-BY-NC (non-commercial use only).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TTS_DIR="${ROOT_DIR}/tts/omnivoice"
VENV_DIR="${TTS_DIR}/.venv"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required. Install it with: brew install uv" >&2
  exit 1
fi

if [ ! -x "${VENV_DIR}/bin/python" ]; then
  echo "Creating ${VENV_DIR} with Python 3.12..."
  uv venv --python 3.12 "${VENV_DIR}"
fi

echo "Installing requirements (torch is large, this can take a while)..."
uv pip install --python "${VENV_DIR}/bin/python" -r "${TTS_DIR}/requirements.txt"

cat <<MSG

OmniVoice is installed.
Next steps:
  1. Start the server:   scripts/run-omnivoice.sh
     (first start downloads k2-fsa/OmniVoice weights into ~/.cache/huggingface)
  2. Check it:           curl http://127.0.0.1:\${OMNIVOICE_PORT:-17600}/health
  3. Optional own voice: ${VENV_DIR}/bin/python ${TTS_DIR}/server.py add-voice <id> <audio> "<exact transcript>" [name]
MSG
