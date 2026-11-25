import { createHandler } from './handler';
import { dynamoStore } from './store';

const table = process.env.TABLE_NAME;
if (!table) throw new Error('TABLE_NAME is not set');

/**
 * The Lambda entry point. This file runs once per cold start, so the database client is made here
 * and reused by every request that the same instance serves.
 */
export const handler = createHandler(dynamoStore(table, process.env.DYNAMODB_ENDPOINT));
