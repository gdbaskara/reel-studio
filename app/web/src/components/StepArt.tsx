import { artBox } from "../../../../src/components/Illustration";
import type { Art } from "../../../../src/types";

const viewBoxOf = (art: Art) => {
  const box = artBox(art.paths, art.fills);
  return `${box.x} ${box.y} ${box.w} ${box.h}`;
};

type Props = {
  readonly art: Art | undefined;
  readonly busy: boolean;
  readonly canDraw: boolean;
  readonly onDraw: () => void;
  readonly onRemove: () => void;
};

// The step's illustration that Claude draws from the step text. It replaces the doodle.
export const StepArt = ({ art, busy, canDraw, onDraw, onRemove }: Props) => (
  <div className="field">
    <span>
      Illustration {busy ? <span className="badge">Claude is drawing...</span> : null}
    </span>
    {art ? (
      <svg className="step-art" viewBox={viewBoxOf(art)} role="img" aria-label="Step illustration">
        {(art.fills ?? []).map((d, i) => (
          <path key={`fill-${i}`} d={d} fill="var(--accent-soft)" stroke="none" />
        ))}
        {art.paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    ) : (
      <p className="hint">{canDraw ? "Claude draws a picture of this step, shown in place of the doodle." : "Write a step title first, then Claude can draw it."}</p>
    )}
    <div className="voice-actions">
      <button type="button" disabled={busy || !canDraw} onClick={onDraw}>
        {art ? "Redraw" : "Draw illustration"}
      </button>
      {art ? (
        <button type="button" className="danger" disabled={busy} onClick={onRemove}>
          Remove
        </button>
      ) : null}
    </div>
  </div>
);
