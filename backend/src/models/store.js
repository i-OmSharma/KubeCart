const pool = require('./db');

const findById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM stores WHERE id = $1', [id]);
  return rows[0] || null;
};

const findByUser = async (userId) => {
  const { rows } = await pool.query(
    "SELECT * FROM stores WHERE user_id = $1 AND status != 'deleted' ORDER BY created_at DESC",
    [userId]
  );
  return rows;
};

const create = async ({ id, userId, namespace, storeName, adminPassword, products, storageGi, url }) => {
  await pool.query(`
    INSERT INTO stores (id, user_id, namespace, store_name, admin_password, products, storage_gi, url, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'initialized')
  `, [id, userId, namespace, storeName, adminPassword, products, storageGi, url]);
};

const updateStatus = async (id, status) => {
  await pool.query('UPDATE stores SET status = $1 WHERE id = $2', [status, id]);
};

const remove = async (id) => {
  await pool.query("UPDATE stores SET status = 'deleted' WHERE id = $1", [id]);
};

module.exports = { findById, findByUser, create, updateStatus, remove };
