import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';
import { parseScoreEntry, TOP } from '@kimallus/shared';
import type { Store } from './store';

/** A score is about 120 bytes of JSON. Longer bodies are refused before they are parsed. */
const MAX_BODY = 1024;

function json(statusCode: number, body: unknown, headers: Record<string, string> = {}): LambdaFunctionURLResult {
  return { statusCode, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) };
}

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
          // CloudFront keeps the answer for a minute, so most readers never reach the function.
          return json(200, await store.top(TOP), { 'cache-control': 'public, max-age=60' });
        case 'POST /api/scores': {
          const entry = parseScoreEntry(readBody(event));
          if (!entry) return json(400, { error: 'invalid score' });
          return (await store.save(entry)) ? json(201, {}) : json(409, { error: 'this session already has a score' });
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
