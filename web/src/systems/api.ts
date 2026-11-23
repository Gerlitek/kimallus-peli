/**
 * The game's server. Empty until the AWS side exists: then the leaderboard shows only this browser's own best,
 * and the dashboard says that numbers are on their way. Set VITE_API_URL at build time to turn it on.
 */
export const API_URL: string = import.meta.env.VITE_API_URL ?? '';

/** `?demo` in the address shows made-up rows and numbers, for working on the layout. */
export const DEMO = new URLSearchParams(location.search).has('demo');

/** GET a JSON document from the API, or null when there is no API or it does not answer. */
export async function getJson<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
