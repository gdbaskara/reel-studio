import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { enterProgress, enterStyle, transitionOf } from "./transitions";
import { VOICE_DELAY, type Scene } from "./timeline";
import type { ReelSpec } from "./types";
import { TitleScene } from "./scenes/TitleScene";
import { StepScene } from "./scenes/StepScene";
import { OutroScene } from "./scenes/OutroScene";
import { Captions } from "./components/Captions";
import { SpokenProvider } from "./spoken";

const SceneBody = ({ spec, scene }: { readonly spec: ReelSpec; readonly scene: Scene }) => {
  switch (scene.kind) {
    case "title":
      return <TitleScene title={spec.title} duration={scene.frames} />;
    case "step":
      return <StepScene step={scene.step} number={scene.number} duration={scene.frames} />;
    case "outro":
      return <OutroScene outro={spec.outro} duration={scene.frames} />;
  }
};

type Props = {
  readonly spec: ReelSpec;
  readonly scene: Scene;
  readonly captions: boolean;
  // False for the first scene of a reel, which is already on screen when it starts.
  readonly enters: boolean;
};

// The scene's visuals coming in with the reel's transition. Fade adds no wrapper, so those reels render as before.
const Entering = ({ spec, scene, enters }: Omit<Props, "captions">) => {
  const frame = useCurrentFrame();
  const kind = transitionOf(spec.look, spec.transition);
  if (kind === "fade" || !enters) return <SceneBody spec={spec} scene={scene} />;
  return (
    <AbsoluteFill style={enterStyle(kind, enterProgress(frame, true))}>
      <SceneBody spec={spec} scene={scene} />
    </AbsoluteFill>
  );
};

// One scene with its visuals, captions and voice clip, starting at frame 0.
export const SceneSlot = ({ spec, scene, captions, enters }: Props) => (
  <>
    <SpokenProvider voice={scene.clip ? { words: scene.clip.words, delayFrames: VOICE_DELAY } : null}>
      <Entering spec={spec} scene={scene} enters={enters} />
    </SpokenProvider>
    {scene.clip && captions ? <Captions words={scene.clip.words} delayFrames={VOICE_DELAY} /> : null}
    {scene.clip ? (
      <Sequence from={VOICE_DELAY}>
        <Audio src={scene.clip.src ?? staticFile(`vo/${spec.id}/${scene.voiceId}.wav`)} />
      </Sequence>
    ) : null}
  </>
);
