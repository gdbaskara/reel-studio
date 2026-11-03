import { AbsoluteFill, Series } from "remotion";
import type { ReactNode } from "react";
import { HAND_FONT } from "./fonts";
import { ThemeProvider } from "./ThemeContext";
import { buildScenes } from "./timeline";
import type { ReelProps, ReelSpec } from "./types";
import { SceneSlot } from "./SceneSlot";
import { ProgressBar } from "./components/ProgressBar";

export const Canvas = ({ spec, children }: { readonly spec: ReelSpec; readonly children: ReactNode }) => (
  <ThemeProvider value={spec.palette}>
    <AbsoluteFill style={{ backgroundColor: spec.palette.paper, fontFamily: HAND_FONT, color: spec.palette.ink }}>
      {children}
    </AbsoluteFill>
  </ThemeProvider>
);

export const Reel = ({ spec, voice, captions = true }: ReelProps) => (
  <Canvas spec={spec}>
    <Series>
      {buildScenes(spec, voice).map((scene) => (
        <Series.Sequence key={scene.voiceId} durationInFrames={scene.frames}>
          <SceneSlot spec={spec} scene={scene} captions={captions} />
        </Series.Sequence>
      ))}
    </Series>
    <ProgressBar />
  </Canvas>
);

// Previews a single scene on its own, used by the editor's per-scene player.
export const SingleScene = ({ spec, voice, captions = true, sceneIndex }: ReelProps & { readonly sceneIndex: number }) => {
  const scene = buildScenes(spec, voice)[sceneIndex];
  return <Canvas spec={spec}>{scene ? <SceneSlot spec={spec} scene={scene} captions={captions} /> : null}</Canvas>;
};
