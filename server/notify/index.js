/**
 * 来客兄弟 API - 通知模块统一入口
 * 预约提交后异步通知需求方（不阻塞用户响应）
 *
 * 渠道：
 * 1. 控制台 + 文件日志（始终启用）
 * 2. Webhook（需 WEBHOOK_URL）
 * 3. 企业微信机器人（需 WECOM_WEBHOOK）
 * 4. 邮件（需 SMTP 配置 + nodemailer）
 */
const { logToConsole, logToFile } = require('./channels/console');
const { sendWebhook } = require('./channels/webhook');
const { sendWecomBot, sendWecomTitle } = require('./channels/wecom');
const { sendEmail } = require('./channels/email');
const { sendPushPlus, sendPushPlusBooking } = require('./channels/pushplus');
const { recordNotify } = require('../data/notify.repo');

async function notify(booking) {
  logToConsole(booking);
  logToFile(booking);

  // 同时执行所有通知渠道（互不阻塞）
  const results = await Promise.allSettled([
    sendWebhook(booking),
    sendWecomBot(booking),
    sendEmail(booking),
    sendPushPlusBooking(booking),
  ]);

  // 记录通知日志到数据库
  const channels = ['webhook', 'wecom', 'email', 'pushplus'];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value && !r.value.skipped) {
      const result = r.value;
      recordNotify(booking.id, result.channel, result.success ? 'success' : 'failed',
        result.error || result.response || '');
    }
  });

  const summary = results.map((r, i) => {
    if (r.status === 'rejected') return `${channels[i]}: 异常`;
    if (r.value?.skipped) return null;
    return `${r.value.channel}: ${r.value.success ? '✓' : '✗'}`;
  }).filter(Boolean);

  console.log(`[通知] 渠道结果: ${summary.join(', ') || '无启用渠道'}`);
  return summary;
}

// 通用推送（订单等非预约场景）：企业微信 + PushPlus
async function push(title, content) {
  const results = await Promise.allSettled([
    sendWecomTitle(title, content),
    sendPushPlus(title, content),
  ]);
  const summary = results.map((r, i) => {
    if (r.status === 'rejected') return `${['wecom', 'pushplus'][i]}: 异常`;
    if (r.value?.skipped) return null;
    return `${r.value.channel}: ${r.value.success ? '✓' : '✗'}`;
  }).filter(Boolean);
  console.log(`[推送] ${title}: ${summary.join(', ') || '无启用渠道'}`);
  return summary;
}

module.exports = { notify, push };
