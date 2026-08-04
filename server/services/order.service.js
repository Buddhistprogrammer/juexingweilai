/**
 * 来客兄弟 API - 订单业务层
 * 课程报名支付：创建预约 + 创建订单 + 调支付网关 + 状态流转 + 订单日志
 */
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const orderRepo = require('../data/order.repo');
const bookingService = require('./booking.service');
const products = require('../payment/products');
const payment = require('../payment');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// 订单日志（console + 文件，与预约通知同风格；企微/邮件渠道可后续接入）
function logOrder(message) {
  const date = new Date().toISOString().slice(0, 10);
  const logFile = path.join(LOG_DIR, `orders-${date}.log`);
  const line = `[${new Date().toLocaleString('zh-CN')}] ${message}\n`;
  console.log('[订单]', message);
  fs.appendFileSync(logFile, line, 'utf-8');
}

function genOrderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WX${ymd}${rand}`;
}

// 创建课程报名订单：预约 + 订单 + 支付信息
async function createOrder({ product, name, phone, city, source }) {
  const p = products[product];
  if (!p) throw Object.assign(new Error('商品不存在'), { status: 400 });

  // 1. 创建预约（course 类型，状态 pending，由运营联系发课）
  const booking = bookingService.createBooking({
    type: 'course', name, phone, city: city || '', source: source || 'pay',
  });

  // 2. 生成订单号，调支付网关获取支付信息（微信配置齐全→扫码；否则→收款码）
  const orderNo = genOrderNo();
  const payInfo = await payment.createOrder({
    orderNo, amount: p.amount, title: p.title,
  });

  // 微信渠道返回 code_url（二维码内容），生成二维码图片便于前端直接展示
  let qrCodeUrl = payInfo.qrCodeUrl || null;
  if (payInfo.codeUrl) {
    qrCodeUrl = await QRCode.toDataURL(payInfo.codeUrl, { width: 240, margin: 1 });
  }

  // 3. 入库
  const order = orderRepo.createOrder({
    orderNo, product, title: p.title, amount: p.amount,
    channel: payInfo.channel, bookingId: booking.id, qrCodeUrl,
  });

  logOrder(`新订单 ${orderNo} | ${p.title} | ¥${(p.amount / 100).toFixed(2)} | ${name} ${phone} | 渠道=${payInfo.channel} | 预约#${booking.id}`);
  return { ...order, channel: payInfo.channel, qrCodeUrl };
}

function getStatus(orderNo) {
  const order = orderRepo.getByOrderNo(orderNo);
  if (!order) return null;
  return {
    orderNo: order.order_no, title: order.title, amount: order.amount,
    channel: order.channel, status: order.status, paid_at: order.paid_at,
  };
}

function list(page, pageSize) {
  return orderRepo.listOrders(page, pageSize);
}

// 人工确认收款（收款码模式）
function confirmPaid(id, transactionId) {
  const order = orderRepo.getById(id);
  if (!order) return null;
  if (order.status === 'paid') return order;
  orderRepo.markPaid(id, transactionId);
  logOrder(`订单已确认收款 #${id} ${order.order_no} | ${order.title} | ¥${(order.amount / 100).toFixed(2)}`);
  return orderRepo.getById(id);
}

// 微信回调确认支付
function markPaidByOrderNo(orderNo, transactionId) {
  const order = orderRepo.getByOrderNo(orderNo);
  if (!order) return null;
  orderRepo.markPaid(order.id, transactionId);
  logOrder(`微信支付成功 ${orderNo} | ${order.title} | ¥${(order.amount / 100).toFixed(2)} | 交易号 ${transactionId}`);
  return orderRepo.getById(order.id);
}

module.exports = { createOrder, getStatus, list, confirmPaid, markPaidByOrderNo };
