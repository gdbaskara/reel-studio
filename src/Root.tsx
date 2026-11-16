import { Composition } from "remotion";
import { Reel } from "./Reel";
import { buildScenes, FPS, totalFrames } from "./timeline";
import type { ReelProps } from "./types";
import { HOOKS_REEL } from "./reels/hooks";
import { PANDU_REEL } from "./reels/pandu";
import hooksVoice from "./voiceover/hooks.json";

const SIZE = { width: 1080, height: 1920, fps: FPS } as const;

const REELS: readonly (ReelProps & { readonly compositionId: string })[] = [
  { compositionId: "Hooks", spec: HOOKS_REEL, voice: hooksVoice },
  // No committed voiceover for the Pandu demo; `npm run voice:pandu` generates one.
  { compositionId: "Pandu", spec: PANDU_REEL, voice: {} },
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
      defaultProps={{ spec: PANDU_REEL, voice: {}, captions: true } as ReelProps}
      calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(buildScenes(props.spec, props.voice)) })}
    />
  </>
);
