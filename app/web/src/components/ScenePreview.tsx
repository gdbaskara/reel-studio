import { Player } from "@remotion/player";
import { useMemo } from "react";
import type { Project } from "../../../shared/project";
import { toReelProps } from "../../../shared/toReel";
import { Reel, SingleScene } from "../../../../src/Reel";
import { buildScenes, FPS, totalFrames } from "../../../../src/timeline";

type Props = { readonly project: Project; readonly sceneIndex: number; readonly mode: "scene" | "full" };

export const ScenePreview = ({ project, sceneIndex, mode }: Props) => {
  const props = useMemo(() => toReelProps(project), [project]);
  const scenes = buildScenes(props.spec, props.voice);
  const shared = {
    compositionWidth: 1080,
    compositionHeight: 1920,
    fps: FPS,
    controls: true,
    style: { width: "100%", aspectRatio: "9 / 16", borderRadius: 12, overflow: "hidden" },
    acknowledgeRemotionLicense: true,
  } as const;

  return mode === "full" ? (
    <Player key="full" component={Reel} inputProps={props} durationInFrames={totalFrames(scenes)} {...shared} />
  ) : (
    <Player
      key={`scene-${sceneIndex}`}
      component={SingleScene}
      inputProps={{ ...props, sceneIndex }}
      durationInFrames={scenes[sceneIndex]?.frames ?? 1}
      {...shared}
    />
  );
};
