/**
 * 来客兄弟 API - 通知渠道：Webhook
 * 设置环境变量：WEBHOOK_URL=https://your-webhook.com/api/notify
 */
const { TYPE_NAMES, CITY_NAMES } = require('../formatter');

async function sendWebhook(booking) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return { skipped: true, reason: 'WEBHOOK_URL 未配置' };

  const payload = {
    event: 'new_booking',
    data: {
      id: booking.id,
      type: booking.type,
      typeName: TYPE_NAMES[booking.type],
      name: booking.name,
      phone: booking.phone,
      city: booking.city,
      cityName: CITY_NAMES[booking.city],
      company: booking.company,
      note: booking.note,
      extra: booking.extra,
      createdAt: booking.created_at,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return { success: true, channel: 'webhook', response: `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, channel: 'webhook', error: err.message };
  }
}

module.exports = { sendWebhook };
