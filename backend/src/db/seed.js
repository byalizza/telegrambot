export async function seedDatabase(db) {
  const result = await db.execute('SELECT COUNT(*) as c FROM animals');
  const count = result.rows[0]?.c || 0;
  if (count > 0) return;

  const animals = [
    ['Tavuk', 1, 0, 41.67, 1250, 'Ücretsiz başlangıç hayvanı', '🐔'],
    ['Tavşan', 2, 20000, 43.33, 1300, 'Giriş seviyesi yatırım', '🐇'],
    ['Koyun', 3, 50000, 113.33, 3400, 'Düşük bütçeli yatırım', '🐑'],
    ['Keçi', 4, 100000, 233.33, 7000, 'Orta seviye verimli', '🐐'],
    ['İnek', 5, 250000, 616.67, 18500, 'Yüksek verimli', '🐄'],
    ['At', 6, 500000, 1300.00, 39000, 'Profesyonel oyuncu', '🐎'],
    ['Altın Boğa', 7, 1000000, 2833.33, 85000, 'Maksimum üretim', '🐂'],
  ];

  const tasks = [
    ['Telegram Kanalına Katıl', 'Resmi kanala katıl', 100, 'JOIN_TELEGRAM_CHANNEL', 'https://t.me/farmmine', 1],
    ['Günlük Giriş', 'Her gün giriş yap', 25, 'DAILY_LOGIN', '', 2],
    ['Arkadaşını Davet Et', 'Bir arkadaş davet et', 50, 'INVITE_FRIENDS', '', 3],
    ['İlk Hayvanı Satın Al', 'Çiftliğini büyüt', 150, 'DAILY_LOGIN', '', 4],
  ];

  for (const a of animals) {
    await db.execute({ sql: 'INSERT INTO animals (name, tier, purchase_cost_gold, daily_production_gold, monthly_production_gold, description, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)', args: a });
  }
  for (const t of tasks) {
    await db.execute({ sql: 'INSERT INTO tasks (title, description, reward_gold, task_type, task_data, order_index) VALUES (?, ?, ?, ?, ?, ?)', args: t });
  }
  console.log('[DB] Seed data added');
}
