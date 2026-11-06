import { Player, type PlayerRef } from "@remotion/player";
import { useMemo, type RefObject } from "react";
import type { Project } from "../../../shared/project";
import { toReelProps } from "../../../shared/toReel";
import { Reel, SingleScene } from "../../../../src/Reel";
import { buildScenes, FPS, totalFrames } from "../../../../src/timeline";
import { posterFrame } from "../poster";

type Props = {
  readonly project: Project;
  readonly sceneIndex: number;
  readonly mode: "scene" | "full";
  readonly playerRef: RefObject<PlayerRef | null>;
};

export const ScenePreview = ({ project, sceneIndex, mode, playerRef }: Props) => {
  const props = useMemo(() => toReelProps(project), [project]);
  const scenes = buildScenes(props.spec, props.voice);
  // Clicks on the picture open the text's field, so playing is left to the controls and the space bar.
  const shared = {
    compositionWidth: 1080,
    compositionHeight: 1920,
    fps: FPS,
    controls: true,
    clickToPlay: false,
    style: { width: "100%", aspectRatio: "9 / 16", borderRadius: 12, overflow: "hidden" },
    acknowledgeRemotionLicense: true,
  } as const;

  // The paused player opens on a settled frame; frame 0 is still empty paper before the entrances.
  return mode === "full" ? (
    <Player key="full" ref={playerRef} component={Reel} inputProps={props} durationInFrames={totalFrames(scenes)} initialFrame={posterFrame(scenes[0]?.frames ?? 1)} {...shared} />
  ) : (
    <Player
      key={`scene-${sceneIndex}`}
      ref={playerRef}
      component={SingleScene}
      inputProps={{ ...props, sceneIndex }}
      durationInFrames={scenes[sceneIndex]?.frames ?? 1}
      initialFrame={posterFrame(scenes[sceneIndex]?.frames ?? 1)}
      {...shared}
    />
  );
};
