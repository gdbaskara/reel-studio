import { useState } from "react";
import { canShuffle, NO_LOCKS, type Locks } from "../shuffle";
import type { Style } from "../style";

type Props = {
  readonly style: Style;
  readonly canUndo: boolean;
  readonly onShuffle: (locks: Locks) => void;
  readonly onUndo: () => void;
};

const LOCKS: readonly { readonly key: keyof Locks; readonly label: string }[] = [
  { key: "look", label: "Look" },
  { key: "palette", label: "Colours" },
  { key: "doodles", label: "Doodles" },
  { key: "layouts", label: "Layouts" },
];

const Dice = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width={16} height={16}>
    <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
    {[[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]].map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="currentColor" />
    ))}
  </svg>
);

// Tries a random look, palette and set of doodles. Locked parts stay as they are; Undo puts back the last shuffle.
export const ShuffleBar = ({ style, canUndo, onShuffle, onUndo }: Props) => {
  const [locks, setLocks] = useState<Locks>(NO_LOCKS);
  return (
    <div className="shuffle-bar">
      <button type="button" className="shuffle" disabled={!canShuffle(style, locks)} onClick={() => onShuffle(locks)}>
        <Dice /> Shuffle
      </button>
      {canUndo ? (
        <button type="button" onClick={onUndo}>
          Undo
        </button>
      ) : null}
      <span className="locks" role="group" aria-label="Keep while shuffling">
        <small>Keep:</small>
        {LOCKS.map(({ key, label }) => {
          // Palettes belong to a look, so the colours can only be kept while the look is kept.
          const disabled = key === "palette" && !locks.look;
          return (
            <label key={key} className={`lock${disabled ? " disabled" : ""}`} title={disabled ? "Keep the look to keep its colours" : undefined}>
              <input type="checkbox" checked={locks[key] && !disabled} disabled={disabled} onChange={(e) => setLocks({ ...locks, [key]: e.target.checked })} />
              {label}
            </label>
          );
        })}
      </span>
    </div>
  );
};
