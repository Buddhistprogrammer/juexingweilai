/**
 * 来客兄弟 API - 支付网关统一入口
 * 渠道选择：微信支付配置齐全 → wechat（Native 扫码），否则 → manual（收款码人工确认）
 * 商户号到位后只需在 .env 配置 WXPAY_* 即自动切换，业务代码零改动
 */
const wechatPay = require('./wechatPay');
const manualPay = require('./manualPay');

function createOrder(order) {
  if (wechatPay.isConfigured()) {
    return wechatPay.createNativeOrder(order);
  }
  return Promise.resolve(manualPay.createManualOrder());
}

module.exports = { createOrder, wechatPay };
