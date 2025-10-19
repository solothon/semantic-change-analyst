import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';
import { DatabaseStorage } from './storage';
import type { Env } from './routes-cloudflare';

type DatabaseInstance = ReturnType<typeof drizzle<typeof schema>>;

const dbInstances = new Map<string, DatabaseInstance>();
const poolInstances = new Map<string, Pool>();
const storageInstances = new Map<string, DatabaseStorage>();

export function getDatabase(env: Env): DatabaseInstance {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL or HYPERDRIVE connection not configured');
  }

  if (dbInstances.has(connectionString)) {
    return dbInstances.get(connectionString)!;
  }

  neonConfig.fetchConnectionCache = true;

  const pool = new Pool({
    connectionString,
  });

  const db = drizzle(pool, { schema });
  
  poolInstances.set(connectionString, pool);
  dbInstances.set(connectionString, db);
  
  return db;
}

export function getStorage(env: Env): DatabaseStorage {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL or HYPERDRIVE connection not configured');
  }

  if (storageInstances.has(connectionString)) {
    return storageInstances.get(connectionString)!;
  }

  const db = getDatabase(env);
  const storage = new DatabaseStorage(db);
  storageInstances.set(connectionString, storage);
  
  return storage;
}

export async function closeConnection(env: Env) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  
  const pool = poolInstances.get(connectionString);
  if (pool) {
    await pool.end();
    poolInstances.delete(connectionString);
    dbInstances.delete(connectionString);
    storageInstances.delete(connectionString);
  }
}
