/**
 * 来客兄弟 API 服务
 *
 * 启动方式:
 *   node index.js
 *   或
 *   ADMIN_TOKEN=xxx WEBHOOK_URL=xxx node index.js
 *
 * 环境变量：
 *   PORT          — 服务端口，默认 3002
 *   ADMIN_TOKEN   — 管理端鉴权 Token
 *   WEBHOOK_URL   — Webhook 通知地址
 *   WECOM_WEBHOOK — 企业微信机器人 Webhook
 *   SMTP_HOST     — 邮件服务器
 *   NOTIFY_EMAIL  — 接收通知的邮箱
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./data/connection');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// API 路由
app.use('/api', routes);

// 管理后台页面托管
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// 前台落地页托管（从 ../index.html）
app.use(express.static(path.join(__dirname, '..')));

// 城市落地页（P4）：/city/:name → 同一落地页，前端按 URL 切换城市内容
app.get('/city/:name', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 内容管理上传的图片（管理后台上传 → /uploads/xxx.png）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// 全局错误处理
process.on('uncaughtException', (err) => {
  console.error('[未捕获异常]', err);
  // 不退出进程，让服务继续运行
});
process.on('unhandledRejection', (reason) => {
  console.error('[未处理的Promise拒绝]', reason);
});
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 先初始化数据库，再启动服务
initDB().then(() => {
  app.listen(PORT, () => {
    console.log('═'.repeat(50));
    console.log('  来客兄弟 API 服务已启动');
    console.log(`  http://localhost:${PORT}`);
    console.log(`  管理后台: http://localhost:${PORT}/admin`);
    console.log(`  城市落地页: http://localhost:${PORT}/city/shenzhen`);
    console.log('═'.repeat(50));
    console.log('  通知渠道:');
    console.log('    控制台日志 : ✓ 已启用');
    console.log('    文件日志   : ✓ 已启用 (server/logs/)');
    console.log(`    Webhook   : ${process.env.WEBHOOK_URL ? '✓ ' + process.env.WEBHOOK_URL : '✗ 未配置'}`);
    console.log(`    企业微信   : ${process.env.WECOM_WEBHOOK ? '✓ 已配置' : '✗ 未配置'}`);
    console.log(`    邮件       : ${process.env.SMTP_HOST ? '✓ ' + process.env.SMTP_HOST : '✗ 未配置'}`);
    console.log('═'.repeat(50));
  });
});
