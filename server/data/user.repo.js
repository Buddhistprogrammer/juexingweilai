/**
 * 用户数据仓库
 */
const { getOne, run } = require('./connection');

function findByPhone(phone) {
  return getOne('SELECT * FROM users WHERE phone = ?', [phone]);
}

function findById(id) {
  return getOne('SELECT id, phone, name, created_at FROM users WHERE id = ?', [id]);
}

function create({ phone, name, passwordHash }) {
  run(
    'INSERT INTO users (phone, name, password_hash) VALUES (?, ?, ?)',
    [phone, name, passwordHash]
  );
  return findByPhone(phone);
}

module.exports = { findByPhone, findById, create };
