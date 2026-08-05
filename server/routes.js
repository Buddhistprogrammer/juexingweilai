/**
 * 来客兄弟 API - 路由薄层
 * 职责：参数校验 → 委托给 Service 层，不直接访问数据库
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bookingService = require('./services/booking.service');
const contactService = require('./services/contact.service');
const aiTestService = require('./services/aiTest.service');
const contentService = require('./services/content.service');
const orderService = require('./services/order.service');
const { wechatPay } = require('./payment');
const gameLevels = require('./promptgame/levels');
const { chat, detectLeak, isConfigured: llmConfigured, isMock: llmMock } = require('./promptgame/llm');
const promptGameRepo = require('./data/promptGame.repo');
const cityConfig = require('./city.config');

// 提示词攻防游戏限流：每 IP 每分钟 5 次（内存实现，防刷 LLM API 烧钱）
const rateMap = new Map(); // ip -> [timestamps]
function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const window = 60 * 1000;
  const times = (rateMap.get(ip) || []).filter(t => now - t < window);
  if (times.length >= 5) {
    return res.status(429).json({ success: false, error: '操作太频繁，请稍后再试' });
  }
  times.push(now);
  rateMap.set(ip, times);
  // 定时清理，防止内存膨胀
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) {
      if (v.every(t => now - t >= window)) rateMap.delete(k);
    }
  }
  next();
}

const validTypes = ['community', 'salon', 'tour', 'visit', 'course', 'enterprise'];
const validStatuses = ['pending', 'contacted', 'confirmed', 'completed', 'cancelled'];
const PHONE_RE = /^1[3-9]\d{9}$/;

// ==========================================
// 图片上传（multer，5MB 上限，白名单格式）
// ==========================================
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 单文件 ≤ 20MB（手机原图/高清图均可用）
  fileFilter: (req, file, cb) => {
    const ok = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('仅支持 png/jpg/jpeg/gif/webp 图片格式'), ok);
  },
});

// 管理端鉴权：Header Authorization 或 Query ?token=
function requireAuth(req, res) {
  const token = req.headers.authorization || req.query.token;
  if (!token || token !== (process.env.ADMIN_TOKEN || 'admin-key-2026')) {
    res.status(401).json({ success: false, error: '未授权访问' });
    return false;
  }
  return true;
}

// ==========================================
// POST /api/bookings — 创建预约
// ==========================================
router.post('/bookings', async (req, res) => {
  try {
    const { type, name, phone, city, company, note, source, utm_city, extra } = req.body;

    // 参数校验
    if (!type || !name || !phone) {
      return res.status(400).json({ success: false, error: '缺少必填字段：type, name, phone' });
    }
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: `无效的预约类型: ${type}` });
    }
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ success: false, error: '手机号格式不正确' });
    }
    if (extra !== undefined && (typeof extra !== 'object' || extra === null || Array.isArray(extra))) {
      return res.status(400).json({ success: false, error: 'extra 必须是对象' });
    }

    // 入库 + 异步通知
    const booking = bookingService.createBooking({
      type, name, phone, city: city || '', company, note,
      source: source || 'web', utm_city: utm_city || '', extra,
    });

    res.status(201).json({
      success: true,
      message: '预约已提交，我们将尽快与您联系',
      data: { id: booking.id, type: booking.type, created_at: booking.created_at },
    });
  } catch (err) {
    console.error('[API] 创建预约失败:', err.message);
    console.error('[API] 堆栈:', err.stack);
    res.status(500).json({ success: false, error: '服务器内部错误: ' + err.message });
  }
});

// ==========================================
// GET /api/bookings — 查询预约列表（管理端）
// ==========================================
router.get('/bookings', (req, res) => {
  try {
    if (!requireAuth(req, res)) return;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
    // 筛选：?type=salon&status=paid（type/status 枚举由前端控制，仅透传）
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;
    const result = bookingService.listBookings(page, pageSize, filters);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API] 查询预约失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// GET /api/bookings/:id — 查询单条预约
// ==========================================
router.get('/bookings/:id', (req, res) => {
  try {
    const booking = bookingService.getBookingById(parseInt(req.params.id));
    if (!booking) return res.status(404).json({ success: false, error: '预约不存在' });
    res.json({ success: true, data: booking });
  } catch (err) {
    console.error('[API] 查询预约失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// PATCH /api/bookings/:id — 更新预约状态
// ==========================================
router.patch('/bookings/:id', (req, res) => {
  try {
    if (!requireAuth(req, res)) return;
    const { status } = req.body;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: '无效状态值' });
    }
    bookingService.updateStatus(parseInt(req.params.id), status);
    res.json({ success: true, message: '状态已更新' });
  } catch (err) {
    console.error('[API] 更新预约失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// GET /api/stats — 数据统计（管理端）
// ==========================================
router.get('/stats', (req, res) => {
  try {
    if (!requireAuth(req, res)) return;
    res.json({ success: true, data: bookingService.getStats() });
  } catch (err) {
    console.error('[API] 查询统计失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// GET /api/city-config — 城市配置（P4 城市落地页）
// ==========================================
router.get('/city-config', (req, res) => {
  const city = req.query.city;
  if (!city || !cityConfig[city]) {
    return res.status(400).json({ success: false, error: '未知城市' });
  }
  res.json({ success: true, data: cityConfig[city] });
});

// ==========================================
// POST /api/contacts — 咨询留资
// ==========================================
router.post('/contacts', (req, res) => {
  try {
    const { name, phone, city, note } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: '姓名和手机号为必填项' });
    }
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ success: false, error: '手机号格式不正确' });
    }
    contactService.saveContact({ name, phone, city: city || '', source: 'cta', note });
    res.status(201).json({ success: true, message: '提交成功' });
  } catch (err) {
    console.error('[API] 留资失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// GET /api/content — 站点内容全部区块（前台加载）
// ==========================================
router.get('/content', (req, res) => {
  res.json({ success: true, data: contentService.getAll() });
});

// ==========================================
// GET /api/content/:key — 单个区块
// ==========================================
router.get('/content/:key', (req, res) => {
  const data = contentService.get(req.params.key);
  if (!data) return res.status(404).json({ success: false, error: '内容区块不存在' });
  res.json({ success: true, data });
});

// ==========================================
// GET /api/content-defaults — 默认内容（管理后台「恢复默认」用）
// ==========================================
router.get('/content-defaults', (req, res) => {
  res.json({ success: true, data: contentService.getDefaults() });
});

// ==========================================
// PUT /api/content/:key — 更新内容区块（管理端）
// ==========================================
router.put('/content/:key', (req, res) => {
  try {
    if (!requireAuth(req, res)) return;
    const { value } = req.body;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return res.status(400).json({ success: false, error: 'value 必须是对象' });
    }
    const body = JSON.stringify(value);
    if (body.length > 100 * 1024) {
      return res.status(400).json({ success: false, error: '内容过大（超过100KB）' });
    }
    contentService.update(req.params.key, value);
    res.json({ success: true, message: '内容已保存，前台刷新即可生效' });
  } catch (err) {
    console.error('[API] 更新内容失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// POST /api/upload — 图片上传（管理端，返回访问 URL）
// ==========================================
router.post('/upload', (req, res) => {
  if (!requireAuth(req, res)) return;
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message || '上传失败' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未选择文件' });
    }
    res.json({ success: true, url: '/uploads/' + req.file.filename, message: '上传成功' });
  });
});

// ==========================================
// POST /api/orders — 创建课程订单（报名 + 支付）
// ==========================================
router.post('/orders', async (req, res) => {
  try {
    const { product, name, phone, city, source } = req.body;
    if (!product || !name || !phone) {
      return res.status(400).json({ success: false, error: '缺少必填字段：product, name, phone' });
    }
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ success: false, error: '手机号格式不正确' });
    }
    const order = await orderService.createOrder({ product, name, phone, city, source });
    res.status(201).json({
      success: true,
      message: '订单已创建，请完成支付',
      data: {
        orderNo: order.order_no, title: order.title, amount: order.amount,
        channel: order.channel, qrCodeUrl: order.qr_code_url,
        bookingId: order.booking_id, created_at: order.created_at,
      },
    });
  } catch (err) {
    console.error('[API] 创建订单失败:', err.message);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: status === 400 ? err.message : '服务器内部错误' });
  }
});

// ==========================================
// GET /api/orders/:orderNo — 订单状态（前端支付轮询）
// ==========================================
router.get('/orders/:orderNo', (req, res) => {
  try {
    const s = orderService.getStatus(req.params.orderNo);
    if (!s) return res.status(404).json({ success: false, error: '订单不存在' });
    res.json({ success: true, data: s });
  } catch (err) {
    console.error('[API] 查询订单失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// GET /api/orders — 订单列表（管理端）
// ==========================================
router.get('/orders', (req, res) => {
  try {
    if (!requireAuth(req, res)) return;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
    res.json({ success: true, ...orderService.list(page, pageSize) });
  } catch (err) {
    console.error('[API] 查询订单列表失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// POST /api/orders/:id/confirm — 人工确认收款（管理端，收款码模式）
// ==========================================
router.post('/orders/:id/confirm', (req, res) => {
  try {
    if (!requireAuth(req, res)) return;
    const order = orderService.confirmPaid(parseInt(req.params.id), req.body.transactionId);
    if (!order) return res.status(404).json({ success: false, error: '订单不存在' });
    res.json({ success: true, message: '已确认收款', data: { status: order.status, paid_at: order.paid_at } });
  } catch (err) {
    console.error('[API] 确认收款失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// POST /api/pay/notify — 微信支付回调（express.raw 挂载于 index.js，body 为原始 Buffer）
// ==========================================
router.post('/pay/notify', (req, res) => {
  try {
    const body = req.body.toString('utf8');
    const signature = req.headers['wechatpay-signature'];
    const serial = req.headers['wechatpay-serial'];
    const timestamp = req.headers['wechatpay-timestamp'];
    const nonce = req.headers['wechatpay-nonce'];

    if (!wechatPay.isConfigured()) {
      console.warn('[支付回调] 微信支付未配置，忽略回调');
      return res.json({ code: 'FAIL', message: '微信支付未配置' });
    }
    if (!signature || !wechatPay.verifyNotify({ body, signature, timestamp, nonce })) {
      console.warn('[支付回调] 验签失败');
      return res.json({ code: 'FAIL', message: '验签失败' });
    }

    const event = JSON.parse(body);
    const decrypted = wechatPay.decryptNotifyResource(event.resource);
    // decrypted: { out_trade_no, transaction_id, trade_state, ... }
    if (decrypted.trade_state === 'SUCCESS') {
      orderService.markPaidByOrderNo(decrypted.out_trade_no, decrypted.transaction_id);
    }
    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (err) {
    console.error('[支付回调] 处理失败:', err.message);
    res.json({ code: 'FAIL', message: err.message });
  }
});

// ==========================================
// GET /api/prompt-game/status — 攻防游戏可用性（前端初始化探测）
// ==========================================
router.get('/prompt-game/status', (req, res) => {
  res.json({ success: true, data: { available: llmConfigured() || llmMock() } });
});

// ==========================================
// POST /api/prompt-game/move — 攻防游戏：发送提示词，AI 守密回复
// ==========================================
router.post('/prompt-game/move', rateLimit, async (req, res) => {
  try {
    const { level, messages } = req.body;
    const cfg = gameLevels.find(l => l.level === parseInt(level));
    if (!cfg) return res.status(400).json({ success: false, error: '无效关卡' });
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ success: false, error: '缺少消息内容' });
    }

    // 历史截断：保留最近 10 条，防 token 膨胀
    const history = messages.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 500),
    }));

    const reply = await chat(cfg.systemPrompt, history);
    const leaked = detectLeak(reply, cfg.secret);
    res.json({
      success: true,
      data: { reply, leaked, secret: leaked ? cfg.secret : undefined },
    });
  } catch (err) {
    console.error('[攻防游戏] move 失败:', err.message);
    res.status(err.status || 500).json({ success: false, error: err.message || '服务器内部错误' });
  }
});

// ==========================================
// POST /api/prompt-game/result — 攻防游戏成绩入库
// ==========================================
router.post('/prompt-game/result', rateLimit, (req, res) => {
  try {
    const { levelReached, attempts, city } = req.body;
    if (!levelReached || parseInt(levelReached) < 1) {
      return res.status(400).json({ success: false, error: '缺少成绩' });
    }
    promptGameRepo.saveResult({
      levelReached: Math.min(5, parseInt(levelReached)),
      attempts: parseInt(attempts) || 0,
      city: city || '',
    });
    res.status(201).json({ success: true, message: '成绩已记录' });
  } catch (err) {
    console.error('[攻防游戏] 成绩入库失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==========================================
// POST /api/ai-test — 含AI量检测结果
// ==========================================
router.post('/ai-test', (req, res) => {
  try {
    const { score, level, city } = req.body;
    if (score === undefined || !level) {
      return res.status(400).json({ success: false, error: '缺少检测结果' });
    }
    aiTestService.saveAiTest({ score, level, city: city || '' });
    res.status(201).json({ success: true, message: '结果已记录' });
  } catch (err) {
    console.error('[API] AI检测记录失败:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

module.exports = router;
