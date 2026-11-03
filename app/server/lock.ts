// Serialises read-modify-write work per project so concurrent requests can't overwrite each other.
const tails = new Map<string, Promise<unknown>>();

export const withProjectLock = <T>(id: string, fn: () => Promise<T>): Promise<T> => {
  const previous = tails.get(id) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(fn);
  tails.set(id, next);
  const cleanup = () => {
    if (tails.get(id) === next) tails.delete(id);
  };
  // Cleanup must not create a second, unhandled copy of a failure; the caller handles it.
  next.then(cleanup, cleanup);
  return next;
};
