import { q1, q, w } from '../db/database.js';

export function socialRoutes(fastify, db, miningService) {
  // ─── LEADERBOARD ───
  fastify.get('/api/leaderboard', async (request, reply) => {
    const limit = Math.min(parseInt(request.query.limit || '50'), 100);
    const users = await q(db,
      `SELECT id, username, gold_balance, total_earned, total_withdrawn,
              (SELECT COUNT(*) FROM friends WHERE user_id = users.id) as friend_count
       FROM users WHERE is_active = 1 ORDER BY gold_balance DESC LIMIT ?`,
      [limit]);

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      username: u.username,
      gold_balance: Number(u.gold_balance),
      total_earned: Number(u.total_earned),
      friend_count: Number(u.friend_count || 0),
      is_online: false
    }));

    // If user is authenticated, get their position
    let myPosition = null;
    if (request.headers.authorization) {
      try {
        const token = request.headers.authorization.split(' ')[1];
        const jwt = (await import('jsonwebtoken')).default;
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'farmgame-secret');
        const myUser = await q1(db, 'SELECT gold_balance FROM users WHERE id = ?', [decoded.id]);
        if (myUser) {
          const pos = await q1(db,
            'SELECT COUNT(*) as c FROM users WHERE is_active = 1 AND gold_balance > ?',
            [Number(myUser.gold_balance)]);
          myPosition = Number(pos.c) + 1;
        }
      } catch {}
    }

    return { leaderboard: ranked, myPosition };
  });

  // ─── FRIEND REQUESTS ───
  fastify.post('/api/friends/send-request', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { username } = request.body || {};
    if (!username) return reply.code(400).send({ error: 'Username required' });

    const target = await q1(db, 'SELECT id FROM users WHERE username = ?', [username]);
    if (!target) return reply.code(404).send({ error: 'User not found' });
    if (target.id === request.user.id) return reply.code(400).send({ error: 'Cannot add yourself' });

    const existing = await q1(db,
      "SELECT status FROM friend_requests WHERE sender_id = ? AND receiver_id = ?",
      [request.user.id, target.id]);
    if (existing) return reply.code(400).send({ error: 'Request already sent' });

    const alreadyFriends = await q1(db,
      'SELECT id FROM friends WHERE user_id = ? AND friend_id = ?',
      [request.user.id, target.id]);
    if (alreadyFriends) return reply.code(400).send({ error: 'Already friends' });

    await w(db,
      'INSERT INTO friend_requests (sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, ?)',
      [request.user.id, target.id, 'pending', Date.now()]);

    return { success: true, message: 'Friend request sent' };
  });

  fastify.post('/api/friends/accept-request', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { requestId } = request.body || {};
    if (!requestId) return reply.code(400).send({ error: 'requestId required' });

    const req = await q1(db,
      'SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = ?',
      [requestId, request.user.id, 'pending']);
    if (!req) return reply.code(404).send({ error: 'Request not found' });

    await w(db, "UPDATE friend_requests SET status = 'accepted' WHERE id = ?", [requestId]);
    await w(db, 'INSERT INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)', [request.user.id, req.sender_id, Date.now()]);
    await w(db, 'INSERT INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)', [req.sender_id, request.user.id, Date.now()]);

    return { success: true, message: 'Friend added!' };
  });

  fastify.post('/api/friends/reject-request', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { requestId } = request.body || {};
    if (!requestId) return reply.code(400).send({ error: 'requestId required' });

    await w(db, "UPDATE friend_requests SET status = 'rejected' WHERE id = ? AND receiver_id = ?", [requestId, request.user.id]);
    return { success: true, message: 'Request rejected' };
  });

  fastify.get('/api/friends/list', { preHandler: [fastify.authenticate] }, async (request) => {
    const friends = await q(db,
      `SELECT f.id as friendship_id, u.id, u.username, u.gold_balance, u.total_earned, u.is_active,
              u.last_claim_time, f.created_at as friend_since
       FROM friends f JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = ?
       ORDER BY u.gold_balance DESC`,
      [request.user.id]);

    return {
      friends: friends.map(f => ({
        friendshipId: f.friendship_id,
        id: f.id,
        username: f.username,
        goldBalance: Number(f.gold_balance),
        totalEarned: Number(f.total_earned),
        isOnline: (Date.now() - Number(f.last_claim_time)) < 3600000,
        friendSince: Number(f.friend_since)
      }))
    };
  });

  fastify.get('/api/friends/requests', { preHandler: [fastify.authenticate] }, async (request) => {
    const sent = await q(db,
      `SELECT fr.*, u.username FROM friend_requests fr JOIN users u ON fr.receiver_id = u.id
       WHERE fr.sender_id = ? AND fr.status = 'pending'`,
      [request.user.id]);

    const received = await q(db,
      `SELECT fr.*, u.username FROM friend_requests fr JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = ? AND fr.status = 'pending'`,
      [request.user.id]);

    return {
      sent: sent.map(r => ({ id: r.id, username: r.username, createdAt: Number(r.created_at) })),
      received: received.map(r => ({ id: r.id, username: r.username, createdAt: Number(r.created_at) }))
    };
  });

  // ─── VISIT FRIEND'S FARM ───
  fastify.get('/api/friends/farm/:userId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const friendId = parseInt(request.params.userId);
    const isFriend = await q1(db,
      'SELECT id FROM friends WHERE user_id = ? AND friend_id = ?',
      [request.user.id, friendId]);
    if (!isFriend) return reply.code(403).send({ error: 'Not friends' });

    const user = await q1(db, 'SELECT id, username, gold_balance FROM users WHERE id = ?', [friendId]);
    if (!user) return reply.code(404).send({ error: 'User not found' });

    const animals = await q(db,
      'SELECT ua.quantity, a.name, a.emoji, a.tier, a.daily_production_gold FROM user_animals ua JOIN animals a ON ua.animal_id = a.id WHERE ua.user_id = ?',
      [friendId]);

    const hourly = await miningService.calculateHourlyProduction(friendId);

    return {
      user: { id: user.id, username: user.username, goldBalance: Number(user.gold_balance) },
      animals: animals.map(a => ({
        name: a.name, emoji: a.emoji, quantity: a.quantity,
        dailyProduction: Number(a.daily_production_gold) * Number(a.quantity)
      })),
      hourlyProduction: hourly
    };
  });

  // ─── SEARCH USERS ───
  fastify.get('/api/users/search', async (request, reply) => {
    const query = request.query.q || '';
    if (query.length < 2) return reply.code(400).send({ error: 'Query too short' });

    const users = await q(db,
      `SELECT id, username, gold_balance FROM users WHERE username LIKE ? AND is_active = 1 LIMIT 10`,
      [`%${query}%`]);

    return { users: users.map(u => ({ id: u.id, username: u.username, goldBalance: Number(u.gold_balance) })) };
  });
}
