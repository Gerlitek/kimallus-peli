import { ConditionalCheckFailedException, DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { ScoreEntry, ScoreRow } from '@kimallus/shared';
import { BOARD, counterKey, LEADERBOARD_INDEX, scoreItem, scoreRow } from './logic/items';

/** Where scores are kept. The handler knows only this, so the tests run it without a database. */
export interface Store {
  /** Keeps the session's best run. True when this score was saved, false when the session already has a higher one. */
  save(entry: ScoreEntry): Promise<boolean>;
  /** The best scores, highest first. */
  top(limit: number): Promise<ScoreRow[]>;
  /** Counts one request on today's counter for `route`. False when the day's `max` is already used up. */
  allow(route: string, max: number): Promise<boolean>;
}

/** True when the write was refused by its condition, which is an expected answer here, not a failure. */
async function conditional(write: Promise<unknown>): Promise<boolean> {
  try {
    await write;
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/** The DynamoDB table. `endpoint` is set only for DynamoDB Local; in AWS the SDK finds the region and the role's credentials. */
export function dynamoStore(table: string, endpoint?: string): Store {
  const local: DynamoDBClientConfig = { endpoint, region: 'local', credentials: { accessKeyId: 'local', secretAccessKey: 'local' } };
  const db = DynamoDBDocumentClient.from(new DynamoDBClient(endpoint ? local : {}));

  return {
    save(entry) {
      const { pk, ...fields } = scoreItem(entry, new Date());
      const keys = Object.keys(fields);
      // UpdateItem with a condition: create the item, or overwrite it only with a higher score.
      // The database checks and writes in one step, so two requests at once cannot both pass.
      // Names go through #placeholders because `name`, `level` and `at` are DynamoDB reserved words.
      return conditional(
        db.send(
          new UpdateCommand({
            TableName: table,
            Key: { pk },
            UpdateExpression: `SET ${keys.map((k) => `#${k} = :${k}`).join(', ')}`,
            ConditionExpression: 'attribute_not_exists(pk) OR #score < :score',
            ExpressionAttributeNames: Object.fromEntries(keys.map((k) => [`#${k}`, k])),
            ExpressionAttributeValues: Object.fromEntries(keys.map((k) => [`:${k}`, fields[k as keyof typeof fields]])),
          }),
        ),
      );
    },

    async top(limit) {
      // Query reads only the items it returns, in sort key order. A Scan would read (and bill) the whole table.
      const res = await db.send(
        new QueryCommand({
          TableName: table,
          IndexName: LEADERBOARD_INDEX,
          KeyConditionExpression: 'board = :board',
          ExpressionAttributeValues: { ':board': BOARD },
          ScanIndexForward: false,
          Limit: limit,
        }),
      );
      return (res.Items ?? []).map(scoreRow);
    },

    allow(route, max) {
      const { pk, expires } = counterKey(route, new Date());
      // ADD is an atomic counter: the database adds 1 itself, so parallel requests never lose a count.
      // The condition stops the counter at `max`, and the refused request gets 429.
      return conditional(
        db.send(
          new UpdateCommand({
            TableName: table,
            Key: { pk },
            UpdateExpression: 'SET expires = if_not_exists(expires, :expires) ADD n :one',
            ConditionExpression: 'attribute_not_exists(n) OR n < :max',
            ExpressionAttributeValues: { ':expires': expires, ':one': 1, ':max': max },
          }),
        ),
      );
    },
  };
}
