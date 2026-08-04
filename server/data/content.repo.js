/**
 * 来客兄弟 API - 站点内容数据仓储层
 * site_content 表：前台文字/图片内容的唯一数据源（管理后台在线编辑）
 */
const { getOne, getAll, run } = require('./connection');

function parseJson(str) {
  try { return JSON.parse(str); } catch (e) { return null; }
}

function getAllContent() {
  const rows = getAll('SELECT key, value FROM site_content');
  const result = {};
  rows.forEach(r => { result[r.key] = parseJson(r.value); });
  return result;
}

function getContent(key) {
  const row = getOne('SELECT value FROM site_content WHERE key = ?', [key]);
  return row ? parseJson(row.value) : null;
}

function upsert(key, valueJson) {
  run(`INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now','localtime')`,
    [key, valueJson]);
}

module.exports = { getAllContent, getContent, upsert };
