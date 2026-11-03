#!/usr/bin/env bash
# Installs whisper.cpp and the multilingual turbo model used to time captions.
set -euo pipefail

MODEL_NAME="${WHISPER_MODEL_NAME:-ggml-large-v3-turbo-q5_0.bin}"
MODEL_DIR="${HOME}/.cache/reel-studio"
MODEL_PATH="${MODEL_DIR}/${MODEL_NAME}"

if ! command -v whisper-cli >/dev/null 2>&1; then
  echo "Installing whisper.cpp with Homebrew..."
  brew install whisper-cpp
fi

mkdir -p "${MODEL_DIR}"
if [ -f "${MODEL_PATH}" ]; then
  echo "Model already present: ${MODEL_PATH}"
else
  echo "Downloading ${MODEL_NAME} (about 550 MB)..."
  curl -L --fail -o "${MODEL_PATH}.part" "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}"
  mv "${MODEL_PATH}.part" "${MODEL_PATH}"
fi

echo "Whisper is ready. Restart Reel Studio to pick it up."
