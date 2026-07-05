import { q1, q, w } from '../db/database.js';

export function createMiningService(db) {
  async function calculateHourlyProduction(userId) {
    const animals = await q(db,
      'SELECT ua.quantity, a.daily_production_gold FROM user_animals ua JOIN animals a ON ua.animal_id = a.id WHERE ua.user_id = ?',
      [userId]);
    return animals.reduce((sum, a) => sum + (Number(a.daily_production_gold) * Number(a.quantity)) / 24, 0);
  }

  async function calculateDailyProduction(userId) {
    const animals = await q(db,
      'SELECT ua.quantity, a.daily_production_gold FROM user_animals ua JOIN animals a ON ua.animal_id = a.id WHERE ua.user_id = ?',
      [userId]);
    return animals.reduce((sum, a) => sum + Number(a.daily_production_gold) * Number(a.quantity), 0);
  }

  async function calculateUnclaimedGold(userId, lastClaimTime) {
    if (!lastClaimTime) return 0;
    const hourly = await calculateHourlyProduction(userId);
    const elapsedHours = (Date.now() - lastClaimTime) / 3600000;
    if (elapsedHours <= 0) return 0;
    const unclaimed = Math.floor(hourly * elapsedHours);
    const maxAcc = Math.floor(hourly * 24 * 7);
    return Math.min(unclaimed, maxAcc);
  }

  async function claimReward(userId) {
    const user = await q1(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) throw new Error('User not found');

    const now = Date.now();
    const unclaimed = await calculateUnclaimedGold(userId, Number(user.last_claim_time));

    if (unclaimed <= 0) {
      await w(db, 'UPDATE users SET last_claim_time = ? WHERE id = ?', [now, userId]);
      return { goldEarned: 0, newBalance: Number(user.gold_balance), hourlyProduction: await calculateHourlyProduction(userId) };
    }

    const newBalance = Number(user.gold_balance) + unclaimed;
    const newTotalEarned = Number(user.total_earned) + unclaimed;

    await w(db, 'UPDATE users SET gold_balance = ?, total_earned = ?, last_claim_time = ? WHERE id = ?',
      [newBalance, newTotalEarned, now, userId]);
    await w(db, 'INSERT INTO transactions (user_id, type, amount_gold, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, 'MINING_REWARD', unclaimed, `Claimed ${unclaimed} gold`, 'COMPLETED', now]);

    return { goldEarned: unclaimed, newBalance, hourlyProduction: await calculateHourlyProduction(userId) };
  }

  async function purchaseAnimal(userId, animalId, quantity = 1) {
    const animal = await q1(db, 'SELECT * FROM animals WHERE id = ?', [animalId]);
    if (!animal) return { success: false, message: 'Animal not found' };

    const totalCost = Number(animal.purchase_cost_gold) * quantity;
    const user = await q1(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    if (!user || Number(user.gold_balance) < totalCost) return { success: false, message: 'Insufficient gold' };

    await w(db, 'UPDATE users SET gold_balance = gold_balance - ? WHERE id = ?', [totalCost, userId]);
    await w(db,
      `INSERT INTO user_animals (user_id, animal_id, quantity, is_free_claimed) VALUES (?, ?, ?, 0)
       ON CONFLICT(user_id, animal_id) DO UPDATE SET quantity = quantity + ?`,
      [userId, animalId, quantity, quantity]);
    await w(db, 'INSERT INTO transactions (user_id, type, amount_gold, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, 'PURCHASE', totalCost, `Purchased ${quantity}x ${animal.name}`, 'COMPLETED', Date.now()]);

    const updated = await q1(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    return { success: true, newBalance: Number(updated.gold_balance), message: 'Purchase successful' };
  }

  return { calculateHourlyProduction, calculateDailyProduction, calculateUnclaimedGold, claimReward, purchaseAnimal };
}
