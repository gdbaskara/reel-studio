import { AbsoluteFill, Series } from "remotion";
import { useMemo, type ReactNode } from "react";
import { LookProvider } from "./ThemeContext";
import { resolveLook } from "./looks/resolve";
import { Background } from "./components/Background";
import { buildScenes } from "./timeline";
import type { BrandMark as Mark, ReelProps, ReelSpec } from "./types";
import { BRANDED_CONTENT_TOP, CONTENT_TOP, ContentTopProvider } from "./layout";
import { SceneSlot } from "./SceneSlot";
import { ProgressBar } from "./components/ProgressBar";
import { BackgroundMusic } from "./components/BackgroundMusic";
import { sceneStart } from "./music";
import { BrandMark } from "./components/BrandMark";

type CanvasProps = { readonly spec: ReelSpec; readonly brand?: Mark; readonly children: ReactNode };

export const Canvas = ({ spec, brand, children }: CanvasProps) => {
  const look = useMemo(() => resolveLook(spec.look, spec.palette), [spec.look, spec.palette]);
  return (
    <LookProvider value={look}>
      <ContentTopProvider value={brand ? BRANDED_CONTENT_TOP : CONTENT_TOP}>
        <AbsoluteFill style={{ backgroundColor: spec.palette.paper, fontFamily: look.fonts.display, color: spec.palette.ink }}>
          {look.background === "flat" ? null : <Background />}
          {children}
        </AbsoluteFill>
      </ContentTopProvider>
    </LookProvider>
  );
};

export const Reel = ({ spec, voice, captions = true, music, progressBar = true, brand }: ReelProps) => {
  const scenes = buildScenes(spec, voice);
  return (
    <Canvas spec={spec} brand={brand}>
      <Series>
        {scenes.map((scene, i) => (
          <Series.Sequence key={scene.voiceId} durationInFrames={scene.frames}>
            <SceneSlot spec={spec} scene={scene} captions={captions} enters={i > 0} />
          </Series.Sequence>
        ))}
      </Series>
      {music ? <BackgroundMusic music={music} scenes={scenes} /> : null}
      {brand ? <BrandMark brand={brand} /> : null}
      {progressBar ? <ProgressBar /> : null}
    </Canvas>
  );
};

// Previews a single scene on its own, used by the editor's per-scene player.
// Music plays from where this scene sits in the whole reel, so it sounds the same as the render.
export const SingleScene = ({ spec, voice, captions = true, music, brand, sceneIndex }: ReelProps & { readonly sceneIndex: number }) => {
  const scenes = buildScenes(spec, voice);
  const scene = scenes[sceneIndex];
  return (
    <Canvas spec={spec} brand={brand}>
      {scene ? <SceneSlot spec={spec} scene={scene} captions={captions} enters={sceneIndex > 0} /> : null}
      {scene && music ? <BackgroundMusic music={music} scenes={scenes} offset={sceneStart(scenes, sceneIndex)} /> : null}
      {scene && brand ? <BrandMark brand={brand} offset={sceneStart(scenes, sceneIndex)} /> : null}
    </Canvas>
  );
};
