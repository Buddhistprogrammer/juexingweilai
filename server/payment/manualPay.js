/**
 * 来客兄弟 API - 支付渠道：收款码模式（当前默认）
 * 商户号未到位时使用：展示收款码图片，用户付款后由管理后台人工确认到账
 * 收款码图片：上传到 /uploads/pay-qrcode.png，或通过 PAY_QRCODE_IMG 指定
 */
function createManualOrder() {
  const qrCodeUrl = process.env.PAY_QRCODE_IMG || '/uploads/pay-qrcode.png';
  return { channel: 'manual', qrCodeUrl };
}

module.exports = { createManualOrder };
