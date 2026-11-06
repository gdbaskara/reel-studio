import { useEffect, useState, type RefObject } from "react";
import type { PlayerRef } from "@remotion/player";
import { sceneLabel } from "../../../shared/toReel";
import { sceneAtFrame, type Segment } from "../timelineSegments";
import { posterFrame } from "../poster";

type Props = {
  readonly segments: readonly Segment[];
  readonly selected: number;
  readonly mode: "scene" | "full";
  readonly playerRef: RefObject<PlayerRef | null>;
  readonly onSelect: (index: number) => void;
};

// The frame the whole-video player is on, kept in step as it plays or is scrubbed.
const usePlayerFrame = (playerRef: RefObject<PlayerRef | null>, active: boolean) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const player = playerRef.current;
    if (!active || !player) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    setFrame(player.getCurrentFrame());
    player.addEventListener("frameupdate", onFrame);
    return () => player.removeEventListener("frameupdate", onFrame);
  }, [playerRef, active]);
  return frame;
};

// Every scene as a block sized by its length. In the whole-video view a playhead follows the
// player, the playing scene lights up, and clicking a block jumps there.
export const Timeline = ({ segments, selected, mode, playerRef, onSelect }: Props) => {
  const full = mode === "full";
  const frame = usePlayerFrame(playerRef, full);
  const total = segments.reduce((sum, s) => sum + s.frames, 0);
  const playing = full ? sceneAtFrame(segments, frame) : -1;
  return (
    <div className="timeline" role="group" aria-label="Scenes on the timeline">
      {segments.map((segment, i) => (
        <button
          key={segment.id}
          type="button"
          className={`timeline-block${i === selected ? " selected" : ""}${i === playing ? " playing" : ""}`}
          style={{ flexGrow: segment.share }}
          aria-pressed={i === selected}
          title={`${sceneLabel(segment.id)}, ${segment.seconds}s`}
          onClick={() => {
            onSelect(i);
            // Lands after the entrances, so the scene shows its content rather than empty paper.
            if (full) playerRef.current?.seekTo(segment.start + posterFrame(segment.frames));
          }}
        >
          <span>{segment.id === "title" ? "T" : segment.id === "outro" ? "End" : segment.id.slice(5)}</span>
          <small>{segment.seconds}s</small>
        </button>
      ))}
      {full && total > 0 ? <div className="playhead" style={{ left: `${(frame / total) * 100}%` }} aria-hidden="true" /> : null}
    </div>
  );
};
