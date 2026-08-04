/**
 * 来客兄弟 API - 通知日志数据仓储层
 */
const { run } = require('./connection');

function recordNotify(id, channel, status, response) {
  run("UPDATE bookings SET notified_at = datetime('now','localtime') WHERE id = ?", [id]);
  run("INSERT INTO notify_logs (booking_id, channel, status, response) VALUES (?, ?, ?, ?)",
    [id, channel, status, response || '']);
}

module.exports = { recordNotify };
