/**
 * 来客兄弟 API - 预约数据仓储层
 * bookings 表 CRUD（唯一访问入口，其他模块不直接写 SQL）
 */
const { getOne, getAll, run } = require('./connection');

function createBooking(data) {
  const sql = `INSERT INTO bookings (type, name, phone, city, company, note, extra, source, utm_city, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [data.type, data.name, data.phone, data.city || '', data.company || '',
     data.note || '', data.extra || null, data.source || 'web', data.utm_city || '', 'pending'];

  run(sql, params);

  // 获取新记录完整信息
  const maxRow = getOne('SELECT MAX(id) as id FROM bookings');
  if (!maxRow || !maxRow.id) throw new Error('插入预约后无法获取ID');
  const result = getOne('SELECT * FROM bookings WHERE id = ?', [maxRow.id]);
  if (!result) throw new Error('插入预约后无法读取记录');
  return result;
}

function getBookingById(id) {
  return getOne('SELECT * FROM bookings WHERE id = ?', [id]);
}

// 筛选：{ type, status } 可选；LEFT JOIN orders 关联课程报名支付状态
function listBookings(page = 1, pageSize = 20, filters = {}) {
  const offset = (page - 1) * pageSize;
  const where = [];
  const params = [];
  if (filters.type) { where.push('b.type = ?'); params.push(filters.type); }
  if (filters.status) { where.push('b.status = ?'); params.push(filters.status); }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

  const totalRow = getOne(`SELECT COUNT(*) as total FROM bookings b${whereSql}`, params);
  const total = totalRow ? totalRow.total : 0;
  const data = getAll(
    `SELECT b.*, o.status AS order_status, o.order_no AS order_no
     FROM bookings b LEFT JOIN orders o ON o.booking_id = b.id
     ${whereSql} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]);
  return { total, page, pageSize, data };
}

function getStats() {
  const todayRow = getOne("SELECT COUNT(*) as today FROM bookings WHERE date(created_at) = date('now','localtime')");
  const today = todayRow ? todayRow.today : 0;
  const byType = getAll('SELECT type, COUNT(*) as count FROM bookings GROUP BY type');
  return { today, byType };
}

function updateStatus(id, status) {
  run("UPDATE bookings SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?", [status, id]);
}

module.exports = { createBooking, getBookingById, listBookings, getStats, updateStatus };
