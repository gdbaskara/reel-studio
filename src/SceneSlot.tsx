import { Audio, Sequence, staticFile } from "remotion";
import { VOICE_DELAY, type Scene } from "./timeline";
import type { ReelSpec } from "./types";
import { TitleScene } from "./scenes/TitleScene";
import { StepScene } from "./scenes/StepScene";
import { OutroScene } from "./scenes/OutroScene";
import { Captions } from "./components/Captions";

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

type Props = { readonly spec: ReelSpec; readonly scene: Scene; readonly captions: boolean };

// One scene with its visuals, captions and voice clip, starting at frame 0.
export const SceneSlot = ({ spec, scene, captions }: Props) => (
  <>
    <SceneBody spec={spec} scene={scene} />
    {scene.clip && captions ? <Captions words={scene.clip.words} delayFrames={VOICE_DELAY} /> : null}
    {scene.clip ? (
      <Sequence from={VOICE_DELAY}>
        <Audio src={scene.clip.src ?? staticFile(`vo/${spec.id}/${scene.voiceId}.wav`)} />
      </Sequence>
    ) : null}
  </>
);
