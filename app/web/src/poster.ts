import { FPS } from "../../../src/timeline";

// By this point every entrance has finished, so a paused player shows the scene, not empty paper.
export const POSTER_SECONDS = 2.5;

export const posterFrame = (frames: number): number => Math.max(0, Math.min(frames - 1, Math.round(FPS * POSTER_SECONDS)));
