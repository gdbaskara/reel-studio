import { useEffect, useMemo, useRef, useState } from "react";
import { CreatePreview } from "../components/CreatePreview";
import { LookStrip } from "../components/LookStrip";
import { ReelList } from "../components/ReelList";
import { sampleProject } from "../sample";
import { styleOf, type StyleOverride } from "../style";
import type { CreateOptions } from "../../../shared/project";
import { sceneIdsOf, sceneLabel } from "../../../shared/toReel";
import { voiceEveryScene } from "../createVoices";
import { leaveNotice } from "../notice";
import { DEFAULT_LOOK } from "../../../../src/looks";
import { api, type ProjectSummary } from "../api";
import { navigate } from "../App";
import { Choice } from "../components/Choice";
import { VoicePicker } from "../components/VoicePicker";
import { OMNIVOICE_PICKER_LABEL, omnivoiceOptions, pickedVoice } from "../voices";
import { useServices } from "../useServices";
import { defaultVoiceMode } from "../voiceDefault";
import { firstPalette } from "../style";
import { useSavedStyles } from "../useSavedStyles";
import { StyleSwatch } from "../components/SavedStylesBar";
import { ThemeToggle } from "../components/ThemeToggle";

// Where a new reel's look comes from: the AI planner, the look chips, or a saved style.
type LookSource = { readonly kind: "ai" } | { readonly kind: "look" } | { readonly kind: "style"; readonly id: string };

const DEFAULTS: CreateOptions = {
  language: "id",
  stepCount: 5,
  planMode: "ai",
  voiceMode: "eleven",
  captions: true,
  look: DEFAULT_LOOK,
  palette: firstPalette(DEFAULT_LOOK),
};

export const CreatePage = () => {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<CreateOptions>(DEFAULTS);
  const { status, omnivoiceVoices } = useServices();
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stoppable, setStoppable] = useState(false);
  // Until the user picks a voiceover, it follows the language and the running services.
  const [voiceChosen, setVoiceChosen] = useState(false);
  const [lookSource, setLookSource] = useState<LookSource>({ kind: "ai" });
  const saved = useSavedStyles();
  // The AI can only pick a look while it writes the plan.
  const aiPicks = lookSource.kind === "ai" && options.planMode === "ai";
  // The reel about to be made, drawn on the preview in the hovered look or the picked one.
  const [hovered, setHovered] = useState<StyleOverride | null>(null);
  const sample = useMemo(() => sampleProject(options, prompt), [options, prompt]);
  const shownLook: StyleOverride = hovered ?? { look: options.look ?? DEFAULT_LOOK, palette: options.palette };

  // The reel list says when it could not load, so an empty list never hides a server problem.
  const [listState, setListState] = useState<"loading" | "ready" | "error">("loading");
  const loadList = () => {
    setListState("loading");
    api
      .list()
      .then((list) => {
        setProjects(list);
        setListState("ready");
      })
      .catch(() => setListState("error"));
  };
  useEffect(loadList, []);
  // Set by the Stop button; voicing checks it before each scene.
  const stopRef = useRef(false);

  useEffect(() => {
    if (!status || voiceChosen) return;
    const voiceMode = defaultVoiceMode(options.language, status);
    setOptions((o) => (o.voiceMode === voiceMode ? o : { ...o, voiceMode }));
  }, [status, options.language, voiceChosen]);

  const set = <K extends keyof CreateOptions>(key: K, value: CreateOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));

  const create = async () => {
    setError(null);
    try {
      setProgress(options.planMode === "ai" ? "Writing the plan and drawing each step with AI... (1 to 2 minutes)" : "Setting up your scenes...");
      // Save the voice the dropdown shows, so generation never falls back to a different one.
      const omnivoiceVoice = pickedVoice(options.omnivoiceVoice, omnivoiceVoices) ?? options.omnivoiceVoice;
      const project = await api.create({
        prompt,
        options: { ...options, omnivoiceVoice },
        ...(aiPicks ? { autoLook: true } : {}),
        ...(lookSource.kind === "style" ? { styleId: lookSource.id } : {}),
      });
      const mode = options.voiceMode;
      // A manual plan starts with empty narration, so there is nothing to speak yet.
      if (options.planMode === "ai" && (mode === "eleven" || mode === "omnivoice")) {
        stopRef.current = false;
        setStoppable(true);
        const run = await voiceEveryScene(sceneIdsOf(project.plan), {
          generate: (sceneId) => api.generateVoice(project.id, sceneId, mode),
          onProgress: (done, total) => setProgress(`Generating voice ${done} of ${total}...`),
          stopped: () => stopRef.current,
        });
        // The reel exists either way, so it opens in the editor, where missing voices can be retried.
        if (run.failed.length) {
          const names = run.failed.map((f) => sceneLabel(f.sceneId)).join(", ");
          leaveNotice(`Voice failed for ${names}: ${run.failed[0].message}. Generate it again from the Voiceover panel.`);
        } else if (run.stopped) {
          leaveNotice("Voicing stopped. Scenes marked No voice can be generated from the Voiceover panel.");
        }
      }
      navigate(project.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProgress(null);
    } finally {
      setStoppable(false);
    }
  };

  const busy = progress !== null;

  return (
    <main className="create">
      <header className="brand">
        <div className="brand-row-top">
          <h1>Reel Studio</h1>
          <ThemeToggle />
        </div>
        <p>Describe a reel. Choose how it gets planned and voiced. Then fine-tune every scene.</p>
      </header>

      <div className="create-layout">
      <section className="panel">
        <label className="field">
          <span>What is the reel about?</span>
          <textarea
            rows={3}
            value={prompt}
            maxLength={1500}
            placeholder="e.g. Cara pakai Pandu untuk karyawan baru: login, bertanya, cek dokumen di Knowledge"
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
              value: "omnivoice",
              title: "Generate: OmniVoice",
              detail: status?.omnivoice ? "Local, native Indonesian. Non-commercial license" : "Run npm run omnivoice to enable",
              disabled: !status?.omnivoice,
            },
            { value: "upload", title: "Upload my recordings", detail: "One audio file per scene" },
            { value: "mixed", title: "Decide per scene", detail: "Mix generated and uploaded" },
          ]}
        />

        {options.voiceMode === "omnivoice" || (options.voiceMode === "mixed" && omnivoiceVoices.length) ? (
          omnivoiceVoices.length ? (
            <VoicePicker
              label={OMNIVOICE_PICKER_LABEL}
              voices={omnivoiceOptions(omnivoiceVoices)}
              value={pickedVoice(options.omnivoiceVoice, omnivoiceVoices)}
              onChange={(id) => set("omnivoiceVoice", id)}
            />
          ) : (
            <p className="hint warn">No OmniVoice voices found. Start it with: npm run omnivoice</p>
          )
        ) : null}

        {!status?.whisper ? (
          <p className="hint">Tip: install whisper.cpp (npm run setup:whisper) so captions follow the real audio for uploads and OmniVoice.</p>
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

        <div className="look-pick">
          <fieldset className="choice">
            <legend>5. Look</legend>
            <div className="look-chips">
              {options.planMode === "ai" ? (
                <button
                  type="button"
                  className={`look-chip${aiPicks ? " selected" : ""}`}
                  aria-pressed={aiPicks}
                  title="The AI picks the look that fits your topic. You can change it in the editor."
                  onClick={() => setLookSource({ kind: "ai" })}
                >
                  AI picks
                </button>
              ) : null}
              {saved.styles.map((style) => {
                const selected = lookSource.kind === "style" && lookSource.id === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    className={`look-chip${selected ? " selected" : ""}`}
                    aria-pressed={selected}
                    title="One of your saved styles"
                    onClick={() => {
                      setLookSource({ kind: "style", id: style.id });
                      set("captions", style.captions);
                    }}
                  >
                    <StyleSwatch style={style} />
                    {style.name}
                  </button>
                );
              })}
            </div>
            {/* Real stills of this reel's title in every look; hovering shows one on the big preview. */}
            <LookStrip
              project={sample}
              style={styleOf(sample.options)}
              onPreview={setHovered}
              onChange={(choice) => {
                setLookSource({ kind: "look" });
                setOptions((o) => ({ ...o, look: choice.look, palette: choice.palette }));
              }}
            />
          </fieldset>
          <label className="toggle">
            <input type="checkbox" checked={options.captions} onChange={(e) => set("captions", e.target.checked)} />
            Word-by-word captions
          </label>
        </div>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="create-actions">
          <button className="primary" disabled={busy || prompt.trim().length < 3} onClick={create} aria-busy={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {progress ?? "Create reel"}
          </button>
          {stoppable ? (
            <button type="button" onClick={() => (stopRef.current = true)} title="Stop after the current voice and open the editor">
              Stop and open editor
            </button>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite">
          {progress ?? ""}
        </p>
      </section>
      <aside className="create-aside">
        <CreatePreview sample={sample} shown={shownLook} aiPicks={aiPicks} />
      </aside>
      </div>

      {listState === "error" ? (
        <section className="panel">
          <h2>Your reels</h2>
          <p className="error" role="alert">
            Could not load your reels. Check that the app server is running.{" "}
            <button type="button" className="link" onClick={loadList}>
              Try again
            </button>
          </p>
        </section>
      ) : null}
      {listState === "loading" ? <p className="hint">Loading your reels...</p> : null}
      {listState === "ready" && projects.length ? (
        <section className="panel reels">
          <h2>Your reels</h2>
          <ReelList
            projects={projects}
            busy={busy}
            onDuplicate={(id) =>
              api
                .duplicate(id)
                .then((copy) => navigate(copy.id))
                .catch((e: Error) => setError(e.message))
            }
            onDelete={(p) => {
              if (!window.confirm(`Delete "${p.name}"? Its voices, pictures and video are removed too. This cannot be undone.`)) return;
              api
                .remove(p.id)
                .then(loadList)
                .catch((e: Error) => setError(e.message));
            }}
          />
        </section>
      ) : null}
    </main>
  );
};
