import { q1, q, w } from '../db/database.js';

const MIN_WITHDRAWAL = parseInt(process.env.MIN_WITHDRAWAL_GOLD || '500');
const DAILY_LIMIT = parseFloat(process.env.DAILY_WITHDRAWAL_LIMIT_USD || '50');
const COOLDOWN_HOURS = parseInt(process.env.WITHDRAWAL_COOLDOWN_HOURS || '24');

const cooldownMap = new Map();
const lockMap = new Map();

// Tokens and deposit addresses – set via env as JSON or use defaults
const DEFAULT_DEPOSIT_INFO = {
  tokens: [
    { symbol: 'USDT', network: 'TRC20', address: 'TXYZ... (admin cüzdanı)', minDeposit: 5 },
    { symbol: 'USDT', network: 'BEP20', address: '0xABC... (admin cüzdanı)', minDeposit: 5 },
    { symbol: 'BTC', network: 'Bitcoin', address: 'bc1q... (admin cüzdanı)', minDeposit: 10 },
    { symbol: 'TON', network: 'TON', address: 'UQ... (admin cüzdanı)', minDeposit: 5 }
  ],
  goldPerUsd: 10000
};

function getDepositInfo() {
  try {
    const env = process.env.DEPOSIT_INFO;
    if (env) return JSON.parse(env);
  } catch {}
  return DEFAULT_DEPOSIT_INFO;
}

export function walletRoutes(fastify, db) {
  // ─── USER: balance & info ───
  fastify.get('/api/wallet/balance', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = await q1(db, 'SELECT * FROM users WHERE id = ?', [request.user.id]);
    const cooldownRemaining = getCooldownRemaining(request.user.telegramId || request.user.id);
    const todayStart = Date.now() - (Date.now() % 86400000);

    const [pendingWithdraw, pendingDeposit, todayWithdrawn] = await Promise.all([
      q1(db, "SELECT COALESCE(SUM(amount_gold),0) as s FROM transactions WHERE user_id=? AND type='WITHDRAWAL' AND status='PENDING'", [request.user.id]),
      q1(db, "SELECT COALESCE(SUM(amount_gold),0) as s FROM transactions WHERE user_id=? AND type='DEPOSIT' AND status='PENDING'", [request.user.id]),
      q1(db, "SELECT COALESCE(SUM(amount_usd),0) as s FROM transactions WHERE user_id=? AND type='WITHDRAWAL' AND status='COMPLETED' AND created_at>=?", [request.user.id, todayStart])
    ]);

    return {
      goldBalance: Number(user.gold_balance),
      usdBalance: (Number(user.gold_balance) / 10000).toFixed(2),
      totalEarned: Number(user.total_earned),
      totalWithdrawn: Number(user.total_withdrawn),
      totalDeposited: Number(user.total_earned || 0),
      walletAddress: (user.withdraw_address || user.cwallet_id || ''),
      minWithdrawalGold: MIN_WITHDRAWAL,
      cooldownRemaining,
      todayWithdrawnUsd: Number(todayWithdrawn?.s || 0),
      pendingWithdrawGold: Number(pendingWithdraw?.s || 0),
      pendingDepositGold: Number(pendingDeposit?.s || 0),
      dailyLimit: DAILY_LIMIT,
      depositInfo: getDepositInfo()
    };
  });

  // ─── USER: save withdraw address ───
  fastify.post('/api/wallet/set-address', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { address } = request.body || {};
    if (!address || address.length < 10) return reply.code(400).send({ error: 'Invalid wallet address' });
    await w(db, 'UPDATE users SET withdraw_address = ?, cwallet_id = ? WHERE id = ?', [address, address, request.user.id]);
    return { success: true };
  });

  // ─── USER: create PENDING deposit ───
  fastify.post('/api/wallet/deposit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { amountGold, network, txHash } = request.body || {};
    if (!amountGold || !network || !txHash) return reply.code(400).send({ error: 'amountGold, network, txHash required' });
    if (amountGold < 500) return reply.code(400).send({ error: 'Minimum 500 gold deposit' });

    if (!acquireLock('dep_' + request.user.id)) return reply.code(409).send({ error: 'Already processing' });
    try {
      const dup = await q1(db, "SELECT id FROM transactions WHERE reference_id=? AND type='DEPOSIT'", [txHash]);
      if (dup) return reply.code(400).send({ error: 'This TX hash was already submitted' });

      const amountUsd = amountGold / 10000;
      await w(db,
        "INSERT INTO transactions (user_id, type, amount_gold, amount_usd, description, reference_id, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
        [request.user.id, 'DEPOSIT', amountGold, amountUsd, `Deposit ${network}: ${txHash}`, txHash, 'PENDING', Date.now()]);
      return { success: true, message: 'Deposit bildiriminiz alındı! Admin onaylayınca altın hesabınıza eklenir.' };
    } finally { releaseLock('dep_' + request.user.id); }
  });

  // ─── USER: create PENDING withdrawal ───
  fastify.post('/api/wallet/withdraw', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { amountGold, address } = request.body || {};
    if (!amountGold || !address) return reply.code(400).send({ error: 'amountGold and address required' });
    if (amountGold < MIN_WITHDRAWAL) return reply.code(400).send({ error: `Minimum ${MIN_WITHDRAWAL} gold` });

    const cooldownRemaining = getCooldownRemaining(request.user.telegramId || request.user.id);
    if (cooldownRemaining > 0) return reply.code(429).send({ error: `${Math.ceil(cooldownRemaining / 3600000)}h bekle` });

    const user = await q1(db, 'SELECT * FROM users WHERE id = ?', [request.user.id]);
    if (!user || Number(user.gold_balance) < amountGold) return reply.code(400).send({ error: 'Insufficient balance' });

    const amountUsd = amountGold / 10000;
    const todayStart = Date.now() - (Date.now() % 86400000);
    const todayTotal = await q1(db,
      "SELECT COALESCE(SUM(amount_usd),0) as s FROM transactions WHERE type='WITHDRAWAL' AND status='COMPLETED' AND created_at>=?", [todayStart]);
    if (amountUsd > (DAILY_LIMIT - Number(todayTotal.s))) return reply.code(429).send({ error: 'Daily limit reached' });

    if (!acquireLock(request.user.id)) return reply.code(409).send({ error: 'Already processing' });
    try {
      await w(db, 'UPDATE users SET withdraw_address = ?, cwallet_id = ? WHERE id = ?', [address, address, request.user.id]);
      await w(db,
        "INSERT INTO transactions (user_id, type, amount_gold, amount_usd, description, reference_id, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
        [request.user.id, 'WITHDRAWAL', amountGold, amountUsd, `Withdraw to ${address}`, address, 'PENDING', Date.now()]);
      setCooldown(request.user.telegramId || request.user.id);
      return { success: true, message: 'Çekim talebiniz alındı! Admin onaylayınca gönderilir.' };
    } finally { releaseLock(request.user.id); }
  });

  // ─── USER: pending transactions list ───
  fastify.get('/api/wallet/pending', { preHandler: [fastify.authenticate] }, async (request) => {
    const txs = await q(db,
      "SELECT id, type, amount_gold, description, status, created_at FROM transactions WHERE user_id=? AND status='PENDING' ORDER BY created_at DESC LIMIT 20",
      [request.user.id]);
    return { transactions: txs.map(t => ({ ...t, amountGold: Number(t.amount_gold), createdAt: Number(t.created_at) })) };
  });

  // ─── ADMIN: all pending ───
  fastify.get('/api/admin/pending', async (request, reply) => {
    if (request.query.token !== (process.env.ADMIN_TOKEN || 'admin123')) return reply.code(401).send('Unauthorized');
    const [withdrawals, deposits] = await Promise.all([
      q(db, `SELECT t.*, u.username FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.type='WITHDRAWAL' AND t.status='PENDING' ORDER BY t.created_at ASC`),
      q(db, `SELECT t.*, u.username FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.type='DEPOSIT' AND t.status='PENDING' ORDER BY t.created_at ASC`)
    ]);
    return {
      withdrawals: withdrawals.map(t => ({ id: t.id, userId: t.user_id, username: t.username, amountGold: Number(t.amount_gold), amountUsd: Number(t.amount_usd), address: t.reference_id, description: t.description, createdAt: Number(t.created_at) })),
      deposits: deposits.map(t => ({ id: t.id, userId: t.user_id, username: t.username, amountGold: Number(t.amount_gold), amountUsd: Number(t.amount_usd), txHash: t.reference_id, description: t.description, createdAt: Number(t.created_at) }))
    };
  });

  // ─── ADMIN: approve any pending tx ───
  fastify.post('/api/admin/pending/approve', async (request, reply) => {
    if (request.query.token !== (process.env.ADMIN_TOKEN || 'admin123')) return reply.code(401).send('Unauthorized');
    const { txId } = request.body || {};
    if (!txId) return reply.code(400).send({ error: 'txId required' });

    const tx = await q1(db, "SELECT * FROM transactions WHERE id=? AND status='PENDING'", [txId]);
    if (!tx) return reply.code(404).send({ error: 'Not found' });

    if (tx.type === 'WITHDRAWAL') {
      const user = await q1(db, 'SELECT * FROM users WHERE id=?', [tx.user_id]);
      if (!user || Number(user.gold_balance) < Number(tx.amount_gold)) {
        await w(db, "UPDATE transactions SET status='FAILED' WHERE id=?", [txId]);
        return reply.code(400).send({ error: 'Yetersiz bakiye, iptal edildi' });
      }
      await w(db, 'UPDATE users SET gold_balance=gold_balance-?, total_withdrawn=total_withdrawn+? WHERE id=?', [tx.amount_gold, tx.amount_gold, tx.user_id]);
    } else if (tx.type === 'DEPOSIT') {
      await w(db, 'UPDATE users SET gold_balance=gold_balance+?, total_earned=total_earned+? WHERE id=?', [tx.amount_gold, tx.amount_gold, tx.user_id]);
    }

    await w(db, "UPDATE transactions SET status='COMPLETED' WHERE id=?", [txId]);
    return { success: true, message: 'Onaylandı!' };
  });

  // ─── ADMIN: reject any pending tx ───
  fastify.post('/api/admin/pending/reject', async (request, reply) => {
    if (request.query.token !== (process.env.ADMIN_TOKEN || 'admin123')) return reply.code(401).send('Unauthorized');
    const { txId } = request.body || {};
    if (!txId) return reply.code(400).send({ error: 'txId required' });
    await w(db, "UPDATE transactions SET status='CANCELLED' WHERE id=? AND status='PENDING'", [txId]);
    return { success: true };
  });
}

function getCooldownRemaining(id) {
  const t = cooldownMap.get(String(id));
  if (!t) return 0;
  return Math.max(0, (COOLDOWN_HOURS * 3600000) - (Date.now() - t));
}
function setCooldown(id) { cooldownMap.set(String(id), Date.now()); }
function acquireLock(id) {
  if (lockMap.get(id)) return false;
  lockMap.set(id, true); setTimeout(() => lockMap.delete(id), 30000);
  return true;
}
function releaseLock(id) { lockMap.delete(id); }
