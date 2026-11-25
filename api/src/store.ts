import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { ScoreEntry, ScoreRow } from '@kimallus/shared';
import { BOARD, LEADERBOARD_INDEX, scoreItem, scoreRow } from './logic/items';

/** Where scores are kept. The handler knows only this, so the tests run it without a database. */
export interface Store {
  /** Saves the score. False when this session already has one. */
  save(entry: ScoreEntry): Promise<boolean>;
  /** The best scores, highest first. */
  top(limit: number): Promise<ScoreRow[]>;
}

/** The DynamoDB table. `endpoint` is set only for a local database; in AWS the SDK finds the region's own. */
export function dynamoStore(table: string, endpoint?: string): Store {
  const db = DynamoDBDocumentClient.from(new DynamoDBClient(endpoint ? { endpoint } : {}));
  return {
    async save(entry) {
      try {
        // The condition makes "check, then write" one step in the database: two requests cannot both pass.
        await db.send(new PutCommand({ TableName: table, Item: scoreItem(entry, new Date()), ConditionExpression: 'attribute_not_exists(pk)' }));
        return true;
      } catch (err) {
        if (err instanceof ConditionalCheckFailedException) return false;
        throw err;
      }
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
  };
}
