/**
 * 来客兄弟 API - 通知消息格式化
 */
const TYPE_NAMES = {
  community:  '申请加入AI学联社社群',
  salon:      '预约参加AI沙龙',
  tour:       '报名参加AI游学',
  visit:      '预约参观未来城展厅',
  course:     '报名AI普及线上课',
  enterprise: '申请公益AI入企培训',
};

const CITY_NAMES = {
  beijing: '北京', shanghai: '上海', shenzhen: '深圳',
  guangzhou: '广州', hangzhou: '杭州', chengdu: '成都',
  wuhan: '武汉', nanjing: '南京',
};

function formatBookingMessage(booking) {
  const typeName = TYPE_NAMES[booking.type] || booking.type;
  const cityName = CITY_NAMES[booking.city] || booking.city;
  let extraText = '';
  if (booking.extra) {
    try {
      const extra = typeof booking.extra === 'string' ? JSON.parse(booking.extra) : booking.extra;
      extraText = '\n' + Object.entries(extra).map(([k, v]) =>
        `  ${k}：${Array.isArray(v) ? v.join('/') : v}`
      ).join('\n');
    } catch (e) { /* 忽略无法解析的 extra */ }
  }
  return [
    `📩 新预约通知`,
    `━━━━━━━━━━━━━━━━`,
    `类型：${typeName}`,
    `姓名：${booking.name}`,
    `手机：${booking.phone}`,
    `城市：${cityName}`,
    `公司：${booking.company || '未填写'}`,
    `备注：${booking.note || '无'}`,
    `来源：${booking.source || 'web'}`,
    `时间：${booking.created_at}`,
    extraText,
    `━━━━━━━━━━━━━━━━`,
  ].filter((line, i) => line !== undefined && line !== null).join('\n');
}

module.exports = { TYPE_NAMES, CITY_NAMES, formatBookingMessage };
