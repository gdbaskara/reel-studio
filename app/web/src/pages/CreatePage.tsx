import { useEffect, useState } from "react";
import type { CreateOptions } from "../../../shared/project";
import { sceneIdsOf } from "../../../shared/toReel";
import { PALETTES } from "../../../../src/palettes";
import { api, type ProjectSummary, type Status } from "../api";
import { navigate } from "../App";
import { Choice } from "../components/Choice";

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
  const [status, setStatus] = useState<Status | null>(null);
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.status().then(setStatus).catch(() => setStatus(null));
    api.list().then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (status && !status.elevenlabs && options.voiceMode === "eleven") setOptions((o) => ({ ...o, voiceMode: "mac" }));
  }, [status, options.voiceMode]);

  const set = <K extends keyof CreateOptions>(key: K, value: CreateOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));

  const create = async () => {
    setError(null);
    try {
      setProgress(options.planMode === "ai" ? "Writing the plan with AI... (up to a minute)" : "Setting up your scenes...");
      const project = await api.create({ prompt, options });
      if (options.voiceMode === "eleven" || options.voiceMode === "mac") {
        const ids = sceneIdsOf(project.plan);
        for (const [i, sceneId] of ids.entries()) {
          setProgress(`Generating voice ${i + 1} of ${ids.length}...`);
          await api.generateVoice(project.id, sceneId, options.voiceMode);
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
          onChange={(v) => set("voiceMode", v)}
          options={[
            { value: "eleven", title: "Generate: ElevenLabs", detail: status?.elevenlabs ? "Natural voice, exact caption timing" : "Add ELEVENLABS_API_KEY to enable", disabled: !status?.elevenlabs },
            { value: "mac", title: "Generate: Mac voice", detail: "Free and offline" },
            { value: "upload", title: "Upload my recordings", detail: "One audio file per scene" },
            { value: "mixed", title: "Decide per scene", detail: "Mix generated and uploaded" },
          ]}
        />

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
