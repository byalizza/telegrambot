import { q1, w } from '../db/database.js';

export function walletRoutes(fastify, db, walletService) {
  fastify.get('/api/wallet/balance', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = await q1(db, 'SELECT * FROM users WHERE id = ?', [request.user.id]);
    const cooldownRemaining = walletService.getCooldownRemaining(request.user.telegramId || request.user.id);

    return {
      goldBalance: Number(user.gold_balance),
      usdBalance: (Number(user.gold_balance) / 10000).toFixed(2),
      totalEarned: Number(user.total_earned),
      totalWithdrawn: Number(user.total_withdrawn),
      cwalletId: user.cwallet_id || '',
      minWithdrawalGold: walletService.MIN_WITHDRAWAL,
      minWithdrawalUsd: (walletService.MIN_WITHDRAWAL / 10000).toFixed(2),
      cooldownRemaining,
      dailyLimit: walletService.DAILY_LIMIT,
      todayWithdrawn: await walletService.getTodayTotalWithdrawal()
    };
  });

  fastify.post('/api/wallet/set-cwallet', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { cwalletId } = request.body || {};
    if (!cwalletId || !walletService.validateCWalletId(cwalletId)) {
      return reply.code(400).send({ error: 'Invalid CWallet ID format' });
    }
    await w(db, 'UPDATE users SET cwallet_id = ? WHERE id = ?', [cwalletId, request.user.id]);
    return { success: true, message: 'CWallet ID saved' };
  });

  fastify.post('/api/wallet/withdraw', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { amountGold, cwalletId } = request.body || {};
    if (!amountGold || !cwalletId) return reply.code(400).send({ error: 'amountGold and cwalletId required' });

    const cooldownRemaining = walletService.getCooldownRemaining(request.user.telegramId || request.user.id);
    if (cooldownRemaining > 0) {
      const hours = Math.ceil(cooldownRemaining / 3600000);
      return reply.code(429).send({ error: `Please wait ${hours}h before next withdrawal` });
    }

    const result = await walletService.processWithdrawal(request.user.id, amountGold, cwalletId);
    if (result.success) {
      walletService.setCooldown(request.user.telegramId || request.user.id);
    }
    return result.success ? result : reply.code(400).send(result);
  });
}
