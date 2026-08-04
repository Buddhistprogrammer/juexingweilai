/**
 * 来客兄弟 API - 提示词攻防游戏成绩仓储层
 */
const { run } = require('./connection');

function saveResult(data) {
  run('INSERT INTO prompt_games (level_reached, attempts, city) VALUES (?, ?, ?)',
    [data.levelReached, data.attempts || 0, data.city || '']);
}

module.exports = { saveResult };
