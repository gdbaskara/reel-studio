// Which Host names the server answers. By default only this machine, which blocks DNS-rebinding pages
// from driving the API. PUBLIC_HOST adds one name for a tunnel (for example a Cloudflare Tunnel), which
// should sit behind its own login, since the app itself has none.
const HOST_NAME = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export const resolvePublicHost = (env: { readonly PUBLIC_HOST?: string }): string | null => {
  const raw = env.PUBLIC_HOST?.trim().toLowerCase();
  if (!raw) return null;
  if (!HOST_NAME.test(raw)) throw new Error(`PUBLIC_HOST must be a host name such as reel.example.com, got "${raw}".`);
  return raw;
};

export type AllowedHosts = { readonly hosts: ReadonlySet<string>; readonly origins: ReadonlySet<string> };

export const allowedHosts = (port: number, publicHost: string | null): AllowedHosts => {
  const local = [`localhost:${port}`, `127.0.0.1:${port}`];
  return {
    hosts: new Set([...local, ...(publicHost ? [publicHost] : [])]),
    origins: new Set([...local.map((h) => `http://${h}`), ...(publicHost ? [`https://${publicHost}`] : [])]),
  };
};

export const isAllowedHost = (allowed: AllowedHosts, host: string | undefined): boolean => allowed.hosts.has(host ?? "");

// Browsers send Origin on cross-site requests; changes are only taken from the app's own pages.
// Requests without one (curl, same-origin GETs) are allowed, as before.
export const isAllowedOrigin = (allowed: AllowedHosts, origin: string | undefined): boolean =>
  origin === undefined || allowed.origins.has(origin);
