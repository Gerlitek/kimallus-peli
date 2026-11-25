import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';
import { parseScoreEntry, TOP } from '@kimallus/shared';
import type { Store } from './store';

/** A score is about 120 bytes of JSON. Longer bodies are refused before they are parsed. */
const MAX_BODY = 1024;

/**
 * Requests per UTC day that reach the database. Above these the API answers 429 until midnight.
 * A Function URL has no throttling of its own, so this is the cost ceiling. CloudFront caches
 * the leaderboard for a minute, so few of its reads get this far.
 */
export const DAILY_MAX = { scores: 2000, leaderboard: 5000 } as const;

function json(statusCode: number, body: unknown, headers: Record<string, string> = {}): LambdaFunctionURLResult {
  return { statusCode, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) };
}

const TOO_MANY = json(429, { error: 'daily limit reached' });

/** The request body as JSON, or null when it is missing, too long or not JSON. */
function readBody(event: LambdaFunctionURLEvent): unknown {
  if (!event.body || event.body.length > MAX_BODY) return null;
  try {
    return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body);
  } catch {
    return null;
  }
}

/** The whole API: one function, routed by method and path. A Function URL sends every request here. */
export function createHandler(store: Store) {
  return async (event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
    try {
      switch (`${event.requestContext.http.method} ${event.rawPath}`) {
        case 'GET /api/leaderboard':
          if (!(await store.allow('leaderboard', DAILY_MAX.leaderboard))) return TOO_MANY;
          // CloudFront keeps the answer for a minute, so most readers never reach the function.
          return json(200, await store.top(TOP), { 'cache-control': 'public, max-age=60' });
        case 'POST /api/scores': {
          // Validate first: a broken request costs no database write, not even on the counter.
          const entry = parseScoreEntry(readBody(event));
          if (!entry) return json(400, { error: 'invalid score' });
          if (!(await store.allow('scores', DAILY_MAX.scores))) return TOO_MANY;
          return json(200, { best: await store.save(entry) });
        }
        default:
          return json(404, { error: 'not found' });
      }
    } catch (err) {
      // The details go to the log (CloudWatch), never to the caller.
      console.error(err);
      return json(500, { error: 'internal error' });
    }
  };
}
