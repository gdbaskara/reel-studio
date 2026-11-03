import { useEffect, useState } from "react";
import type { CreateOptions } from "../../../shared/project";
import { sceneIdsOf } from "../../../shared/toReel";
import { PALETTES } from "../../../../src/palettes";
import { api, type ProjectSummary } from "../api";
import { navigate } from "../App";
import { Choice } from "../components/Choice";
import { VoicePicker } from "../components/VoicePicker";
import { OMNIVOICE_PICKER, VOICEBOX_PICKER, omnivoiceOptions, voiceboxOptions } from "../voices";
import { useServices } from "../useServices";
import { defaultVoiceMode } from "../voiceDefault";

const DEFAULTS: CreateOptions = {
  language: "id",
  stepCount: 5,
  planMode: "ai",
  voiceMode: "eleven",
  captions: true,
  palette: "green",
};

export const CreatePage = () => {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<CreateOptions>(DEFAULTS);
  const { status, profiles, omnivoiceVoices } = useServices();
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Until the user picks a voiceover, it follows the language and the running services.
  const [voiceChosen, setVoiceChosen] = useState(false);

  useEffect(() => {
    api.list().then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (!status || voiceChosen) return;
    const voiceMode = defaultVoiceMode(options.language, status);
    setOptions((o) => (o.voiceMode === voiceMode ? o : { ...o, voiceMode }));
  }, [status, options.language, voiceChosen]);

  const set = <K extends keyof CreateOptions>(key: K, value: CreateOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));

  const create = async () => {
    setError(null);
    try {
      setProgress(options.planMode === "ai" ? "Writing the plan with AI... (up to a minute)" : "Setting up your scenes...");
      const project = await api.create({ prompt, options });
      const mode = options.voiceMode;
      if (mode === "eleven" || mode === "voicebox" || mode === "omnivoice") {
        const ids = sceneIdsOf(project.plan);
        for (const [i, sceneId] of ids.entries()) {
          setProgress(`Generating voice ${i + 1} of ${ids.length}...`);
          await api.generateVoice(project.id, sceneId, mode);
        }
      }
      navigate(project.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <main className="create">
      <header className="brand">
        <h1>Reel Studio</h1>
        <p>Describe a reel. Choose how it gets planned and voiced. Then fine-tune every scene.</p>
      </header>

      <section className="panel">
        <label className="field">
          <span>What is the reel about?</span>
          <textarea
            rows={3}
            value={prompt}
            maxLength={1500}
            placeholder="e.g. Cara pakai Atlas untuk karyawan baru: login, bertanya, cek dokumen di Knowledge"
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>

        <Choice
          label="1. Plan"
          value={options.planMode}
          onChange={(v) => set("planMode", v)}
          options={[
            { value: "ai", title: "AI writes the plan", detail: status?.planner === "anthropic-api" ? "Anthropic API" : "Uses your Claude Code login" },
            { value: "manual", title: "I'll write it myself", detail: "Start from blank scenes" },
          ]}
        />

        <Choice
          label="2. Voiceover"
          value={options.voiceMode}
          onChange={(v) => {
            setVoiceChosen(true);
            set("voiceMode", v);
          }}
          options={[
            { value: "eleven", title: "Generate: ElevenLabs", detail: status?.elevenlabs ? "Natural voice, exact caption timing" : "Add ELEVENLABS_API_KEY to enable", disabled: !status?.elevenlabs },
            {
              value: "voicebox",
              title: "Generate: Voicebox",
              detail: status?.voicebox ? "Local and free. Indonesian uses its Malay voice" : "Open Voicebox to enable",
              disabled: !status?.voicebox,
            },
            {
              value: "omnivoice",
              title: "Generate: OmniVoice",
              detail: status?.omnivoice ? "Local, native Indonesian. Non-commercial license" : "Run npm run omnivoice to enable",
              disabled: !status?.omnivoice,
            },
            { value: "upload", title: "Upload my recordings", detail: "One audio file per scene" },
            { value: "mixed", title: "Decide per scene", detail: "Mix generated and uploaded" },
          ]}
        />

        {options.voiceMode === "voicebox" || (options.voiceMode === "mixed" && profiles.length) ? (
          profiles.length ? (
            <VoicePicker {...VOICEBOX_PICKER} voices={voiceboxOptions(profiles)} value={options.voiceboxProfile} onChange={(id) => set("voiceboxProfile", id)} />
          ) : (
            <p className="hint warn">No Voicebox voice profiles found. Create one in Voicebox, or set VOICEBOX_PROFILE.</p>
          )
        ) : null}

        {options.voiceMode === "omnivoice" || (options.voiceMode === "mixed" && omnivoiceVoices.length) ? (
          omnivoiceVoices.length ? (
            <VoicePicker {...OMNIVOICE_PICKER} voices={omnivoiceOptions(omnivoiceVoices)} value={options.omnivoiceVoice} onChange={(id) => set("omnivoiceVoice", id)} />
          ) : (
            <p className="hint warn">No OmniVoice voices found. Start it with: npm run omnivoice</p>
          )
        ) : null}

        {!status?.whisper ? (
          <p className="hint">Tip: install whisper.cpp (npm run setup:whisper) so captions follow the real audio for uploads, Voicebox and OmniVoice.</p>
        ) : null}

        <div className="row">
          <Choice
            label="3. Language"
            value={options.language}
            onChange={(v) => set("language", v)}
            options={[
              { value: "id", title: "Bahasa Indonesia", detail: "Narration and on-screen text" },
              { value: "en", title: "English", detail: "Narration and on-screen text" },
            ]}
          />
          <fieldset className="choice">
            <legend>4. Steps</legend>
            <div className="stepper">
              <button type="button" onClick={() => set("stepCount", Math.max(2, options.stepCount - 1))}>-</button>
              <output>{options.stepCount}</output>
              <button type="button" onClick={() => set("stepCount", Math.min(7, options.stepCount + 1))}>+</button>
            </div>
          </fieldset>
        </div>

        <div className="row">
          <fieldset className="choice">
            <legend>5. Look</legend>
            <div className="swatches">
              {(Object.keys(PALETTES) as (keyof typeof PALETTES)[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`swatch${options.palette === name ? " selected" : ""}`}
                  style={{ background: PALETTES[name].paper, borderColor: PALETTES[name].accent }}
                  onClick={() => set("palette", name)}
                  aria-label={`${name} colours`}
                >
                  <i style={{ background: PALETTES[name].accent }} />
                  <i style={{ background: PALETTES[name].highlight }} />
                  {name}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="toggle">
            <input type="checkbox" checked={options.captions} onChange={(e) => set("captions", e.target.checked)} />
            Word-by-word captions
          </label>
        </div>

        {error ? <p className="error">{error}</p> : null}
        <button className="primary" disabled={busy || prompt.trim().length < 3} onClick={create}>
          {progress ?? "Create reel"}
        </button>
      </section>

      {projects.length ? (
        <section className="panel">
          <h2>Your reels</h2>
          <ul className="project-list">
            {projects.map((p) => (
              <li key={p.id}>
                <a href={`#/p/${p.id}`}>{p.name}</a>
                <time>{new Date(p.updatedAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
};
