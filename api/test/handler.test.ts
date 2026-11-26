import type { LambdaFunctionURLEvent } from 'aws-lambda';
import type { ScoreEntry } from '@kimallus/shared';
import { describe, expect, it } from 'vitest';
import { createHandler, DAILY_MAX } from '../src/handler';
import type { Store } from '../src/store';

/** A store in memory that follows the same rules as the table: the best run per session, a daily counter per route. */
function memoryStore(): Store & { entries: ScoreEntry[]; counts: Map<string, number> } {
  const entries: ScoreEntry[] = [];
  const counts = new Map<string, number>();
  return {
    entries,
    counts,
    async save(entry) {
      const at = entries.findIndex((e) => e.session === entry.session);
      if (at >= 0 && entries[at].score >= entry.score) return false;
      if (at >= 0) entries[at] = entry;
      else entries.push(entry);
      return true;
    },
    async top(limit) {
      return [...entries].sort((a, b) => b.score - a.score).slice(0, limit).map(({ session: _, ...row }) => row);
    },
    async allow(route, max) {
      const n = counts.get(route) ?? 0;
      if (n >= max) return false;
      counts.set(route, n + 1);
      return true;
    },
  };
}

/** The parts of a Function URL event that the handler reads. */
function request(method: string, rawPath: string, body?: unknown, base64 = false): LambdaFunctionURLEvent {
  const text = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  return {
    rawPath,
    requestContext: { http: { method } },
    body: text !== undefined && base64 ? Buffer.from(text).toString('base64') : text,
    isBase64Encoded: base64,
  } as LambdaFunctionURLEvent;
}

const body = (res: unknown) => JSON.parse((res as { body: string }).body) as unknown;
const session = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const score = (n: number, points: number): ScoreEntry => ({ session: session(n), name: [1, 1, 2, 0], score: points, level: 1, home: false });

describe('POST /api/scores', () => {
  it('saves a valid score', async () => {
    const store = memoryStore();
    const res = await createHandler(store)(request('POST', '/api/scores', score(1, 120)));
    expect(res).toMatchObject({ statusCode: 200 });
    expect(body(res)).toEqual({ best: true });
    expect(store.entries).toEqual([score(1, 120)]);
  });

  it('reads a base64 body', async () => {
    const res = await createHandler(memoryStore())(request('POST', '/api/scores', score(1, 120), true));
    expect(body(res)).toEqual({ best: true });
  });

  it("keeps the session's best run", async () => {
    const store = memoryStore();
    const handler = createHandler(store);
    await handler(request('POST', '/api/scores', score(1, 120)));
    expect(body(await handler(request('POST', '/api/scores', score(1, 80))))).toEqual({ best: false });
    expect(body(await handler(request('POST', '/api/scores', score(1, 300))))).toEqual({ best: true });
    expect(store.entries).toEqual([score(1, 300)]);
  });

  it('refuses a missing, broken, invalid or oversized body without counting it', async () => {
    const store = memoryStore();
    const handler = createHandler(store);
    const bodies = [undefined, '{not json', { ...score(1, 120), score: -1 }, { ...score(1, 120), pad: 'x'.repeat(2000) }];
    for (const b of bodies) {
      expect(await handler(request('POST', '/api/scores', b))).toMatchObject({ statusCode: 400 });
    }
    expect(store.entries).toEqual([]);
    expect(store.counts.size).toBe(0);
  });

  it('answers 429 when the day is full', async () => {
    const store = memoryStore();
    store.counts.set('scores', DAILY_MAX.scores);
    expect(await createHandler(store)(request('POST', '/api/scores', score(1, 120)))).toMatchObject({ statusCode: 429 });
    expect(store.entries).toEqual([]);
  });
});

describe('GET /api/leaderboard', () => {
  it('returns the ten best, highest first, without session ids', async () => {
    const store = memoryStore();
    for (let i = 1; i <= 12; i++) await store.save(score(i, i * 10));
    const res = await createHandler(store)(request('GET', '/api/leaderboard'));
    const rows = body(res) as Record<string, unknown>[];
    expect(rows.map((r) => r.score)).toEqual([120, 110, 100, 90, 80, 70, 60, 50, 40, 30]);
    expect(rows[0]).toEqual({ name: [1, 1, 2, 0], score: 120, level: 1, home: false });
    expect(res).toMatchObject({ statusCode: 200, headers: { 'cache-control': 'public, max-age=60' } });
  });

  it('answers 429 when the day is full', async () => {
    const store = memoryStore();
    store.counts.set('leaderboard', DAILY_MAX.leaderboard);
    expect(await createHandler(store)(request('GET', '/api/leaderboard'))).toMatchObject({ statusCode: 429 });
  });
});

describe('errors', () => {
  it('answers 404 to anything else', async () => {
    const handler = createHandler(memoryStore());
    expect(await handler(request('GET', '/api/scores'))).toMatchObject({ statusCode: 404 });
    expect(await handler(request('DELETE', '/api/leaderboard'))).toMatchObject({ statusCode: 404 });
  });

  it('answers 500 without details when the store fails', async () => {
    const fail = () => Promise.reject(new Error('table is gone'));
    const broken: Store = { save: fail, top: fail, allow: fail };
    const res = await createHandler(broken)(request('GET', '/api/leaderboard'));
    expect(res).toEqual({ statusCode: 500, headers: { 'content-type': 'application/json' }, body: '{"error":"internal error"}' });
  });
});
