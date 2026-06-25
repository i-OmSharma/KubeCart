const db = require('./db');

const findByEmail = (email) =>
  db.prepare('SELECT * FROM users WHERE email = ?').get(email);

const findById = (id) =>
  db.prepare('SELECT * FROM users WHERE id = ?').get(id);

const create = (email, passwordHash) =>
  db.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)'
  ).run(email, passwordHash);

const getUsage = (userId) =>
  db.prepare(`
    SELECT
      COUNT(*) AS store_count,
      COALESCE(SUM(storage_gi), 0) AS total_storage_gi
    FROM stores
    WHERE user_id = ? AND status != 'deleted'
  `).get(userId);

module.exports = { findByEmail, findById, create, getUsage };
