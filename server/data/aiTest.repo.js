/**
 * 来客兄弟 API - 含AI量检测数据仓储层
 */
const { run } = require('./connection');

function saveAiTest(data) {
  run("INSERT INTO ai_tests (score, level, city) VALUES (?, ?, ?)",
    [data.score, data.level, data.city || '']);
}

module.exports = { saveAiTest };
