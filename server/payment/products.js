/**
 * 来客兄弟 API - 可支付商品配置
 * 金额单位：分（微信支付要求整数分）
 * 前台价格展示来自 CMS 内容（site_content.pricing），本配置为订单金额的唯一机器来源，两处需保持一致
 */
module.exports = {
  course: {
    title: 'AI普及线上课',
    amount: 29900, // ¥299.00
  },
  // 后续新增可支付商品在此追加，如：
  // tour: { title: 'AI游学', amount: 19900 },
};
