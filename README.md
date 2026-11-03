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
- **Live preview** - play a single scene or the full reel in the browser
  (`@remotion/player`).
- **Mixed voiceover** - per scene, generate with ElevenLabs,
  [Voicebox](https://github.com/jamiepine/voicebox) (local, open-source voice cloning) or
  [OmniVoice](https://github.com/k2-fsa/OmniVoice) (local, native Indonesian, every scene
  cloned from one reference voice), or upload your own audio (mp3/wav/m4a, up to 90 s).
- **Captions** - TikTok-style word highlight. ElevenLabs clips use its own alignment;
  Voicebox, OmniVoice and uploaded clips are timed with a local Whisper (whisper.cpp) and aligned
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
- Optional: [Voicebox](https://github.com/jamiepine/voicebox) running locally with
  "Keep server running" on, and at least one voice profile
- Optional: OmniVoice (Python 3, Apple Silicon or CPU): `npm run setup:omnivoice` once, then
  `npm run omnivoice` (serves on `127.0.0.1:17600`). Non-commercial use only, see below.
- Optional: whisper.cpp for caption timing (`npm run setup:whisper`)
- Optional: an Anthropic API key or the `claude` CLI for AI planning

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your keys
npm run app                  # http://localhost:4310
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run app` | Start Reel Studio (Express API + Vite UI on one port) |
| `npm run setup:whisper` | Install whisper.cpp and download the caption timing model |
| `npm run setup:omnivoice` | Create the OmniVoice Python environment and download its model |
| `npm run omnivoice` | Start the local OmniVoice TTS server (`127.0.0.1:17600`) |
| `npm run studio` | Open Remotion Studio for the demo compositions |
| `npm run voice:atlas` | Generate voiceover for the demo reel (`--provider=eleven\|voicebox\|omnivoice`) |
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
| Voicebox | Qwen3-TTS | Chatterbox, Malay (`ms`) voice | Whisper |
| OmniVoice | yes | yes (native) | Whisper |
| Upload | yes | yes | Whisper |

Voicebox has no Indonesian voice, so Indonesian narration is sent as Malay, the closest
supported language. Listen before publishing.

OmniVoice speaks Indonesian natively. Built-in voices `wanita` and `pria` are created on
first use; add your own as `~/.cache/reel-studio/omnivoice-voices/<id>.wav` plus `<id>.txt`
(exact transcript). **License:** OmniVoice code is Apache-2.0, but its pretrained weights
are CC-BY-NC, so OmniVoice voiceovers are for non-commercial use only.

## Security notes

- The server binds to `127.0.0.1` and rejects unexpected `Host` headers.
- API keys live only in `.env.local`, which is gitignored.

## Roadmap

- Whisper timing for the demo CLI script (`scripts/voiceover.mjs`)
- Keep a warm `whisper-server` instead of spawning `whisper-cli` per clip
