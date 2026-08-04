/**
 * 来客兄弟 API - 数据连接层 (sql.js SQLite 纯 JS 实现)
 * 负责：数据库初始化、建表、迁移、持久化、基础查询方法
 * 后续迁移 MySQL 时仅需替换本层，Repository/Service/Route 零改动
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'laikedixiong.db');
let db = null;

// ==========================================
// 初始化
// ==========================================
async function initDB() {
  const SQL = await initSqlJs();

  // 如果已有数据库文件，加载它
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  createTables();
  migrate();
  seedContent();
  saveDB();
  console.log('[DB] SQLite 数据库已就绪');
  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      type          TEXT    NOT NULL,
      name          TEXT    NOT NULL,
      phone         TEXT    NOT NULL,
      city          TEXT    NOT NULL,
      company       TEXT,
      note          TEXT,
      extra         TEXT,
      source        TEXT    DEFAULT 'web',
      utm_city      TEXT,
      status        TEXT    DEFAULT 'pending',
      notified_at   TEXT,
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      updated_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      phone         TEXT    NOT NULL,
      city          TEXT,
      source        TEXT    DEFAULT 'cta',
      status        TEXT    DEFAULT 'new',
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_tests (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      score         INTEGER NOT NULL,
      level         TEXT    NOT NULL,
      city          TEXT,
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notify_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id    INTEGER,
      channel       TEXT    NOT NULL,
      status        TEXT    NOT NULL,
      response      TEXT,
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS site_content (
      key         TEXT PRIMARY KEY,
      value       TEXT    NOT NULL,
      updated_at  TEXT    DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no       TEXT    UNIQUE NOT NULL,
      product        TEXT    NOT NULL,
      title          TEXT    NOT NULL,
      amount         INTEGER NOT NULL,
      channel        TEXT    DEFAULT 'manual',
      status         TEXT    DEFAULT 'pending',
      booking_id     INTEGER,
      transaction_id TEXT,
      qr_code_url    TEXT,
      created_at     TEXT    DEFAULT (datetime('now','localtime')),
      paid_at        TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prompt_games (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      level_reached INTEGER NOT NULL,
      attempts      INTEGER DEFAULT 0,
      city          TEXT,
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `);
}

// ==========================================
// 站点内容默认值 seed（缺失的 key 自动补种）
// ==========================================
function seedContent() {
  const defaults = require('../content.defaults');
  let seeded = 0;
  for (const [key, val] of Object.entries(defaults)) {
    const row = getOne('SELECT 1 FROM site_content WHERE key = ?', [key]);
    if (!row) {
      db.run('INSERT INTO site_content (key, value) VALUES (?, ?)', [key, JSON.stringify(val)]);
      seeded++;
    }
  }
  if (seeded > 0) {
    saveDB();
    console.log(`[DB] site_content 已初始化 ${seeded} 个内容区块默认值`);
  }
}

// ==========================================
// 迁移（存量数据库平滑升级）
// ==========================================
function migrate() {
  ensureColumn('bookings', 'extra', 'TEXT');
}

// 检测表是否存在某列，不存在则 ALTER TABLE 追加（sql.js 无原生迁移机制）
function ensureColumn(table, column, definition) {
  const res = db.exec(`PRAGMA table_info(${table})`);
  const cols = res.length ? res[0].values.map(row => row[1]) : [];
  if (!cols.includes(column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[DB] 迁移: ${table} 表新增列 ${column} (${definition})`);
  }
}

// 持久化到文件
function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// 定期自动保存（每 30 秒）
setInterval(() => {
  if (db) saveDB();
}, 30000);

// ==========================================
// 基础查询方法
// ==========================================
function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

module.exports = { initDB, saveDB, getOne, getAll, run };
