import { LOOKS } from "../../../../src/looks";
import { hoverHandlers } from "../hover";
import { activePalette, type Style, type StyleOverride } from "../style";

type Props = {
  readonly style: Style;
  readonly onPreview: (override: StyleOverride | null) => void;
  readonly onChange: (override: StyleOverride) => void;
};

// The palettes of the current look, each shown as its paper, accent and highlight colours.
export const PaletteChips = ({ style, onPreview, onChange }: Props) => {
  const active = activePalette(style);
  return (
    <div className="palette-chips">
      {LOOKS[style.look].palettes.map(({ name, label, colors }) => {
        const choice = { look: style.look, palette: name };
        return (
          <button
            key={name}
            type="button"
            className={`palette-chip${active === name ? " selected" : ""}`}
            title={label}
            aria-label={`${label} colours`}
            aria-pressed={active === name}
            onClick={() => {
              onPreview(null);
              onChange(choice);
            }}
            {...hoverHandlers(() => onPreview(choice), () => onPreview(null))}
          >
            {[colors.paper, colors.accent, colors.highlight].map((c, i) => (
              <i key={i} style={{ background: c }} />
            ))}
          </button>
        );
      })}
    </div>
  );
};
