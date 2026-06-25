const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Warm the pool on startup so first user request isn't slow (Neon cold start)
pool.query('SELECT 1').catch(() => {});

pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    max_stores INTEGER DEFAULT 3,
    max_storage_gi INTEGER DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    namespace TEXT NOT NULL,
    status TEXT DEFAULT 'initialized',
    store_name TEXT,
    admin_password TEXT,
    products TEXT,
    storage_gi INTEGER DEFAULT 2,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`).then(() => console.log('DB schema ready'))
  .catch(err => console.error('DB schema error:', err.message));

module.exports = pool;
