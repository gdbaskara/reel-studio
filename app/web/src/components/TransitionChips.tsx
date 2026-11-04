import { LOOKS } from "../../../../src/looks";
import { TRANSITIONS, type Transition } from "../../../../src/transitions";
import type { Style } from "../style";

type Props = { readonly style: Style; readonly onChange: (transition: Transition | null) => void };

const LABEL: Readonly<Record<Transition, string>> = { fade: "Fade", slide: "Slide", wipe: "Wipe", iris: "Iris" };

// How scenes come in. "Look" follows the current look, so switching looks keeps a fitting transition.
export const TransitionChips = ({ style, onChange }: Props) => {
  const own = LOOKS[style.look].transition;
  const options: readonly { readonly value: Transition | null; readonly label: string }[] = [
    { value: null, label: `Look (${LABEL[own]})` },
    ...TRANSITIONS.map((t) => ({ value: t, label: LABEL[t] })),
  ];
  return (
    <div className="saved-styles" role="group" aria-label="Transition">
      <small>Transition</small>
      {options.map(({ value, label }) => (
        <button
          key={label}
          type="button"
          className={`look-chip${style.transition === value ? " selected" : ""}`}
          aria-pressed={style.transition === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
