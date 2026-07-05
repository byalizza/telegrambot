CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT DEFAULT '',
    telegram_id INTEGER UNIQUE,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    gold_balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_withdrawn INTEGER DEFAULT 0,
    last_claim_time INTEGER DEFAULT 0,
    cwallet_id TEXT DEFAULT '',
    referred_by INTEGER REFERENCES users(id),
    created_at INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);

CREATE TABLE IF NOT EXISTS animals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tier INTEGER NOT NULL,
    purchase_cost_gold INTEGER NOT NULL,
    daily_production_gold REAL NOT NULL,
    monthly_production_gold REAL NOT NULL,
    description TEXT DEFAULT '',
    emoji TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_animals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    animal_id INTEGER NOT NULL REFERENCES animals(id),
    quantity INTEGER DEFAULT 0,
    is_free_claimed INTEGER DEFAULT 0,
    UNIQUE(user_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_user_animals_user ON user_animals(user_id);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    amount_gold INTEGER NOT NULL,
    amount_usd REAL DEFAULT 0,
    description TEXT DEFAULT '',
    reference_id TEXT DEFAULT '',
    status TEXT DEFAULT 'PENDING',
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    reward_gold INTEGER NOT NULL,
    task_type TEXT NOT NULL,
    task_data TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    is_completed INTEGER DEFAULT 0,
    completed_at INTEGER DEFAULT 0,
    UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_user_id INTEGER NOT NULL REFERENCES users(id),
    referred_user_id INTEGER NOT NULL REFERENCES users(id),
    bonus_earned INTEGER DEFAULT 0,
    commission_rate REAL DEFAULT 0.10,
    created_at INTEGER NOT NULL,
    UNIQUE(referred_user_id)
);

CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    UNIQUE(sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    friend_id INTEGER NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, friend_id)
);
