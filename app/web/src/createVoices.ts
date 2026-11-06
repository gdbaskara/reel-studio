export type VoiceFailure = { readonly sceneId: string; readonly message: string };
export type VoiceRun = { readonly failed: readonly VoiceFailure[]; readonly stopped: boolean };

type Hooks = {
  readonly generate: (sceneId: string) => Promise<unknown>;
  readonly onProgress: (done: number, total: number) => void;
  readonly stopped: () => boolean;
};

// Voices scenes one after another. A failed scene is noted and skipped, so one bad request never
// leaves the reel half made; the editor can retry it. Stopping takes effect before the next scene.
export const voiceEveryScene = async (sceneIds: readonly string[], hooks: Hooks): Promise<VoiceRun> => {
  const failed: VoiceFailure[] = [];
  for (const [i, sceneId] of sceneIds.entries()) {
    if (hooks.stopped()) return { failed, stopped: true };
    hooks.onProgress(i + 1, sceneIds.length);
    try {
      await hooks.generate(sceneId);
    } catch (e) {
      failed.push({ sceneId, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return { failed, stopped: false };
};
