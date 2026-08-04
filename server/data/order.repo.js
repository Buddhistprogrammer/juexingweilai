/**
 * 来客兄弟 API - 订单数据仓储层
 * orders 表 CRUD（支付订单：pending → paid）
 */
const { getOne, getAll, run } = require('./connection');

function createOrder(data) {
  const sql = `INSERT INTO orders (order_no, product, title, amount, channel, status, booking_id, transaction_id, qr_code_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  run(sql, [data.orderNo, data.product, data.title, data.amount,
    data.channel || 'manual', 'pending', data.bookingId || null,
    data.transactionId || null, data.qrCodeUrl || null]);
  return getOne('SELECT * FROM orders WHERE order_no = ?', [data.orderNo]);
}

function getByOrderNo(orderNo) {
  return getOne('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
}

function getById(id) {
  return getOne('SELECT * FROM orders WHERE id = ?', [id]);
}

function listOrders(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const totalRow = getOne('SELECT COUNT(*) as total FROM orders');
  const total = totalRow ? totalRow.total : 0;
  const data = getAll('SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?', [pageSize, offset]);
  return { total, page, pageSize, data };
}

// 标记已支付（人工确认 / 微信回调通用）
function markPaid(id, transactionId) {
  run(`UPDATE orders SET status = 'paid', paid_at = datetime('now','localtime'),
        transaction_id = COALESCE(?, transaction_id) WHERE id = ?`,
    [transactionId || null, id]);
}

module.exports = { createOrder, getByOrderNo, getById, listOrders, markPaid };
