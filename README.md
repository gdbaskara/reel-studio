# Reel Studio

Make short vertical explainer reels (1080x1920) from a single prompt. An AI planner
writes the scenes, you tweak them scene by scene with a live preview, add a voiceover
(generated or your own recording), and render an MP4 with word-by-word captions.

Built on [Remotion](https://www.remotion.dev/), so every reel is a React component.

## Features

- **Prompt to plan** - describe the reel, choose language, step count, palette and
  captions. Plan with AI (Claude) or start from a manual template.
- **Scene-by-scene editor** - edit title, steps, doodles and narration; add or remove
  steps; autosave.
- **Looks** - six complete styles: Notebook (handwritten, the original), Bold Pop, Minimal,
  Neon Night, Kertas Koran and Soft Pastel. Each sets fonts, colors, motion, background,
  number badges, notes and caption style, and offers 2-3 palettes. Pick one from previews of
  your own title in the editor; hover to try it on the player. Headlines shrink to fit.
- **Emphasis** - wrap a word in on-screen text in `*asterisks*` to make it stand out in the
  look's emphasis style. The voice never reads the asterisks.
- **Live preview** - play a single scene or the full reel in the browser
  (`@remotion/player`).
- **Mixed voiceover** - per scene, generate with ElevenLabs or
  [OmniVoice](https://github.com/k2-fsa/OmniVoice) (local, native Indonesian, every scene
  cloned from one reference voice), or upload your own audio (mp3/wav/m4a, up to 90 s).
  Indonesian reels default to OmniVoice.
- **Captions** - TikTok-style word highlight. ElevenLabs clips use its own alignment;
  OmniVoice and uploaded clips are timed with a local Whisper (whisper.cpp) and aligned
  to the narration script, so captions keep your spelling but follow the real audio.
  Without Whisper, timings are estimated from word length.
- **Background music** - upload one track for the whole reel. It fades in and out, repeats if
  the reel is longer, and dips under the voice (ducking). Volume and ducking are set in the
  editor. Use royalty-free music so Instagram does not mute the reel.
- **Render** - one click to MP4 with progress, then download.

## Requirements

- Node.js 22+
- ffmpeg (`brew install ffmpeg`)
- macOS (uses `afinfo` for audio durations)
- Optional: an ElevenLabs API key
- Optional: OmniVoice (Apple Silicon or CPU, needs `uv`: `brew install uv`). Non-commercial use
  only, see below.
- Optional: whisper.cpp for caption timing (`npm run setup:whisper`). Without it, captions use
  estimated timings.
- Optional: an Anthropic API key or the `claude` CLI for AI planning

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your keys
npm run app                  # http://localhost:4310
```

To use another port, set `PORT` in `.env.local` (or `PORT=4312 npm run app`). If the port is
taken, the server stops with a message instead of starting.

npm 11 may warn that the install scripts of `esbuild` and `fsevents` were not run. That is
harmless: the app does not need them.

The **Manual** plan mode starts every scene blank, with grey example text in the editor. Fill
in each scene's on-screen text and narration; rendering waits until every scene has its main
line.

## Local voice (OmniVoice)

OmniVoice runs on your machine and speaks Indonesian natively. It needs about 1 GB of Python
packages plus 3.3 GB of weights, downloaded the first time:

```bash
npm run setup:omnivoice   # once: creates tts/omnivoice/.venv with uv
npm run omnivoice         # serves 127.0.0.1:17600; the first start downloads the weights
curl http://127.0.0.1:17600/health
```

On another port: `OMNIVOICE_PORT=17601 npm run omnivoice`, and set
`OMNIVOICE_URL=http://127.0.0.1:17601` in `.env.local`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run app` | Start Reel Studio (Express API + Vite UI on one port) |
| `npm run setup:whisper` | Install whisper.cpp and download the caption timing model |
| `npm run setup:omnivoice` | Create the OmniVoice Python environment (weights download on first start) |
| `npm run omnivoice` | Start the local OmniVoice TTS server (`127.0.0.1:17600`) |
| `npm run studio` | Open Remotion Studio for the demo compositions |
| `npm run voice:atlas` | Generate voiceover for the demo reel (`--provider=eleven\|omnivoice`) |
| `npm run render:atlas` | Render the demo reel to `out/atlas.mp4` |
| `npm test` | Run unit tests (vitest) |
| `npm run typecheck` | Type-check the whole project |

## Project layout

```
app/
  server/   Express API: projects, planner, voice, render, file store
  shared/   zod schemas and pure helpers shared by server and UI
  web/      React UI (create page, editor, preview, voice panel)
src/        Remotion compositions, scenes, captions, timeline
scripts/    CLI voiceover generation and TTS providers
voiceover/  narration scripts for the demo reels
public/vo/  pre-generated demo voiceover audio
tests/      vitest unit tests
```

Projects are stored as JSON plus audio under `projects/` (gitignored).

## Voice providers and languages

| Provider | English | Indonesian | Caption timing |
| --- | --- | --- | --- |
| ElevenLabs | yes | yes | exact (provider alignment) |
| OmniVoice | yes | yes (native) | Whisper |
| Upload | yes | yes | Whisper |

OmniVoice speaks Indonesian natively. Built-in voices Wanita (the default) and Pria are
created on first use. Pick another default with `OMNIVOICE_VOICE` in `.env.local`, or add
your own as `~/.cache/reel-studio/omnivoice-voices/<id>.wav` plus `<id>.txt` (exact
transcript). **License:** OmniVoice code is Apache-2.0, but its pretrained weights
are CC-BY-NC, so OmniVoice voiceovers are for non-commercial use only.

## Security notes

- The server binds to `127.0.0.1` and rejects unexpected `Host` headers.
- API keys live only in `.env.local`, which is gitignored.

## Roadmap

- Whisper timing for the demo CLI script (`scripts/voiceover.mjs`)
- Keep a warm `whisper-server` instead of spawning `whisper-cli` per clip
