import type { ReactNode } from "react";
import { STEP_LAYOUTS, type StepLayout } from "../../../shared/project";

type Props = { readonly value: StepLayout; readonly onChange: (layout: StepLayout) => void };

const LABEL: Readonly<Record<StepLayout, string>> = { center: "Centre", left: "Left", "big-number": "Big number" };

// Small sketches of each layout: a badge or number, a title line and a note.
const SKETCH: Readonly<Record<StepLayout, ReactNode>> = {
  center: (
    <>
      <circle cx="20" cy="9" r="5" />
      <rect x="9" y="18" width="22" height="4" rx="2" />
      <rect x="12" y="26" width="16" height="5" rx="1" />
    </>
  ),
  left: (
    <>
      <circle cx="9" cy="9" r="5" />
      <rect x="4" y="18" width="22" height="4" rx="2" />
      <rect x="4" y="26" width="16" height="5" rx="1" />
    </>
  ),
  "big-number": (
    <>
      <rect x="12" y="3" width="16" height="14" rx="2" />
      <rect x="9" y="21" width="22" height="4" rx="2" />
      <rect x="12" y="29" width="16" height="4" rx="1" />
    </>
  ),
};

export const LayoutPicker = ({ value, onChange }: Props) => (
  <fieldset className="field doodles">
    <legend>Layout</legend>
    <div className="doodle-row">
      {STEP_LAYOUTS.map((layout) => (
        <button
          key={layout}
          type="button"
          className={`doodle${value === layout ? " selected" : ""}`}
          aria-label={LABEL[layout]}
          aria-pressed={value === layout}
          title={LABEL[layout]}
          onClick={() => onChange(layout)}
        >
          <svg viewBox="0 0 40 36" aria-hidden="true" fill="currentColor">
            {SKETCH[layout]}
          </svg>
        </button>
      ))}
    </div>
  </fieldset>
);
