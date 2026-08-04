/**
 * 来客兄弟 - 城市配置（P4 城市落地页）
 * 前端通过 GET /api/city-config?city=xxx 获取
 * salon.dates 为空数组表示"每月1-2场，以社群通知为准"，由运营填充具体场次
 */
module.exports = {
  beijing: {
    name: '北京',
    heroTitle: '北京实体门店，要么AI化，要么被AI化',
    salon: { dates: [], venue: '北京市（具体地点以学联社群通知为准）', maxSeats: 50 },
    communityQR: '',
  },
  shanghai: {
    name: '上海',
    heroTitle: '上海实体门店，要么AI化，要么被AI化',
    salon: { dates: [], venue: '上海市（具体地点以学联社群通知为准）', maxSeats: 50 },
    communityQR: '',
  },
  shenzhen: {
    name: '深圳',
    heroTitle: '深圳实体门店，要么AI化，要么被AI化',
    salon: { dates: [], venue: '深圳市（具体地点以学联社群通知为准）', maxSeats: 50 },
    communityQR: '',
  },
  guangzhou: {
    name: '广州',
    heroTitle: '广州实体门店，要么AI化，要么被AI化',
    salon: { dates: [], venue: '广州市（具体地点以学联社群通知为准）', maxSeats: 50 },
    communityQR: '',
  },
  hangzhou: {
    name: '杭州',
    heroTitle: '杭州实体门店，要么AI化，要么被AI化',
    salon: { dates: [], venue: '杭州市（具体地点以学联社群通知为准）', maxSeats: 50 },
    communityQR: '',
  },
  chengdu: {
    name: '成都',
    heroTitle: '成都实体门店，要么AI化，要么被AI化',
    salon: { dates: [], venue: '成都市（具体地点以学联社群通知为准）', maxSeats: 50 },
    communityQR: '',
  },
  wuhan: {
    name: '武汉',
    heroTitle: '武汉实体门店，要么AI化，要么被AI化',
    salon: { dates: [], venue: '武汉市（具体地点以学联社群通知为准）', maxSeats: 50 },
    communityQR: '',
  },
  nanjing: {
    name: '南京',
    heroTitle: '南京实体门店，要么AI化，要么被AI化',
    salon: { dates: [], venue: '南京市（具体地点以学联社群通知为准）', maxSeats: 50 },
    communityQR: '',
  },
};
