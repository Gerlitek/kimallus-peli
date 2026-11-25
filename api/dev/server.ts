/**
 * Local development only: runs the Lambda handler behind a plain HTTP server, against DynamoDB Local in Docker.
 * Each request is turned into the same event a Function URL sends, so the handler is the one that runs in AWS.
 * The table here mirrors the CDK table (keys, index, provisioned capacity). Start the database first: `npm run db`.
 */
import { createServer } from 'node:http';
import { CreateTableCommand, DynamoDBClient, ResourceInUseException } from '@aws-sdk/client-dynamodb';
import type { LambdaFunctionURLEvent } from 'aws-lambda';
import { createHandler } from '../src/handler';
import { LEADERBOARD_INDEX } from '../src/logic/items';
import { dynamoStore } from '../src/store';

const PORT = 3001;
const ENDPOINT = 'http://localhost:8000';
const TABLE = 'kimallus-local';

async function createTable(): Promise<void> {
  const db = new DynamoDBClient({ endpoint: ENDPOINT, region: 'local', credentials: { accessKeyId: 'local', secretAccessKey: 'local' } });
  const capacity = { ReadCapacityUnits: 5, WriteCapacityUnits: 5 };
  try {
    await db.send(
      new CreateTableCommand({
        TableName: TABLE,
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'board', AttributeType: 'S' },
          { AttributeName: 'score', AttributeType: 'N' },
        ],
        KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: capacity,
        GlobalSecondaryIndexes: [
          {
            IndexName: LEADERBOARD_INDEX,
            KeySchema: [
              { AttributeName: 'board', KeyType: 'HASH' },
              { AttributeName: 'score', KeyType: 'RANGE' },
            ],
            // The leaderboard shows only these fields, so only they are copied into the index.
            Projection: { ProjectionType: 'INCLUDE', NonKeyAttributes: ['name', 'level', 'home'] },
            ProvisionedThroughput: capacity,
          },
        ],
      }),
    );
    console.log(`table ${TABLE} created`);
  } catch (err) {
    if (!(err instanceof ResourceInUseException)) throw err;
  }
}

/** The Function URL event for a Node request: the fields the handler reads, as AWS fills them. */
function toEvent(method: string, url: string, body: string): LambdaFunctionURLEvent {
  const { pathname, search } = new URL(url, 'http://localhost');
  return {
    version: '2.0',
    rawPath: pathname,
    rawQueryString: search.slice(1),
    headers: {},
    requestContext: { http: { method, path: pathname } },
    body: body || undefined,
    isBase64Encoded: false,
  } as LambdaFunctionURLEvent;
}

await createTable();
const handler = createHandler(dynamoStore(TABLE, ENDPOINT));

createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', async () => {
    const result = await handler(toEvent(req.method ?? 'GET', req.url ?? '/', Buffer.concat(chunks).toString('utf8')));
    const { statusCode = 200, headers = {}, body = '' } = typeof result === 'string' ? { body: result } : result;
    console.log(`${req.method} ${req.url} ${statusCode}`);
    res.writeHead(statusCode, headers as Record<string, string>).end(body);
  });
}).listen(PORT, () => console.log(`API on http://localhost:${PORT}, database ${ENDPOINT}`));
