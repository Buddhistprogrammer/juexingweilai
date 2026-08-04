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

function listBookings(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const totalRow = getOne('SELECT COUNT(*) as total FROM bookings');
  const total = totalRow ? totalRow.total : 0;
  const data = getAll('SELECT * FROM bookings ORDER BY created_at DESC LIMIT ? OFFSET ?', [pageSize, offset]);
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
