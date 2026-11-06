import { useRef } from "react";
import { BACKDROP_PATTERNS, type Backdrop } from "../../../shared/project";

type Props = {
  readonly backdrop: Backdrop;
  readonly busy: boolean;
  readonly hasArt: boolean;
  readonly onChange: (backdrop: Backdrop) => void;
  readonly onUpload: (file: File) => void;
};

type Kind = Backdrop["kind"];
const KINDS: readonly { readonly kind: Kind; readonly label: string }[] = [
  { kind: "look", label: "Look's own" },
  { kind: "pattern", label: "Pattern" },
  { kind: "motif", label: "Topic motif" },
  { kind: "image", label: "Picture" },
];
const PATTERN_LABEL: Readonly<Record<(typeof BACKDROP_PATTERNS)[number], string>> = {
  dots: "Dots",
  grid: "Grid",
  lines: "Lines",
  gradient: "Glow",
  grain: "Grain",
};

// What sits behind every scene. A picture is uploaded once and can then be dimmed.
export const BackdropPanel = ({ backdrop, busy, hasArt, onChange, onUpload }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const pick = (kind: Kind) => {
    if (kind === "look") onChange({ kind: "look" });
    if (kind === "pattern") onChange({ kind: "pattern", pattern: "dots" });
    if (kind === "motif") onChange({ kind: "motif" });
    // A picture needs a file first; picking it again after one is set keeps the current one.
    if (kind === "image" && backdrop.kind !== "image") input.current?.click();
  };
  return (
    <section className="brand-panel backdrop-panel">
      <header>
        <h3>Background</h3>
        {busy ? <span className="badge">Uploading...</span> : null}
      </header>
      <div className="mode-toggle" role="group" aria-label="Background">
        {KINDS.map(({ kind, label }) => (
          <button key={kind} type="button" className={backdrop.kind === kind ? "selected" : ""} aria-pressed={backdrop.kind === kind} disabled={busy} onClick={() => pick(kind)}>
            {label}
          </button>
        ))}
      </div>
      {backdrop.kind === "pattern" ? (
        <div className="mode-toggle" role="group" aria-label="Pattern">
          {BACKDROP_PATTERNS.map((pattern) => (
            <button key={pattern} type="button" className={backdrop.pattern === pattern ? "selected" : ""} aria-pressed={backdrop.pattern === pattern} onClick={() => onChange({ kind: "pattern", pattern })}>
              {PATTERN_LABEL[pattern]}
            </button>
          ))}
        </div>
      ) : null}
      {backdrop.kind === "motif" ? (
        <p className="hint">{hasArt ? "The step illustrations, small and faint, drifting behind every scene." : "The step doodles drift behind every scene. Draw illustrations in the steps to use those instead."}</p>
      ) : null}
      {backdrop.kind === "image" ? (
        <>
          <label className="slider field">
            <span>Fade the picture: {Math.round(backdrop.dim * 100)}%</span>
            <input type="range" min={0} max={0.9} step={0.05} value={backdrop.dim} onChange={(e) => onChange({ ...backdrop, dim: Number(e.target.value) })} />
          </label>
          <div className="voice-actions">
            <button type="button" disabled={busy} onClick={() => input.current?.click()}>
              Replace picture
            </button>
          </div>
        </>
      ) : null}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </section>
  );
};
