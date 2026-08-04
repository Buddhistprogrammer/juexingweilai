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
const cityConfig = require('./city.config');

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
  limits: { fileSize: 5 * 1024 * 1024 },
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
    const result = bookingService.listBookings(page, pageSize);
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
