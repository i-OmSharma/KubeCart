const pool = require('./db');

const findByEmail = async (email) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
};

const findById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
};

const create = async (email, passwordHash) => {
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    [email, passwordHash]
  );
  return rows[0];
};

const getUsage = async (userId) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS store_count,
      COALESCE(SUM(storage_gi), 0)::int AS total_storage_gi
    FROM stores
    WHERE user_id = $1 AND status != 'deleted'
  `, [userId]);
  return rows[0];
};

module.exports = { findByEmail, findById, create, getUsage };
