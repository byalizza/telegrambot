import { createClient } from '@libsql/client';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { seedDatabase } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'farmgame.db');

let _client;

export async function getDatabase() {
  if (_client) return _client;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  _client = createClient({ url: `file:${DB_PATH}` });

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  const statements = schema.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    try {
      await _client.execute(stmt.trim() + ';');
    } catch (e) {
      // IF NOT EXISTS may still throw on some versions
    }
  }

  await seedDatabase(_client);
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
