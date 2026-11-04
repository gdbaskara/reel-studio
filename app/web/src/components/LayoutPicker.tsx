import type { ReactNode } from "react";
import type { OutroLayout, StepLayout, TitleLayout } from "../../../shared/project";

export type LayoutChoice<T extends string> = { readonly value: T; readonly label: string; readonly sketch: ReactNode };

type Props<T extends string> = {
  readonly choices: readonly LayoutChoice<T>[];
  readonly value: T;
  readonly onChange: (layout: T) => void;
};

// Small sketches of each layout on a 40x36 grid: a badge or tag, a big line and a small one.
export const STEP_CHOICES: readonly LayoutChoice<StepLayout>[] = [
  {
    value: "center",
    label: "Centre",
    sketch: (
      <>
        <circle cx="20" cy="9" r="5" />
        <rect x="9" y="18" width="22" height="4" rx="2" />
        <rect x="12" y="26" width="16" height="5" rx="1" />
      </>
    ),
  },
  {
    value: "left",
    label: "Left",
    sketch: (
      <>
        <circle cx="9" cy="9" r="5" />
        <rect x="4" y="18" width="22" height="4" rx="2" />
        <rect x="4" y="26" width="16" height="5" rx="1" />
      </>
    ),
  },
  {
    value: "big-number",
    label: "Big number",
    sketch: (
      <>
        <rect x="12" y="3" width="16" height="14" rx="2" />
        <rect x="9" y="21" width="22" height="4" rx="2" />
        <rect x="12" y="29" width="16" height="4" rx="1" />
      </>
    ),
  },
];

export const TITLE_CHOICES: readonly LayoutChoice<TitleLayout>[] = [
  {
    value: "center",
    label: "Centre",
    sketch: (
      <>
        <rect x="12" y="7" width="16" height="3" rx="1.5" />
        <rect x="7" y="14" width="26" height="7" rx="2" />
        <rect x="11" y="26" width="18" height="2" rx="1" />
      </>
    ),
  },
  {
    value: "left",
    label: "Left",
    sketch: (
      <>
        <rect x="4" y="7" width="16" height="3" rx="1.5" />
        <rect x="4" y="14" width="26" height="7" rx="2" />
        <rect x="4" y="26" width="18" height="2" rx="1" />
      </>
    ),
  },
  {
    value: "label",
    label: "Label",
    sketch: (
      <>
        <rect x="13" y="5" width="14" height="6" rx="3" />
        <rect x="6" y="15" width="28" height="9" rx="2" />
        <rect x="11" y="28" width="18" height="2" rx="1" />
      </>
    ),
  },
];

export const OUTRO_CHOICES: readonly LayoutChoice<OutroLayout>[] = [
  {
    value: "center",
    label: "Centre",
    sketch: (
      <>
        <ellipse cx="20" cy="13" rx="15" ry="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="10" y="11" width="20" height="4" rx="2" />
        <rect x="13" y="26" width="14" height="4" rx="2" />
      </>
    ),
  },
  {
    value: "left",
    label: "Left",
    sketch: (
      <>
        <rect x="4" y="8" width="22" height="6" rx="2" />
        <rect x="4" y="17" width="10" height="2" rx="1" />
        <rect x="4" y="24" width="16" height="4" rx="2" />
      </>
    ),
  },
  {
    value: "card",
    label: "Card",
    sketch: (
      <>
        <rect x="4" y="5" width="32" height="26" rx="5" />
        <rect x="10" y="12" width="20" height="4" rx="2" fill="var(--panel)" />
        <rect x="13" y="21" width="14" height="3" rx="1.5" fill="var(--panel)" />
      </>
    ),
  },
];

export const LayoutPicker = <T extends string>({ choices, value, onChange }: Props<T>) => (
  <fieldset className="field doodles">
    <legend>Layout</legend>
    <div className="doodle-row">
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          className={`doodle${value === choice.value ? " selected" : ""}`}
          aria-label={choice.label}
          aria-pressed={value === choice.value}
          title={choice.label}
          onClick={() => onChange(choice.value)}
        >
          <svg viewBox="0 0 40 36" aria-hidden="true" fill="currentColor">
            {choice.sketch}
          </svg>
        </button>
      ))}
    </div>
  </fieldset>
);
