/**
 * 来客兄弟 API - 通知渠道：企业微信机器人
 * 设置环境变量：WECOM_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
 */
const { TYPE_NAMES, CITY_NAMES } = require('../formatter');

async function sendWecomBot(booking) {
  const url = process.env.WECOM_WEBHOOK;
  if (!url) return { skipped: true, reason: 'WECOM_WEBHOOK 未配置' };

  const typeName = TYPE_NAMES[booking.type];
  const cityName = CITY_NAMES[booking.city] || booking.city;

  const payload = {
    msgtype: 'markdown',
    markdown: {
      content: [
        `## 📩 新预约通知`,
        `> 类型：<font color="info">${typeName}</font>`,
        `> 姓名：${booking.name}`,
        `> 手机：${booking.phone}`,
        `> 城市：${cityName}`,
        `> 公司：${booking.company || '未填写'}`,
        `> 备注：${booking.note || '无'}`,
        `> 时间：${booking.created_at}`,
      ].join('\n'),
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const result = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${result}`);
    return { success: true, channel: 'wecom', response: result };
  } catch (err) {
    return { success: false, channel: 'wecom', error: err.message };
  }
}

module.exports = { sendWecomBot };
