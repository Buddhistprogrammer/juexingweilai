/**
 * 来客兄弟 API - 通知渠道：邮件
 * 设置环境变量：
 *   SMTP_HOST=smtp.example.com
 *   SMTP_PORT=465
 *   SMTP_USER=xxx@example.com
 *   SMTP_PASS=xxx
 *   NOTIFY_EMAIL=需求方邮箱
 * 需先安装 nodemailer：npm i nodemailer
 */
const { TYPE_NAMES, formatBookingMessage } = require('../formatter');

async function sendEmail(booking) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = process.env;
  if (!SMTP_HOST || !NOTIFY_EMAIL) {
    return { skipped: true, reason: 'SMTP 邮件配置不完整' };
  }

  const nodemailer = (() => { try { return require('nodemailer'); } catch { return null; } })();
  if (!nodemailer) return { skipped: true, reason: 'nodemailer 未安装 (npm i nodemailer)' };

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT) || 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: SMTP_USER,
      to: NOTIFY_EMAIL,
      subject: `[来客兄弟] 新预约 - ${TYPE_NAMES[booking.type]}`,
      text: formatBookingMessage(booking),
    });
    return { success: true, channel: 'email' };
  } catch (err) {
    return { success: false, channel: 'email', error: err.message };
  }
}

module.exports = { sendEmail };
