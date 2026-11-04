import { useState } from "react";
import type { Proposal } from "../../../shared/restyle";
import { QUICK_STYLES } from "../restyle";
import type { Style } from "../style";

type Props = {
  readonly style: Style;
  readonly proposal: Proposal | null;
  readonly busy: boolean;
  readonly onPreview: (proposal: Proposal | null) => void;
  readonly onApply: (proposal: Proposal) => void;
  readonly onAsk: (text: string) => Promise<Proposal | null>;
};

// Quick directions and a free-text request to the AI. Either one is previewed on the player first,
// then applied as a single edit or dropped.
export const RestylePanel = ({ style, proposal, busy, onPreview, onApply, onAsk }: Props) => {
  const [text, setText] = useState("");
  const ask = async () => {
    const result = await onAsk(text.trim());
    if (result) onPreview(result);
  };
  return (
    <section className="restyle">
      <div className="saved-styles" role="group" aria-label="Quick restyle">
        <small>Make it</small>
        {QUICK_STYLES.map((quick) => (
          <button key={quick.id} type="button" className="look-chip" disabled={busy} onClick={() => onPreview(quick.propose(style))}>
            {quick.label}
          </button>
        ))}
      </div>
      <form
        className="style-name restyle-ask"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3) void ask();
        }}
      >
        <input value={text} maxLength={300} placeholder="Describe a style, e.g. elegant like a tech ad" onChange={(e) => setText(e.target.value)} aria-label="Describe a style" />
        <button type="submit" disabled={busy || text.trim().length < 3}>
          {busy ? "Thinking..." : "Suggest"}
        </button>
      </form>
      {proposal ? (
        <div className="proposal" role="status">
          <span>Previewing: {proposal.summary ?? "a new style"}</span>
          <button type="button" className="primary" onClick={() => onApply(proposal)}>
            Apply
          </button>
          <button type="button" className="link" onClick={() => onPreview(null)}>
            Cancel
          </button>
        </div>
      ) : null}
    </section>
  );
};
