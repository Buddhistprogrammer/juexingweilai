/**
 * 来客兄弟 API - 站点内容业务层
 * 前台文字/图片内容的管理（CMS）：读取全部/单区块、更新、恢复默认
 */
const contentRepo = require('../data/content.repo');
const defaults = require('../content.defaults');

function getAll() {
  return contentRepo.getAllContent();
}

function get(key) {
  return contentRepo.getContent(key);
}

function update(key, value) {
  contentRepo.upsert(key, JSON.stringify(value));
}

// 恢复默认：DB 中重新写入默认值（缺失的 key 也会补上）
function reset(key) {
  if (!defaults[key]) return false;
  contentRepo.upsert(key, JSON.stringify(defaults[key]));
  return true;
}

function getDefaults() {
  return defaults;
}

module.exports = { getAll, get, update, reset, getDefaults };
