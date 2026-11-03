import { Composition } from "remotion";
import { Reel } from "./Reel";
import { buildScenes, FPS, totalFrames } from "./timeline";
import type { ReelProps } from "./types";
import { HOOKS_REEL } from "./reels/hooks";
import { ATLAS_REEL } from "./reels/atlas";
import hooksVoice from "./voiceover/hooks.json";
import atlasVoice from "./voiceover/atlas.json";

const SIZE = { width: 1080, height: 1920, fps: FPS } as const;

const REELS: readonly (ReelProps & { readonly compositionId: string })[] = [
  { compositionId: "Hooks", spec: HOOKS_REEL, voice: hooksVoice },
  { compositionId: "Atlas", spec: ATLAS_REEL, voice: atlasVoice },
];

export const Root = () => (
  <>
    {REELS.map(({ compositionId, spec, voice }) => (
      <Composition
        key={compositionId}
        id={compositionId}
        component={Reel}
        {...SIZE}
        durationInFrames={totalFrames(buildScenes(spec, voice))}
        defaultProps={{ spec, voice }}
      />
    ))}
    {/* Rendered by the app with --props; its length is derived from those props. */}
    <Composition
      id="Custom"
      component={Reel}
      {...SIZE}
      durationInFrames={1}
      defaultProps={{ spec: ATLAS_REEL, voice: atlasVoice, captions: true } as ReelProps}
      calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(buildScenes(props.spec, props.voice)) })}
    />
  </>
);
