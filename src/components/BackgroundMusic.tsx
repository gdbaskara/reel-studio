import { Audio, Sequence } from "remotion";
import { musicCopies, musicVolume, voiceWindows } from "../music";
import { FPS, totalFrames, type Scene } from "../timeline";
import type { Music } from "../types";

// offset is the reel frame where this player starts (a scene preview), 0 for the whole reel.
type Props = { readonly music: Music; readonly scenes: readonly Scene[]; readonly offset?: number };

// One music track under the whole reel. A song shorter than the reel is repeated back to back.
// Remotion counts a volume callback's frame from when that audio becomes audible (after any
// trim), so each copy adds its own reel start to get the frame on the reel's timeline.
export const BackgroundMusic = ({ music, scenes, offset = 0 }: Props) => {
  const total = totalFrames(scenes);
  const length = Math.max(1, Math.floor(music.duration * FPS));
  const mix = { volume: music.volume, duck: music.duck, windows: voiceWindows(scenes), total };
  return (
    <>
      {musicCopies(total, length, offset).map(({ from, duration, trim, reelStart }) => (
        <Sequence key={reelStart} from={from} durationInFrames={duration} layout="none">
          <Audio src={music.src} trimBefore={trim || undefined} volume={(frame) => musicVolume(reelStart + frame, mix)} />
        </Sequence>
      ))}
    </>
  );
};
