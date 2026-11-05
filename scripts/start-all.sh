#!/usr/bin/env bash
# Starts everything Reel Studio uses, each only if it is not running yet:
#   - the app (npm run app) on PORT, default 4310
#   - the local OmniVoice server, when it is set up (tts/omnivoice/.venv or OMNIVOICE_PYTHON)
#   - a Cloudflare Tunnel, when TUNNEL_NAME is set (config at ~/.cloudflared/<TUNNEL_NAME>.yml)
# Settings come from the environment or .env.local. Logs go to out/logs/. Ctrl+C stops what this script started.
set -uo pipefail
# Each background job gets its own process group, so stopping it also stops what it spawned (npm -> node).
set -m

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/out/logs"
mkdir -p "${LOG_DIR}"
cd "${ROOT_DIR}"

# Reads one KEY=value from .env.local without sourcing the file (it holds secrets and is not a shell script).
setting() {
  local key="$1" value="${!1:-}"
  if [ -z "${value}" ] && [ -f .env.local ]; then
    value="$(grep -E "^${key}=" .env.local | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//')"
  fi
  printf '%s' "${value}"
}

PORT="$(setting PORT)"; PORT="${PORT:-4310}"
OMNIVOICE_PORT="$(setting OMNIVOICE_PORT)"; OMNIVOICE_PORT="${OMNIVOICE_PORT:-17600}"
OMNIVOICE_PYTHON="$(setting OMNIVOICE_PYTHON)"
TUNNEL_NAME="$(setting TUNNEL_NAME)"

listening() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

STARTED=()
start() {
  local name="$1"; shift
  "$@" >>"${LOG_DIR}/${name}.log" 2>&1 &
  STARTED+=("$!")
  echo "started ${name} (log: out/logs/${name}.log)"
}

if listening "${PORT}"; then
  echo "app: already running on port ${PORT}"
else
  start app npm run app
fi

if listening "${OMNIVOICE_PORT}"; then
  echo "omnivoice: already running on port ${OMNIVOICE_PORT}"
elif [ -n "${OMNIVOICE_PYTHON}" ] || [ -x tts/omnivoice/.venv/bin/python ]; then
  start omnivoice env OMNIVOICE_PYTHON="${OMNIVOICE_PYTHON}" bash scripts/run-omnivoice.sh
else
  echo "omnivoice: not set up, skipped (see npm run setup:omnivoice)"
fi

if [ -z "${TUNNEL_NAME}" ]; then
  echo "tunnel: TUNNEL_NAME not set, skipped"
elif ! command -v cloudflared >/dev/null 2>&1; then
  echo "tunnel: cloudflared is not installed, skipped"
elif [ ! -f "${HOME}/.cloudflared/${TUNNEL_NAME}.yml" ]; then
  echo "tunnel: no config at ~/.cloudflared/${TUNNEL_NAME}.yml, skipped"
elif pgrep -f "cloudflared tunnel .*run ${TUNNEL_NAME}" >/dev/null 2>&1; then
  echo "tunnel: ${TUNNEL_NAME} already running"
else
  start tunnel cloudflared tunnel --config "${HOME}/.cloudflared/${TUNNEL_NAME}.yml" run "${TUNNEL_NAME}"
fi

if [ "${#STARTED[@]}" -eq 0 ]; then
  echo "Everything was already running."
  exit 0
fi

echo "Running. Press Ctrl+C to stop what this script started."
stop() {
  for pid in "${STARTED[@]}"; do kill -TERM -- "-${pid}" 2>/dev/null; done
  exit 0
}
trap stop INT TERM
wait
