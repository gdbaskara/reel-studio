import { SPEEDS, TEXT_SCALE_RANGE, type Speed, type Tune } from "../../../../src/looks/tune";

type Props = { readonly tune: Tune; readonly onChange: (tune: Tune) => void };

const SPEED_LABEL: Readonly<Record<Speed, string>> = { calm: "Calm", normal: "Normal", fast: "Fast" };
const STEP = 0.05;

// Fine-tuning on top of the look: text size and how fast things animate in.
export const TunePanel = ({ tune, onChange }: Props) => (
  <div className="tune-panel">
    <label className="field slider">
      <span>Text size {Math.round(tune.textScale * 100)}%</span>
      <input
        type="range"
        min={TEXT_SCALE_RANGE.min * 100}
        max={TEXT_SCALE_RANGE.max * 100}
        step={STEP * 100}
        value={Math.round(tune.textScale * 100)}
        onChange={(e) => onChange({ ...tune, textScale: Number(e.target.value) / 100 })}
        aria-label="Text size"
      />
    </label>
    <div className="saved-styles" role="group" aria-label="Animation speed">
      <small>Speed</small>
      {SPEEDS.map((speed) => (
        <button
          key={speed}
          type="button"
          className={`look-chip${tune.speed === speed ? " selected" : ""}`}
          aria-pressed={tune.speed === speed}
          onClick={() => onChange({ ...tune, speed })}
        >
          {SPEED_LABEL[speed]}
        </button>
      ))}
    </div>
  </div>
);
