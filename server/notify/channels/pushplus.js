/**
 * 来客兄弟 API - 通知渠道：PushPlus（推送个人微信）
 * 微信扫码关注「pushplus 推送加」服务号获取 token
 * 设置环境变量：PUSHPLUS_TOKEN=xxx
 * 参考：https://www.pushplus.plus/
 */
const { TYPE_NAMES, CITY_NAMES } = require('../formatter');

const PUSHPLUS_URL = 'https://www.pushplus.plus/send';

// 预约详情（markdown 格式）
function bookingContent(booking) {
  const typeName = TYPE_NAMES[booking.type] || booking.type;
  const cityName = CITY_NAMES[booking.city] || booking.city;
  return [
    `**类型**：${typeName}`,
    `**姓名**：${booking.name}`,
    `**手机**：${booking.phone}`,
    `**城市**：${cityName}`,
    `**公司**：${booking.company || '未填写'}`,
    `**备注**：${booking.note || '无'}`,
    `**时间**：${booking.created_at}`,
  ].join('\n\n');
}

async function sendPushPlus(title, content) {
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) return { skipped: true, reason: 'PUSHPLUS_TOKEN 未配置' };

  try {
    const res = await fetch(PUSHPLUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title: title || '来客兄弟通知',
        content,
        template: 'markdown',
      }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await res.json();
    if (!res.ok || result.code !== 200) {
      throw new Error(`PushPlus 返回异常: ${JSON.stringify(result).slice(0, 200)}`);
    }
    return { success: true, channel: 'pushplus', response: `code ${result.code}` };
  } catch (err) {
    return { success: false, channel: 'pushplus', error: err.message };
  }
}

// 预约通知（与 wecom 渠道同签名，供 notify() 统一调度）
function sendPushPlusBooking(booking) {
  const typeName = TYPE_NAMES[booking.type] || booking.type;
  return sendPushPlus(`📩 新预约-${typeName}`, bookingContent(booking));
}

module.exports = { sendPushPlus, sendPushPlusBooking };
