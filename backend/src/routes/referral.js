import { q1, q } from '../db/database.js';

export function referralRoutes(fastify, db) {
  fastify.get('/api/referral/stats', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const countRow = await q1(db, 'SELECT COUNT(*) as c FROM referrals WHERE referrer_user_id = ?', [userId]);
    const totalRow = await q1(db, 'SELECT COALESCE(SUM(bonus_earned), 0) as total FROM referrals WHERE referrer_user_id = ?', [userId]);
    const referrals = await q(db,
      'SELECT r.*, u.username FROM referrals r JOIN users u ON r.referred_user_id = u.id WHERE r.referrer_user_id = ?',
      [userId]);

    return {
      referralCode: `FARM_${userId}`,
      referralCount: countRow?.c || 0,
      totalBonusEarned: totalRow?.total || 0,
      referrals: referrals.map(r => ({
        username: r.username,
        joinedAt: r.created_at,
        bonusEarned: r.bonus_earned
      }))
    };
  });

  fastify.get('/api/referral/link', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const botUsername = process.env.BOT_USERNAME || 'FarmMineBot';
    return {
      referralCode: `FARM_${userId}`,
      inviteLink: `https://t.me/${botUsername}?start=FARM_${userId}`,
      bonusPerReferral: 50,
      commissionRate: '10%'
    };
  });
}
