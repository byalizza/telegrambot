import { q1, q, w } from '../db/database.js';

export function farmRoutes(fastify, db, miningService) {
  fastify.get('/api/farm/status', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const user = await q1(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    const userAnimals = await q(db,
      'SELECT ua.*, a.name, a.tier, a.purchase_cost_gold, a.daily_production_gold, a.emoji FROM user_animals ua JOIN animals a ON ua.animal_id = a.id WHERE ua.user_id = ?',
      [userId]);
    const allAnimals = await q(db, 'SELECT * FROM animals ORDER BY tier');

    const unclaimedGold = await miningService.calculateUnclaimedGold(userId, Number(user.last_claim_time));

    return {
      goldBalance: Number(user.gold_balance),
      hourlyProduction: await miningService.calculateHourlyProduction(userId),
      dailyProduction: await miningService.calculateDailyProduction(userId),
      lastClaimTime: Number(user.last_claim_time),
      unclaimedGold,
      animals: userAnimals.map(ua => ({
        animal: { id: ua.animal_id, name: ua.name, tier: ua.tier, purchase_cost_gold: ua.purchase_cost_gold, daily_production_gold: ua.daily_production_gold, emoji: ua.emoji },
        quantity: ua.quantity
      })),
      availableAnimals: allAnimals.map(a => ({ ...a, id: a.id }))
    };
  });

  fastify.post('/api/farm/claim', { preHandler: [fastify.authenticate] }, async (request) => {
    return await miningService.claimReward(request.user.id);
  });

  fastify.post('/api/farm/purchase', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { animalId, quantity = 1 } = request.body || {};
    if (!animalId) return reply.code(400).send({ error: 'animalId required' });

    const result = await miningService.purchaseAnimal(request.user.id, animalId, quantity);
    if (!result.success) return reply.code(400).send(result);
    return result;
  });
}
