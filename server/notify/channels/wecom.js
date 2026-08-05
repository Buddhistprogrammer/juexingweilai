/**
 * 来客兄弟 API - 通知渠道：企业微信机器人
 * 设置环境变量：WECOM_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
 */
const { TYPE_NAMES, CITY_NAMES } = require('../formatter');

// 通用企业微信 markdown 消息（预约/订单通用）
async function sendWecomMarkdown(markdownContent) {
  const url = process.env.WECOM_WEBHOOK;
  if (!url) return { skipped: true, reason: 'WECOM_WEBHOOK 未配置' };

  const payload = {
    msgtype: 'markdown',
    markdown: { content: markdownContent },
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

// 标题 + 正文（通用推送场景：订单等）
function sendWecomTitle(title, content) {
  return sendWecomMarkdown(`## ${title}\n${content}`);
}

// 预约通知（保持原签名，供 notify() 统一调度）
function sendWecomBot(booking) {
  const typeName = TYPE_NAMES[booking.type];
  const cityName = CITY_NAMES[booking.city] || booking.city;
  return sendWecomMarkdown([
    `## 📩 新预约通知`,
    `> 类型：<font color="info">${typeName}</font>`,
    `> 姓名：${booking.name}`,
    `> 手机：${booking.phone}`,
    `> 城市：${cityName}`,
    `> 公司：${booking.company || '未填写'}`,
    `> 备注：${booking.note || '无'}`,
    `> 时间：${booking.created_at}`,
  ].join('\n'));
}

module.exports = { sendWecomBot, sendWecomTitle };
