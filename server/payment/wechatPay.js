/**
 * 来客兄弟 API - 支付渠道：微信支付 v3 Native 扫码支付
 * ⚠️ 商户号申请到位后，配置以下环境变量即自动启用本渠道：
 *   WXPAY_MCHID             商户号
 *   WXPAY_SERIAL            商户 API 证书序列号
 *   WXPAY_APIV3KEY          APIv3 密钥（32 位）
 *   WXPAY_PRIVATE_KEY_PATH  商户私钥文件路径（apiclient_key.pem）
 *   WXPAY_NOTIFY_URL        回调地址（如 https://lkxdai.com/api/pay/notify）
 *
 * 参考：https://pay.weixin.qq.com/docs/merchant/apis/native-payment/direct-jsons/native-prepay.html
 */
const crypto = require('crypto');
const fs = require('fs');

function isConfigured() {
  return !!process.env.WXPAY_MCHID && !!process.env.WXPAY_SERIAL &&
    !!process.env.WXPAY_APIV3KEY && !!process.env.WXPAY_PRIVATE_KEY_PATH;
}

function notConfiguredError() {
  return new Error('微信支付未配置（WXPAY_MCHID 等环境变量缺失），当前使用收款码模式');
}

// ==========================================
// v3 请求签名：WECHATPAY2-SHA256-RSA2048
// ==========================================
function signRequest(method, urlPath, body, timestamp, nonce) {
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const privateKey = fs.readFileSync(process.env.WXPAY_PRIVATE_KEY_PATH);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(message, 'utf8');
  const signature = signer.sign(privateKey, 'base64');
  const mchid = process.env.WXPAY_MCHID;
  const serial = process.env.WXPAY_SERIAL;
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serial}"`;
}

// ==========================================
// 统一下单（Native）：POST /v3/pay/transactions/native
// 返回 code_url（支付二维码内容，前端生成二维码图片展示）
// ==========================================
async function createNativeOrder({ orderNo, amount, title, notifyUrl }) {
  if (!isConfigured()) throw notConfiguredError();

  const urlPath = '/v3/pay/transactions/native';
  const body = JSON.stringify({
    appid: process.env.WXPAY_APPID,
    mchid: process.env.WXPAY_MCHID,
    description: title,
    out_trade_no: orderNo,
    notify_url: notifyUrl || process.env.WXPAY_NOTIFY_URL,
    amount: { total: amount, currency: 'CNY' },
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const res = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: signRequest('POST', urlPath, body, timestamp, nonce),
    },
    body,
    signal: AbortSignal.timeout(10000),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(`微信支付下单失败 HTTP ${res.status}: ${JSON.stringify(result)}`);
  }
  return { channel: 'wechat', codeUrl: result.code_url };
}

// ==========================================
// 回调验签（平台证书公钥验签）
// 注意：生产环境应使用微信平台证书（可配置 WXPAY_PLATFORM_CERT_PATH），
// 或按官方文档实现平台证书下载与更新逻辑
// ==========================================
function verifyNotify({ body, signature, timestamp, nonce }) {
  const certPath = process.env.WXPAY_PLATFORM_CERT_PATH;
  if (!certPath) {
    throw new Error('微信支付回调验签未配置（WXPAY_PLATFORM_CERT_PATH）');
  }
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const cert = fs.readFileSync(certPath);
  const pubKey = crypto.X509Certificate.fromPEM?.(cert)?.publicKey || cert;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(message, 'utf8');
  return verifier.verify(pubKey, signature, 'base64');
}

// ==========================================
// 回调报文解密（AES-256-GCM，key=APIv3密钥）
// 返回解密后的支付结果对象
// ==========================================
function decryptNotifyResource(resource) {
  const key = process.env.WXPAY_APIV3KEY;
  if (!key) throw notConfiguredError();
  const { ciphertext, nonce, associated_data: aad } = resource;
  const buf = Buffer.from(ciphertext, 'base64');
  const tag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
  return JSON.parse(decipher.update(data, null, 'utf8') + decipher.final('utf8'));
}

module.exports = { isConfigured, createNativeOrder, verifyNotify, decryptNotifyResource };
