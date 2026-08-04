/**
 * 来客兄弟 API - 预约业务层
 * 承载预约生命周期管理：创建（含 extra JSON 序列化 + 异步通知）、查询、状态流转
 */
const bookingRepo = require('../data/booking.repo');
const { notify } = require('../notify');

function createBooking(data) {
  // 差异化模块字段（PRD §02.2）序列化进 extra JSON 列
  const extra = (data.extra && typeof data.extra === 'object' && !Array.isArray(data.extra))
    ? JSON.stringify(data.extra) : null;

  const booking = bookingRepo.createBooking({ ...data, extra });

  // 异步通知需求方（不阻塞响应）
  setImmediate(() => {
    notify(booking).catch(e => console.error('[通知异常]', e.message));
  });

  return booking;
}

function listBookings(page, pageSize, filters) {
  return bookingRepo.listBookings(page, pageSize, filters);
}

function getBookingById(id) {
  return bookingRepo.getBookingById(id);
}

function updateStatus(id, status) {
  bookingRepo.updateStatus(id, status);
}

function getStats() {
  return bookingRepo.getStats();
}

module.exports = { createBooking, listBookings, getBookingById, updateStatus, getStats };
