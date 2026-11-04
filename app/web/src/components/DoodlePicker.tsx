import { DRAWINGS } from "../../../shared/project";
import { DRAWINGS as SHAPES } from "../../../../src/components/drawings";
import type { Drawing } from "../../../../src/types";

type Props = { readonly value: Drawing; readonly onChange: (drawing: Drawing) => void };

// One small button per doodle, each drawing its own stroke.
export const DoodlePicker = ({ value, onChange }: Props) => (
  <fieldset className="field doodles">
    <legend>Doodle</legend>
    <div className="doodle-row">
      {DRAWINGS.map((name) => (
        <button
          key={name}
          type="button"
          className={`doodle${value === name ? " selected" : ""}`}
          aria-label={name}
          aria-pressed={value === name}
          title={name}
          onClick={() => onChange(name)}
        >
          <svg viewBox={SHAPES[name].viewBox} aria-hidden="true">
            <path d={SHAPES[name].path} fill="none" stroke="currentColor" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  </fieldset>
);
