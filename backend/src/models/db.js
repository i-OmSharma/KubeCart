const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../data/factory.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    max_stores INTEGER DEFAULT 3,
    max_storage_gi INTEGER DEFAULT 12,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    namespace TEXT NOT NULL,
    status TEXT DEFAULT 'initialized',
    store_name TEXT,
    admin_password TEXT,
    products TEXT,
    storage_gi INTEGER DEFAULT 2,
    url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

module.exports = db;
