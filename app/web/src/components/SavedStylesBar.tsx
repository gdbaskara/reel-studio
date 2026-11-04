import { useState } from "react";
import type { SavedStyle } from "../../../shared/savedStyle";
import { lookChoice } from "../../../../src/looks";

type Props = {
  readonly styles: readonly SavedStyle[];
  readonly busy: boolean;
  readonly onApply: (styleId: string) => void;
  readonly onRemove: (styleId: string) => void;
  readonly onSave: (name: string) => void;
};

const MAX_NAME = 40;

export const StyleSwatch = ({ style }: { readonly style: SavedStyle }) => {
  const { paper, accent, highlight } = lookChoice(style.look, style.palette).palette;
  return (
    <>
      {[paper, accent, highlight].map((c, i) => (
        <i key={i} style={{ background: c }} />
      ))}
    </>
  );
};

// The looks saved for reuse: apply one in a click, or save the current look under a name.
export const SavedStylesBar = ({ styles, busy, onApply, onRemove, onSave }: Props) => {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const submit = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
    setNaming(false);
  };
  return (
    <div className="saved-styles">
      <small>My styles</small>
      {styles.map((style) => (
        <span key={style.id} className="saved-style">
          <button type="button" className="look-chip" disabled={busy} title={`Use ${style.name}`} onClick={() => onApply(style.id)}>
            <StyleSwatch style={style} />
            {style.name}
          </button>
          <button
            type="button"
            className="remove-style"
            aria-label={`Delete ${style.name}`}
            title="Delete this saved style"
            onClick={() => {
              if (window.confirm(`Delete the saved style "${style.name}"? Reels that use it keep their look.`)) onRemove(style.id);
            }}
          >
            &times;
          </button>
        </span>
      ))}
      {naming ? (
        <form
          className="style-name"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input autoFocus value={name} maxLength={MAX_NAME} placeholder="Name, e.g. Brand toko" onChange={(e) => setName(e.target.value)} aria-label="Style name" />
          <button type="submit" disabled={busy || !name.trim()}>
            Save
          </button>
          <button type="button" className="link" onClick={() => setNaming(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" className="link" disabled={busy} onClick={() => setNaming(true)}>
          + Save this look
        </button>
      )}
    </div>
  );
};
