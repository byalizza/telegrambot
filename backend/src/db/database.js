import { createClient } from '@libsql/client';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { seedDatabase } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'farmgame.db');

let _client;

export async function getDatabase() {
  if (_client) return _client;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    _client = createClient({ url: tursoUrl, authToken: tursoToken });
  } else {
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    _client = createClient({ url: `file:${DB_PATH}` });
  }

  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      try { await _client.execute(stmt.trim() + ';'); } catch (e) {}
    }
    await seedDatabase(_client);
  } catch (e) {
    console.error('[DB] Init error:', e.message);
  }

  return _client;
}

// query single row
export async function q1(db, sql, args = []) {
  const result = await db.execute({ sql, args });
  const rows = result.rows || [];
  return rows.length > 0 ? rows[0] : null;
}

// query all rows
export async function q(db, sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows || [];
}

// execute (insert/update/delete)
export async function w(db, sql, args = []) {
  return db.execute({ sql, args });
}
