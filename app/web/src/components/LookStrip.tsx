import { Thumbnail } from "@remotion/player";
import { memo, useCallback, useMemo, useRef } from "react";
import type { Project } from "../../../shared/project";
import { LOOKS } from "../../../../src/looks";
import { LOOK_IDS, type LookId } from "../../../../src/looks/types";
import { SingleScene } from "../../../../src/Reel";
import { FPS } from "../../../../src/timeline";
import { activePalette, firstPalette, titleTile, type Style, type StyleOverride } from "../style";
import { hoverHandlers } from "../hover";
import { PaletteChips } from "./PaletteChips";

type Props = {
  readonly project: Project;
  readonly style: Style;
  readonly onPreview: (override: StyleOverride | null) => void;
  readonly onChange: (override: StyleOverride) => void;
};

type TileProps = {
  readonly source: Project;
  readonly look: LookId;
  // The palette the reel uses when this tile is its current look, else undefined.
  readonly palette: string | undefined;
  readonly onPreview: Props["onPreview"];
  readonly onChange: Props["onChange"];
};

const LookTile = memo(({ source, look, palette, onPreview, onChange }: TileProps) => {
  const selected = palette !== undefined;
  const tile = useMemo(() => titleTile(source, look, palette), [source, look, palette]);
  const choice = { look, palette: palette ?? firstPalette(look) };
  return (
    <button
      type="button"
      className={`look-tile${selected ? " selected" : ""}`}
      aria-pressed={selected}
      title={LOOKS[look].description}
      onClick={() => {
        onPreview(null);
        // Picking the current look again keeps its palette.
        if (!selected) onChange(choice);
      }}
      {...hoverHandlers(() => onPreview(choice), () => onPreview(null))}
    >
      <Thumbnail
        component={SingleScene}
        inputProps={tile.inputProps}
        frameToDisplay={tile.frame}
        durationInFrames={tile.durationInFrames}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={FPS}
        className="look-thumb"
        style={{ width: 90, height: 160 }}
      />
      <strong>{LOOKS[look].name}</strong>
      <small>{LOOKS[look].description}</small>
    </button>
  );
});

// Picks the reel's look from stills of its own title scene, then a palette within that look.
export const LookStrip = ({ project, style, onPreview, onChange }: Props) => {
  // Stills only depend on the title scene and the brand mark. Autosaves hand back a new project object each time,
  // so the source is rebuilt from those values only and the six stills are not redrawn on every save.
  const title = project.voice.title;
  const brand = project.options.brand;
  const source = useMemo(
    () => project,
    [project.plan.title.lead, project.plan.title.main, title?.src, title?.duration, project.options.captions, brand?.handle, brand?.position, project.logo?.src, project.options.tune?.textScale, project.options.tune?.speed],
  );
  // Stable callbacks, so memoized tiles do not re-render when the parent passes new closures.
  const latest = useRef({ onPreview, onChange });
  latest.current = { onPreview, onChange };
  const preview = useCallback((o: StyleOverride | null) => latest.current.onPreview(o), []);
  const change = useCallback((o: StyleOverride) => latest.current.onChange(o), []);
  const current = activePalette(style);
  return (
    <section className="look-strip" aria-label="Look">
      <div className="look-tiles">
        {LOOK_IDS.map((id) => (
          <LookTile key={id} source={source} look={id} palette={style.look === id ? current : undefined} onPreview={preview} onChange={change} />
        ))}
      </div>
      <PaletteChips style={style} onPreview={onPreview} onChange={onChange} />
    </section>
  );
};
