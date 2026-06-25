const db = require('./db');

const findById = (id) =>
  db.prepare('SELECT * FROM stores WHERE id = ?').get(id);

const findByUser = (userId) =>
  db.prepare("SELECT * FROM stores WHERE user_id = ? AND status != 'deleted' ORDER BY created_at DESC").all(userId);

const create = ({ id, userId, namespace, storeName, adminPassword, products, storageGi, url }) =>
  db.prepare(`
    INSERT INTO stores (id, user_id, namespace, store_name, admin_password, products, storage_gi, url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'initialized')
  `).run(id, userId, namespace, storeName, adminPassword, products, storageGi, url);

const updateStatus = (id, status) =>
  db.prepare('UPDATE stores SET status = ? WHERE id = ?').run(status, id);

const remove = (id) =>
  db.prepare("UPDATE stores SET status = 'deleted' WHERE id = ?").run(id);

module.exports = { findById, findByUser, create, updateStatus, remove };
