import bcrypt from 'bcrypt';
import { generateToken, validateTelegramInitData } from '../middleware/auth.js';
import { q1, w } from '../db/database.js';

export function authRoutes(fastify, db, botToken) {
  fastify.post('/api/auth/register', async (request, reply) => {
    const { username, password, telegramInitData } = request.body || {};

    // Telegram ile kayıt
    if (telegramInitData) {
      const tgUser = validateTelegramInitData(telegramInitData, botToken);
      if (!tgUser) return reply.code(401).send({ error: 'Invalid Telegram data' });

      let user = await q1(db, 'SELECT * FROM users WHERE telegram_id = ?', [tgUser.id]);
      if (user) {
        const token = generateToken(user);
        return { token, user: { id: user.id, username: user.username, gold_balance: user.gold_balance } };
      }

      const uname = tgUser.username || `tg_${tgUser.id}`;
      const result = await w(db,
        'INSERT INTO users (username, telegram_id, first_name, last_name, created_at) VALUES (?, ?, ?, ?, ?)',
        [uname, tgUser.id, tgUser.first_name, tgUser.last_name, Date.now()]);
      user = await q1(db, 'SELECT * FROM users WHERE rowid = ?', [result.lastInsertRowid]);
      await w(db, 'INSERT INTO user_animals (user_id, animal_id, quantity, is_free_claimed) VALUES (?, 1, 1, 1)', [user.id]);

      const token = generateToken(user);
      return { token, user: { id: user.id, username: user.username, gold_balance: user.gold_balance } };
    }

    // Username ile kayıt
    if (!username) return reply.code(400).send({ error: 'Username required' });

    let user = await q1(db, 'SELECT * FROM users WHERE username = ?', [username]);

    if (user) {
      if (password && user.password_hash) {
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return reply.code(401).send({ error: 'Wrong password' });
      }
    } else {
      const hash = password ? await bcrypt.hash(password, 10) : '';
      const result = await w(db,
        'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
        [username, hash, Date.now()]);
      user = await q1(db, 'SELECT * FROM users WHERE rowid = ?', [result.lastInsertRowid]);
      await w(db, 'INSERT INTO user_animals (user_id, animal_id, quantity, is_free_claimed) VALUES (?, 1, 1, 1)', [user.id]);
    }

    const token = generateToken(user);
    return { token, user: { id: user.id, username: user.username, gold_balance: user.gold_balance } };
  });

  // Login
  fastify.post('/api/auth/login', async (request, reply) => {
    const { username, password, telegramInitData } = request.body || {};

    if (telegramInitData) {
      const tgUser = validateTelegramInitData(telegramInitData, botToken);
      if (!tgUser) return reply.code(401).send({ error: 'Invalid Telegram data' });

      const user = await q1(db, 'SELECT * FROM users WHERE telegram_id = ?', [tgUser.id]);
      if (!user) return reply.code(404).send({ error: 'User not found. Register first.' });

      const token = generateToken(user);
      return { token, user: { id: user.id, username: user.username, gold_balance: user.gold_balance } };
    }

    if (!username) return reply.code(400).send({ error: 'Username required' });
    const user = await q1(db, 'SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return reply.code(404).send({ error: 'User not found' });

    if (user.password_hash) {
      if (!password) return reply.code(401).send({ error: 'Password required' });
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return reply.code(401).send({ error: 'Wrong password' });
    }

    const token = generateToken(user);
    return { token, user: { id: user.id, username: user.username, gold_balance: user.gold_balance } };
  });
}
