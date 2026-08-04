/**
 * 来客兄弟 API - 通知渠道：控制台 + 文件日志（始终启用）
 */
const fs = require('fs');
const path = require('path');
const { formatBookingMessage } = require('../formatter');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function logToConsole(booking) {
  console.log('\n' + formatBookingMessage(booking) + '\n');
}

function logToFile(booking) {
  const date = new Date().toISOString().slice(0, 10);
  const logFile = path.join(LOG_DIR, `bookings-${date}.log`);
  const message = '='.repeat(50) + '\n' + formatBookingMessage(booking) + '\n';
  fs.appendFileSync(logFile, message, 'utf-8');
  console.log(`[通知] 已写入日志: ${logFile}`);
}

module.exports = { logToConsole, logToFile };
