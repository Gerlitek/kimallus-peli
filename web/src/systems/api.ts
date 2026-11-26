/**
 * The game's server. Empty until the AWS side exists: then the leaderboard shows only this browser's own best,
 * and the dashboard says that numbers are on their way. Set VITE_API_URL (the site's origin) at build time to turn it on.
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

async function sha256Hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST JSON to the API and return its answer, or null. Never throws: the game goes on without the network.
 * CloudFront signs requests to the Lambda Function URL (OAC), and AWS signing does not read the body,
 * so the body's SHA-256 must come from the browser in `x-amz-content-sha256`.
 */
export async function postJson<T>(path: string, data: unknown): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const body = JSON.stringify(data);
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-amz-content-sha256': await sha256Hex(body) },
      body,
      keepalive: true,
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
