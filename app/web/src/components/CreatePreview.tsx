import { Thumbnail } from "@remotion/player";
import { useMemo } from "react";
import type { Project } from "../../../shared/project";
import { LOOKS } from "../../../../src/looks";
import { SingleScene } from "../../../../src/Reel";
import { FPS } from "../../../../src/timeline";
import { titleTile, type StyleOverride } from "../style";

type Props = { readonly sample: Project; readonly shown: StyleOverride; readonly aiPicks: boolean };

// The title scene of the reel about to be made, in the look under the pointer or the one picked.
export const CreatePreview = ({ sample, shown, aiPicks }: Props) => {
  const tile = useMemo(() => titleTile(sample, shown.look, shown.palette), [sample, shown.look, shown.palette]);
  return (
    <figure className="create-preview">
      <div className="preview-print">
        <Thumbnail
          component={SingleScene}
          inputProps={tile.inputProps}
          frameToDisplay={tile.frame}
          durationInFrames={tile.durationInFrames}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={FPS}
          style={{ width: "100%", aspectRatio: "9 / 16" }}
        />
      </div>
      <figcaption>
        <strong>{LOOKS[shown.look].name}</strong>
        <span>{aiPicks ? "The AI picks the look that fits your topic. This is one option." : LOOKS[shown.look].description}</span>
      </figcaption>
    </figure>
  );
};
