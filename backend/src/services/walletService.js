import { q1, q, w } from '../db/database.js';

const CWALLET_API_KEY = process.env.CWALLET_API_KEY || '';
const CWALLET_API_URL = process.env.CWALLET_API_URL || 'https://api.cwallet.com/v1';
const CWALLET_MERCHANT_ID = process.env.CWALLET_MERCHANT_ID || '';
const DAILY_LIMIT = parseFloat(process.env.DAILY_WITHDRAWAL_LIMIT_USD || '50');
const MIN_WITHDRAWAL = parseInt(process.env.MIN_WITHDRAWAL_GOLD || '500');
const COOLDOWN_HOURS = parseInt(process.env.WITHDRAWAL_COOLDOWN_HOURS || '24');

const cooldownMap = new Map();
const lockMap = new Map();

export function createWalletService(db) {
  function validateCWalletId(id) {
    return /^[A-Za-z0-9_-]{5,64}$/.test(id);
  }

  function getCooldownRemaining(telegramId) {
    const lastTime = cooldownMap.get(String(telegramId));
    if (!lastTime) return 0;
    return Math.max(0, (COOLDOWN_HOURS * 3600000) - (Date.now() - lastTime));
  }

  function setCooldown(telegramId) {
    cooldownMap.set(String(telegramId), Date.now());
  }

  function acquireLock(userId) {
    if (lockMap.get(userId)) return false;
    lockMap.set(userId, true);
    setTimeout(() => lockMap.delete(userId), 30000);
    return true;
  }

  function releaseLock(userId) {
    lockMap.delete(userId);
  }

  async function getTodayTotalWithdrawal() {
    const todayStart = Date.now() - (Date.now() % 86400000);
    const row2 = await q1(db,
      "SELECT COALESCE(SUM(amount_usd), 0) as total FROM transactions WHERE type = 'WITHDRAWAL' AND status = 'COMPLETED' AND created_at >= ?",
      [todayStart]);
    return Number(row2?.total || 0);
  }

  async function processWithdrawal(userId, amountGold, cwalletId) {
    const user = await q1(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return { success: false, message: 'User not found' };
    if (amountGold < MIN_WITHDRAWAL) return { success: false, message: `Minimum withdrawal is ${MIN_WITHDRAWAL} gold` };
    if (Number(user.gold_balance) < amountGold) return { success: false, message: 'Insufficient balance' };
    if (!cwalletId) return { success: false, message: 'CWallet ID required' };

    const amountUsd = amountGold / 10000;
    const todayTotal = await getTodayTotalWithdrawal();
    if (amountUsd > (DAILY_LIMIT - todayTotal)) {
      return { success: false, message: `Daily limit reached. Remaining: $${(DAILY_LIMIT - todayTotal).toFixed(2)}` };
    }

    const row2 = await q1(db, 'SELECT COUNT(*) as c FROM user_tasks WHERE user_id = ? AND is_completed = 1', [userId]);
    if (Number(row2?.c) === 0) return { success: false, message: 'Complete at least one task before withdrawing' };

    try {
      if (!acquireLock(userId)) return { success: false, message: 'Withdrawal already in progress' };

      await w(db, 'UPDATE users SET gold_balance = gold_balance - ? WHERE id = ?', [amountGold, userId]);

      let cwalletTxId = '';
      if (CWALLET_API_KEY && CWALLET_API_KEY !== 'your_cwallet_api_key') {
        try {
          const response = await fetch(`${CWALLET_API_URL}/payment/send`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CWALLET_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId: cwalletId, amount: amountUsd, currency: 'USD', description: 'FarmMine withdrawal', merchantId: CWALLET_MERCHANT_ID })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'CWallet error');
          cwalletTxId = data.transactionId || '';
        } catch (cwErr) {
          await w(db, 'UPDATE users SET gold_balance = gold_balance + ? WHERE id = ?', [amountGold, userId]);
          releaseLock(userId);
          return { success: false, message: `Payment failed: ${cwErr.message}` };
        }
      }

      await w(db, 'INSERT INTO transactions (user_id, type, amount_gold, amount_usd, description, reference_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, 'WITHDRAWAL', amountGold, amountUsd, `Withdrawal to ${cwalletId}`, cwalletTxId, 'COMPLETED', Date.now()]);
      await w(db, 'UPDATE users SET total_withdrawn = total_withdrawn + ? WHERE id = ?', [amountGold, userId]);

      return { success: true, message: `$${amountUsd.toFixed(2)} sent to your CWallet!`, transactionId: cwalletTxId };
    } finally {
      releaseLock(userId);
    }
  }

  return { validateCWalletId, getCooldownRemaining, setCooldown, getTodayTotalWithdrawal, processWithdrawal, DAILY_LIMIT, MIN_WITHDRAWAL, COOLDOWN_HOURS };
}
