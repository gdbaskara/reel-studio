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
- **Mixed voiceover** - per scene, generate with ElevenLabs or macOS `say`, or upload
  your own audio (mp3/wav/m4a, up to 90 s).
- **Captions** - TikTok-style word highlight, timed from ElevenLabs alignment
  (estimated for uploaded audio).
- **Render** - one click to MP4 with progress, then download.

## Requirements

- Node.js 22+
- ffmpeg (`brew install ffmpeg`)
- macOS for the `say` voice and `afinfo` duration lookup
- Optional: an ElevenLabs API key, and either an Anthropic API key or the `claude` CLI
  for AI planning

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
| `npm run studio` | Open Remotion Studio for the demo compositions |
| `npm run voice:atlas` | Generate voiceover for the demo reel (`--provider=eleven\|mac`) |
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

## Security notes

- The server binds to `127.0.0.1` and rejects unexpected `Host` headers.
- API keys live only in `.env.local`, which is gitignored.

## Roadmap

- Replace the macOS voice with [Voicebox](https://github.com/jamiepine/voicebox)
  (local, open-source voice cloning)
- Whisper-based word alignment for uploaded and locally generated audio
