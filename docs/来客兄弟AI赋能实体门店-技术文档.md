# 来客兄弟 AI 赋能实体门店 · 技术文档

> **版本**: v1.0  
> **日期**: 2026-08-04  
> **状态**: 与需求文档 v1.0 同步  
> **关联**: [产品需求文档](./来客兄弟AI赋能实体门店-产品需求文档.md)

---

## §A — 总体架构

### A.1 架构全景图

```
                          ┌─────────────────────────────────────┐
                          │           用户访问层                  │
                          ├──────────┬──────────┬───────────────┤
                          │  Web 浏览器 │ 微信小程序 │ 微信内置浏览器  │
                          │ (桌面+移动) │          │  (H5 落地页)   │
                          └─────┬────┴────┬─────┴───────┬───────┘
                                │         │             │
                    ┌───────────┼─────────┼─────────────┼───────────┐
                    │           ▼         ▼             ▼           │
                    │                  Nginx :80                      │
                    │     server_name lkxdai.com www.lkxdai.com     │
                    │          (与原有项目通过域名隔离)                │
                    └──────────────────────┬────────────────────────┘
                                           │ proxy_pass
                                           ▼
                          ┌─────────────────────────────────────┐
                          │           应用服务层                  │
                          ├─────────────────────────────────────┤
                          │     Express.js (Node.js :3002)       │
                          │                                     │
                          │  ┌──────────┐  ┌──────────────────┐ │
                          │  │ 静态文件  │  │    API 路由       │ │
                          │  │ index.html│  │  /api/bookings    │ │
                          │  │ admin/   │  │  /api/contacts    │ │
                          │  │ assets/  │  │  /api/ai-test     │ │
                          │  │          │  │  /api/stats       │ │
                          │  └──────────┘  └──────────────────┘ │
                          └────────────────┬────────────────────┘
                                           │
                          ┌────────────────┼────────────────────┐
                          │                ▼                     │
                          │          数据 & 通知层                │
                          │  ┌──────────┐  ┌──────────────────┐ │
                          │  │  SQLite  │  │   通知系统        │ │
                          │  │ (文件DB) │  │ 控制台 / 文件日志  │ │
                          │  │          │  │ Webhook / 企微    │ │
                          │  └──────────┘  │ 邮件(可选)        │ │
                          │                └──────────────────┘ │
                          └─────────────────────────────────────┘
```

### A.2 设计原则

| 原则 | 说明 |
|------|------|
| **前后端一体** | Express 同时托管静态前端 + API，避免 CORS，简化部署 |
| **同域部署** | 前端、API、管理后台统一在 lkxdai.com 下，无跨域问题 |
| **渐进增强** | 前端自带 localStorage 降级，API 不可用时仍可收集数据 |
| **异步通知** | 预约入库后立即响应，通知在 `setImmediate` 中异步执行，互不阻塞 |
| **容器隔离** | 独立端口 3002、独立 systemd 服务、独立 nginx server_name，与原有项目零耦合 |

---

## §B — 技术栈

### B.1 网页版 / H5

| 类别 | 技术 | 版本/说明 |
|------|------|-----------|
| 前端框架 | 原生 HTML5 + CSS3 + Vanilla JS | 无构建工具，CDN 加载极轻量 |
| CSS 方法论 | 手写 CSS，BEM 命名 | 无预处理器，减少依赖 |
| 图标 | Emoji + CSS 绘制 | 零外部图标库 |
| HTTP 请求 | `fetch()` API | 原生支持，不引入 axios |
| 降级存储 | `localStorage` | API 不可用时自动切换 |

### B.2 后端

| 类别 | 技术 | 版本/说明 |
|------|------|-----------|
| 运行时 | Node.js | ≥ 18.x (服务器: Ubuntu 24.04) |
| Web 框架 | Express.js | 4.x |
| 数据库 | sql.js (SQLite 纯 JS) | 1.10+，零原生依赖 |
| 进程守护 | systemd | Ubuntu 24.04 原生 |
| 反向代理 | Nginx | 1.x，通过 server_name 分流 |
| 通知 | fetch + nodemailer(可选) | 异步多渠道通知 |

### B.3 小程序版（规划中，P5 阶段）

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | 微信原生 / Taro 3.x | Taro 可编译 H5 + 小程序 |
| UI | 复用网页版视觉 | 微信 WeUI 可辅助表单 |
| 网络 | wx.request + wx.login | 微信登录 + 手机号授权 |
| 分享 | wx.share + Canvas 海报 | 含 AI 量检测社交裂变 |

### B.4 服务器

| 类别 | 配置 |
|------|------|
| 云厂商 | 腾讯云 |
| 公网 IP | 42.192.214.167 |
| 系统 | Ubuntu 24.04 LTS |
| 规格 | 4 核 8G |
| 域名 | lkxdai.com（A 记录待配置） |

---

## §C — 项目目录结构

```
laikedixiong-site/
├── index.html                  # 前端落地页（单文件，~1200行）
├── test_api.js                 # API 测试脚本
├── dist/                       # 构建产物目录（预留）
├── docs/
│   ├── 来客兄弟AI赋能实体门店-产品需求文档.md
│   └── 来客兄弟AI赋能实体门店-技术文档.md
├── server/
│   ├── index.js                # Express 主入口，端口 :3002
│   ├── routes.js               # API 路由（7 个端点）
│   ├── db.js                   # 数据库封装 + 业务方法
│   ├── notify.js               # 多渠道通知系统
│   ├── admin/
│   │   └── index.html          # 管理后台（数据看板 + 预约列表）
│   ├── logs/                   # 预约日志（按天分文件）
│   ├── laikedixiong.db         # SQLite 数据库文件（自动生成）
│   └── package.json            # Node.js 依赖
├── deploy/
│   ├── laikedixiong.service    # systemd 服务配置
│   ├── nginx-laikedixiong.conf # Nginx 反向代理配置
│   └── .env.example            # 环境变量模板
└── README.md                   # （待完善）
```

---

## §D — 数据库设计

### D.1 表结构

#### bookings（预约主表）

```sql
CREATE TABLE bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT    NOT NULL,  -- community|salon|tour|visit|course|enterprise
  name          TEXT    NOT NULL,
  phone         TEXT    NOT NULL,
  city          TEXT    NOT NULL,  -- beijing|shanghai|shenzhen|guangzhou|...
  company       TEXT,              -- 企业名称（选填）
  note          TEXT,              -- 备注/额外信息
  source        TEXT    DEFAULT 'web',  -- web|miniapp|qrcode
  utm_city      TEXT,              -- UTM 城市参数
  status        TEXT    DEFAULT 'pending',  -- pending→contacted→confirmed→cancelled
  notified_at   TEXT,              -- 最后通知时间
  created_at    TEXT    DEFAULT (datetime('now','localtime')),
  updated_at    TEXT    DEFAULT (datetime('now','localtime'))
);
```

#### contacts（咨询留资表）

```sql
CREATE TABLE contacts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  phone         TEXT    NOT NULL,
  city          TEXT,
  source        TEXT    DEFAULT 'cta',
  status        TEXT    DEFAULT 'new',
  created_at    TEXT    DEFAULT (datetime('now','localtime'))
);
```

#### ai_tests（含 AI 量检测表）

```sql
CREATE TABLE ai_tests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  score         INTEGER NOT NULL,  -- 0-100 分数
  level         TEXT    NOT NULL,  -- AI青铜|AI白银|AI黄金|AI王者
  city          TEXT,
  created_at    TEXT    DEFAULT (datetime('now','localtime'))
);
```

#### notify_logs（通知日志表）

```sql
CREATE TABLE notify_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id    INTEGER,
  channel       TEXT    NOT NULL,  -- webhook|wecom|email
  status        TEXT    NOT NULL,  -- success|failed
  response      TEXT,              -- 响应 / 错误信息
  created_at    TEXT    DEFAULT (datetime('now','localtime'))
);
```

### D.2 状态流转

```
预约提交 → pending（待联系）
              │
              ├──→ contacted（已联系）
              │       ├──→ confirmed（已确认）
              │       └──→ cancelled（已取消）
              │
              └──→ cancelled（直接取消）
```

### D.3 type 字段枚举

| 值 | 含义 | 对应产品模块 |
|----|------|-------------|
| `community` | AI 学联社社群 | M1 |
| `salon` | AI 沙龙 | M2 |
| `tour` | AI 游学 | M3 |
| `visit` | 未来城展厅参观 | M4 |
| `course` | AI 普及线上课 | M5 |
| `enterprise` | AI 入企培训 | M6 |

### D.4 持久化策略

```
                     ┌──────────────┐
                     │  内存 SQLite  │ ←── sql.js 运行于 Node.js 进程内存
                     └──────┬───────┘
                            │ export() → Buffer
                            ▼
                     ┌──────────────┐
                     │ .db 磁盘文件  │ ←── 每次 run() 后立即 saveDB()
                     └──────┬───────┘
                            │ 30s 定时兜底
                            ▼
                     ┌──────────────┐
                     │ laikedixiong │
                     │ .db          │
                     └──────────────┘
```

**迁移到 MySQL 的路径**（当数据量增长时）：
1. sql.js → 导出 `.db` 文件 → 用 `sqlite3` 命令导出 SQL
2. 替换 `db.js` 中的 `getOne/getAll/run` 为 MySQL 连接池
3. `routes.js` 和 `notify.js` 无需改动（db 接口保持不变）

---

## §E — API 接口规范

### E.1 基础信息

| 项目 | 值 |
|------|-----|
| 协议 | HTTP/1.1 |
| 数据格式 | JSON (Content-Type: application/json) |
| 字符编码 | UTF-8 |
| 认证方式 | Header `Authorization` 或 Query `?token=` |
| 超时 | 10s（服务端），通知 10s 超时 |

### E.2 统一响应格式

**成功**
```json
{
  "success": true,
  "data": { ... },
  "message": "操作说明"
}
```

**失败**
```json
{
  "success": false,
  "error": "错误描述"
}
```

### E.3 接口列表

#### POST /api/bookings — 创建预约

```
请求体:
{
  "type":      "community",     // 必填，枚举见 D.3
  "name":      "张三",           // 必填
  "phone":     "13800138000",   // 必填，正则 /^1[3-9]\d{9}$/
  "city":      "beijing",       // 选填
  "company":   "某某餐饮",       // 选填
  "note":      "希望了解AI工具",  // 选填
  "source":    "web",           // 选填，默认 web
  "utm_city":  "beijing"        // 选填
}

校验规则:
  - type 必填，且必须在枚举内
  - name 必填，非空字符串
  - phone 必填，11 位手机号格式

响应 201:
{
  "success": true,
  "message": "预约已提交，我们将尽快与您联系",
  "data": { "id": 42, "type": "community", "created_at": "2026-08-04 13:30:00" }
}

响应 400:
{ "success": false, "error": "手机号格式不正确" }

行为:
  1. 参数校验 → 2. 入库 bookings 表 → 3. setImmediate 异步通知 → 4. 返回 201
  通知失败不影响响应（已完全隔离）
```

#### GET /api/bookings — 查询预约列表（管理端）

```
鉴权: token（Header 或 Query）
分页: ?page=1&pageSize=20

响应 200:
{
  "success": true,
  "total": 156,
  "page": 1,
  "pageSize": 20,
  "data": [ { ...每行预约完整字段 } ]
}

响应 401:
{ "success": false, "error": "未授权访问" }
```

#### GET /api/bookings/:id — 查询单条预约

```
无鉴权（内部查询用）

响应 200:
{ "success": true, "data": { ...完整字段 } }

响应 404:
{ "success": false, "error": "预约不存在" }
```

#### PATCH /api/bookings/:id — 更新预约状态

```
鉴权: token
请求体: { "status": "contacted" }
有效值: pending | contacted | confirmed | cancelled

响应 200:
{ "success": true, "message": "状态已更新" }

响应 400:
{ "success": false, "error": "无效状态值" }
```

#### GET /api/stats — 数据统计（管理端）

```
鉴权: token

响应 200:
{
  "success": true,
  "data": {
    "today": 12,                              // 今日预约数
    "byType": [
      { "type": "community", "count": 45 },
      { "type": "salon",     "count": 32 },
      ...
    ]
  }
}
```

#### POST /api/contacts — 咨询留资

```
请求体:
{
  "name":  "张三",       // 必填
  "phone": "13800138000", // 必填
  "city":  "beijing"      // 选填
}

响应 201:
{ "success": true, "message": "提交成功" }
```

#### POST /api/ai-test — 含 AI 量检测结果

```
请求体:
{
  "score": 75,           // 必填，0-100
  "level": "AI黄金",      // 必填
  "city":  "beijing"     // 选填
}

响应 201:
{ "success": true, "message": "结果已记录" }
```

#### GET /api/health — 健康检查

```
无鉴权

响应 200:
{ "status": "ok", "time": "2026-08-04T05:30:00.000Z" }
```

### E.4 错误码

| HTTP 状态码 | 含义 | 触发场景 |
|-------------|------|----------|
| 200 | 成功 | 查询/更新操作 |
| 201 | 已创建 | POST 预约/留资/检测 |
| 400 | 请求错误 | 参数校验失败 |
| 401 | 未授权 | 管理端无 token |
| 404 | 未找到 | 预约/路由不存在 |
| 500 | 服务器错误 | 未捕获异常 |

---

## §F — 前端架构

### F.1 页面结构

index.html 是单文件 SPA-like 长滚动页面，自上而下划分为以下 Section：

```
┌─────────────────────────────────┐
│  Nav（固定导航 + 城市选择器）      │
├─────────────────────────────────┤
│  §00 Hero（主视觉 + 双 CTA）     │
├─────────────────────────────────┤
│  §01 六大服务（卡片网格 3×2）     │
├─────────────────────────────────┤
│  §02 课程大纲（折叠/展开）        │
├─────────────────────────────────┤
│  §03 讲师团队（横向卡片）         │
├─────────────────────────────────┤
│  §04 为什么选择我们（3 列 grid）   │
├─────────────────────────────────┤
│  §05 含 AI 量检测（小游戏交互）    │
├─────────────────────────────────┤
│  §06 未来城展厅（图文介绍）        │
├─────────────────────────────────┤
│  §07 价格与席位                  │
├─────────────────────────────────┤
│  §08 常见问题 FAQ（手风琴）       │
├─────────────────────────────────┤
│  §09 预约 CTA + Footer           │
├─────────────────────────────────┤
│  悬浮咨询按钮（底部固定）          │
└─────────────────────────────────┘
```

### F.2 核心交互

| 交互组件 | 实现方式 | 说明 |
|----------|----------|------|
| 城市选择器 | `<select>` + `change` 事件 | 切换后更新 Hero 城市名 + 存储到 localStorage |
| 预约弹窗 | `dialog` 元素 + 条件表单 | 根据预约类型动态显示不同字段 |
| FAQ 手风琴 | CSS `details/summary` 或 JS `toggleClass` | 展开/折叠 |
| 含 AI 量检测 | 8 道单选 → 评分 → 结果展示 | 纯前端计算 + Canvas 生成海报 |
| 悬浮咨询 | `position:fixed` 按钮 → 弹出留资表单 | 底部固定 |
| 表单提交 | `fetch()` → API | loading 态 + 成功/失败提示 |

### F.3 降级策略

```javascript
// 前端自动降级模式
async function submitBooking(data) {
  try {
    // 1. 尝试提交到后端 API
    const res = await fetch('/api/bookings', { method: 'POST', body: JSON.stringify(data) });
    if (res.ok) return { success: true, via: 'api' };
    throw new Error('API 不可用');
  } catch (e) {
    // 2. 降级到 localStorage
    const bookings = JSON.parse(localStorage.getItem('laikedixiong_bookings') || '[]');
    bookings.push({ ...data, id: Date.now(), created_at: new Date().toISOString(), status: 'local' });
    localStorage.setItem('laikedixiong_bookings', JSON.stringify(bookings));
    return { success: true, via: 'localStorage' };
  }
}
```

### F.4 样式规范

| 属性 | 值 |
|------|-----|
| 背景 | `linear-gradient(180deg, #eef6ff 0%, #f5f0ff 50%, #f0f8ff 100%)` |
| 卡片背景 | `#ffffff` + `box-shadow: 0 4px 24px rgba(0,0,0,0.06)` |
| 主按钮 | `linear-gradient(135deg, #4f46e5, #2563eb)` → `#ffffff` |
| 强调文字 | `linear-gradient(135deg, #6366f1, #60a5fa, #10b981)` |
| 圆角 | 卡片 `16px`，按钮 `50px`，标签 `50px` |
| 最大宽度 | `1200px` (container) |
| 响应式断点 | `768px`（平板）、`480px`（手机） |

---

## §G — 后端架构

### G.1 模块依赖

```
index.js (Express 主进程)
  ├── db.js
  │   ├── initDB()         — 数据库初始化 + 建表
  │   ├── createBooking()  — 插入预约记录
  │   ├── listBookings()   — 分页查询
  │   ├── getBookingById() — 单条查询
  │   ├── getStats()       — 统计聚合
  │   ├── updateStatus()   — 状态更新
  │   ├── saveContact()    — 留资写入
  │   ├── saveAiTest()     — AI检测写入
  │   └── recordNotify()   — 通知日志写入
  │
  ├── routes.js
  │   ├── POST   /api/bookings
  │   ├── GET    /api/bookings
  │   ├── GET    /api/bookings/:id
  │   ├── PATCH  /api/bookings/:id
  │   ├── GET    /api/stats
  │   ├── POST   /api/contacts
  │   └── POST   /api/ai-test
  │
  └── notify.js
      ├── logToConsole()   — 控制台输出（始终启用）
      ├── logToFile()      — 文件日志（始终启用）
      ├── sendWebhook()    — HTTP Webhook（需 WEBHOOK_URL）
      ├── sendWecomBot()   — 企业微信机器人（需 WECOM_WEBHOOK）
      └── sendEmail()      — SMTP 邮件（需 SMTP 配置）
```

### G.2 请求生命周期

```
用户提交预约
    │
    ▼
Nginx :80 → proxy_pass → Express :3002
    │
    ▼
routes.js: POST /api/bookings
    │
    ├── 1. 参数校验（type / name / phone）
    │     失败 → 400 响应
    │
    ├── 2. db.createBooking(data)
    │     ├── INSERT INTO bookings
    │     ├── saveDB() 持久化
    │     ├── SELECT MAX(id) 获取新 ID
    │     └── 返回完整 booking 对象
    │
    ├── 3. setImmediate → notify(booking, db)
    │     └── 异步执行，不阻塞响应
    │
    └── 4. res.status(201).json(...)
           └── 立即返回给用户
```

### G.3 通知执行顺序

```
notify(booking, db) 被 setImmediate 触发
    │
    ├── ① logToConsole(booking)       同步，立即输出
    ├── ② logToFile(booking)          同步，写入 logs/bookings-YYYY-MM-DD.log
    │
    └── ③ Promise.allSettled([
            sendWebhook(booking),      并行 HTTP POST，10s 超时
            sendWecomBot(booking),     并行 HTTP POST，10s 超时
            sendEmail(booking),        并行 SMTP（需 nodemailer）
        ])
        │
        └── ④ db.recordNotify()  记录每个渠道的发送状态
```

### G.4 错误处理

```
层次            处理方式
────────────────────────────────────────
Express 中间件   app.use(err, req, res, next) → 500
process 全局     uncaughtException  → 日志记录，不退出
                  unhandledRejection → 日志记录，不退出
通知模块         try/catch 每个渠道 → 记录失败，不影响其他渠道
数据库           每个方法内 try/catch → throw，由路由层 catch
路由层           try/catch → 500 + error message
前端降级         try/catch fetch → localStorage 兜底
```

---

## §H — 部署架构

### H.1 服务器布局

```
腾讯云 42.192.214.167 (Ubuntu 24.04)
│
├── 原有项目 (ailkxd.com)
│   ├── :3000  — 原有 Node.js 服务
│   ├── :80    — 原有 Nginx → :3000
│   └── :443   — 原有 HTTPS
│
├── 来客兄弟 (lkxdai.com)  ← 新增，完全隔离
│   ├── /opt/laikedixiong-site/   — 项目根目录
│   │   ├── index.html            — 前端落地页
│   │   ├── server/               — 后端代码
│   │   ├── deploy/               — 部署配置
│   │   └── logs/                 — 应用日志
│   ├── :3002 — Node.js 服务（独立端口）
│   ├── systemd: laikedixiong.service
│   └── Nginx: server_name lkxdai.com → :3002
│
└── 隔离方式
    ├── 独立目录 /opt/laikedixiong-site/
    ├── 独立端口 :3002（不与 :3000/80/443 冲突）
    ├── 独立 systemd 服务
    ├── 独立 Nginx server block（按域名分流）
    └── 独立日志文件
```

### H.2 systemd 服务

```ini
# /etc/systemd/system/laikedixiong.service
[Unit]
Description=来客兄弟 CMS - AI赋能实体门店
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/laikedixiong-site/server
EnvironmentFile=/opt/laikedixiong-site/deploy/.env
ExecStart=/usr/bin/node /opt/laikedixiong-site/server/index.js
Restart=always
RestartSec=5
StandardOutput=append:/opt/laikedixiong-site/logs/app.log
StandardError=append:/opt/laikedixiong-site/logs/error.log

[Install]
WantedBy=multi-user.target
```

管理命令：

```bash
sudo systemctl enable laikedixiong   # 开机自启
sudo systemctl start laikedixiong    # 启动
sudo systemctl stop laikedixiong     # 停止
sudo systemctl restart laikedixiong  # 重启
sudo systemctl status laikedixiong   # 状态
sudo journalctl -u laikedixiong -f   # 实时日志
```

### H.3 Nginx 配置

```nginx
# /etc/nginx/sites-available/laikedixiong
server {
    listen 80;
    server_name lkxdai.com www.lkxdai.com;

    access_log /opt/laikedixiong-site/logs/nginx-access.log;
    error_log  /opt/laikedixiong-site/logs/nginx-error.log;
    client_max_body_size 10m;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~* \.(jpg|jpeg|png|gif|svg|ico|css|js|woff2?)$ {
        proxy_pass http://127.0.0.1:3002;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### H.4 部署流程

```bash
# 1. 本地打包（或直接 scp 源文件）
cd laikedixiong-site
tar -czf deploy.tar.gz index.html server/ deploy/ --exclude 'node_modules' --exclude '*.db' --exclude 'logs/*'

# 2. 上传到服务器
scp deploy.tar.gz ubuntu@42.192.214.167:/tmp/

# 3. 服务器解压 + 依赖安装
ssh ubuntu@42.192.214.167
sudo mkdir -p /opt/laikedixiong-site
sudo tar -xzf /tmp/deploy.tar.gz -C /opt/laikedixiong-site/
cd /opt/laikedixiong-site/server
npm install --production

# 4. 配置环境变量
sudo cp /opt/laikedixiong-site/deploy/.env.example /opt/laikedixiong-site/deploy/.env
# 编辑 .env 填入真实值

# 5. systemd + Nginx
sudo cp /opt/laikedixiong-site/deploy/laikedixiong.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now laikedixiong
sudo cp /opt/laikedixiong-site/deploy/nginx-laikedixiong.conf /etc/nginx/sites-available/laikedixiong
sudo ln -s /etc/nginx/sites-available/laikedixiong /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. 验证
curl http://localhost:3002/api/health
curl http://localhost:3002/    # 落地页
```

### H.5 环境变量

```bash
# /opt/laikedixiong-site/deploy/.env
PORT=3002
ADMIN_TOKEN=your-secure-token-here

# 通知渠道（可选，按需配置）
WEBHOOK_URL=https://your-webhook.com/api/notify
WECOM_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=noreply@example.com
SMTP_PASS=password
NOTIFY_EMAIL=admin@lkxdai.com
```

---

## §I — 安全规范

### I.1 当前安全措施

| 措施 | 实现 | 状态 |
|------|------|------|
| 管理端鉴权 | token 校验（环境变量 ADMIN_TOKEN） | ✅ 已实现 |
| 手机号校验 | 正则 `/^1[3-9]\d{9}$/` | ✅ 已实现 |
| 预约类型校验 | 白名单枚举 | ✅ 已实现 |
| X-Frame-Options | Nginx `SAMEORIGIN` | ✅ 已实现 |
| X-Content-Type-Options | Nginx `nosniff` | ✅ 已实现 |
| 错误不暴露堆栈 | 生产环境 JSON error message | ✅ 已实现 |
| 请求日志 | 中间件记录 method + path + status + ms | ✅ 已实现 |

### I.2 待完善

| 措施 | 优先级 | 说明 |
|------|--------|------|
| HTTPS | P0 | 配置 Let's Encrypt 免费证书 |
| Rate Limiting | P1 | 安装 `express-rate-limit`，防止接口滥用 |
| Helmet | P1 | 安装 `helmet`，自动设置安全 HTTP 头 |
| CSP | P2 | Content-Security-Policy 头 |
| 输入消毒 | P2 | 防止 XSS（当前无富文本输入，风险较低） |
| Token 升级为 JWT | P3 | 当前 token 是简单的字符串比较 |
| SQL 注入 | — | 使用参数化查询（`?`占位符），已内置防护 |

### I.3 配置建议

```bash
# 生产环境 .env
ADMIN_TOKEN=<随机生成 32 位以上>  # openssl rand -hex 32
```

---

## §J — 微信小程序技术要点（P5 预留）

### J.1 小程序与网页版差异

| 维度 | 网页版 | 小程序版 |
|------|--------|----------|
| 页面路由 | URL path + anchor | pages 注册式路由 |
| 网络请求 | `fetch()` | `wx.request()` |
| 用户标识 | 无（匿名） | `wx.login()` → openid |
| 手机号 | 用户手动输入 | `button open-type="getPhoneNumber"` |
| 分享 | 复制链接 | `wx.shareAppMessage()` + 小程序码 |
| 存储 | `localStorage` | `wx.setStorageSync()` |
| 海报生成 | `<canvas>` | `wx.createOffscreenCanvas()` |

### J.2 小程序 API 适配

小程序请求后端同一套 API，但需处理：

```javascript
// 小程序适配层
function request(url, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `https://lkxdai.com/api${url}`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data,
      success: res => resolve(res.data),
      fail: reject,
    });
  });
}
```

### J.3 分享裂变设计

```
用户完成"含 AI 量检测"
    │
    ├── 生成结果页（Canvas 绘制海报）
    │   含：用户头像 + 昵称 + 等级 + 金句 + 小程序码
    │
    ├── wx.shareAppMessage() → 微信群/好友
    │   分享卡片标题："我的含AI量是XX%，测测你的？"
    │
    └── wx.saveImageToPhotosAlbum() → 保存海报到相册
        用户发朋友圈
```

---

## §K — 测试策略

### K.1 测试层次

```
         ┌──────────────────────────┐
         │    E2E 测试（P2 阶段）     │
         │    Cypress / Playwright   │
         ├──────────────────────────┤
         │    集成测试（P1 阶段）      │
         │    supertest + 真实 DB     │
         ├──────────────────────────┤
         │    单元测试（P1 阶段）      │
         │    Jest + mock db         │
         └──────────────────────────┘
```

### K.2 API 测试脚本（已有）

```bash
# test_api.js — 快速验证 API 可用性
node test_api.js
```

### K.3 关键测试用例

| 测试点 | 输入 | 期望 |
|--------|------|------|
| 正常预约 | 全字段 | 201 + 返回 ID |
| 缺少必填 | 不传 phone | 400 |
| 无效 type | type=invalid | 400 |
| 手机号格式错误 | phone=123 | 400 |
| 无 token 查列表 | GET /api/bookings | 401 |
| 正确 token | Authorization=xxx | 200 + 分页数据 |
| 无效 status | status=deleted | 400 |
| 不存在的预约 | GET /api/bookings/99999 | 404 |
| 健康检查 | GET /api/health | 200 + status:ok |
| 前端降级 | 停止后端服务 | localStorage 接管 |

---

## §L — 性能优化

### L.1 当前措施

| 措施 | 效果 |
|------|------|
| 单文件 HTML | 零额外请求，首屏 < 1s |
| 无外部字体 | 使用系统默认字体栈 |
| 静态资源 30d 缓存 | 回访用户零网络请求 |
| 异步通知 | 预约 API 响应时间 < 50ms |
| sql.js 内存数据库 | 无磁盘 I/O 瓶颈 |

### L.2 待优化（P6）

| 措施 | 预期收益 |
|------|----------|
| HTML/CSS/JS 压缩 | 体积减小 30-50% |
| 图片懒加载 | 首屏加载提速 |
| CDN（腾讯云 COS） | 就近访问，降低延迟 |
| 数据库索引 | type + created_at 复合索引 |
| 接入日志/监控 | 腾讯云 CLS 或 Sentry |

---

## §M — 开发规范

### M.1 Git 分支策略

```
main          — 生产环境代码
  └── develop — 开发分支
        ├── feature/xxx — 功能分支
        ├── fix/xxx     — 修复分支
        └── release/x.x — 发布分支
```

### M.2 代码规范

| 语言 | 规范 |
|------|------|
| JavaScript | ES6+，`const`/`let` 替代 `var`，箭头函数优先 |
| CSS | 手写 CSS，BEM 风格命名，变量集中定义 |
| HTML | 语义化标签，`section`/`header`/`footer` |
| 注释 | 中文注释，每个 Section 用 `/* ====` 分隔 |

### M.3 提交信息格式

```
<type>: <简短描述>

类型: feat / fix / docs / style / refactor / deploy / chore

示例:
  feat: 新增城市落地页路由 /city/:name
  fix: 修复手机号校验正则不匹配 166 号段
  deploy: 更新 nginx 配置，启用 gzip
```

---

## §N — 后续演进路线

| 阶段 | 内容 | 技术动作 |
|------|------|----------|
| **P1-P2**（当前） | 网页版 MVP + 颜色改版 | 完善 index.html，对接 API |
| **P3** | 含 AI 量检测 | Canvas 海报生成 + 微信 JS-SDK 分享 |
| **P4** | 城市落地页 | 前端 URL 路由 + 动态城市配置 |
| **P5** | 微信小程序 | 新建 miniapp 项目，复用 API |
| **P6** | 上线优化 | 压缩、CDN、监控、HTTPS |
| **远期** | AI SEO 升级 | 服务端渲染（SSR）、结构化数据、适配大模型收录 |
| **远期** | 数据迁移 | SQLite → MySQL（CMS 项目数据库复用） |

---

## §O — 附录

### O.1 依赖清单

```json
{
  "dependencies": {
    "express": "^4.x",
    "cors": "^2.x",
    "sql.js": "^1.10.x"
  },
  "optionalDependencies": {
    "nodemailer": "^6.x"
  }
}
```

### O.2 端口分配

| 端口 | 服务 | 状态 |
|------|------|------|
| 3002 | 来客兄弟 API + 前端 | ✅ 运行中 |
| 3000 | 原有项目 Node.js | 运行中（不冲突） |
| 80 | Nginx（两项目共用） | 运行中，按域名分流 |
| 443 | 原有项目 HTTPS | 运行中 |

### O.3 管理后台入口

- URL: `http://lkxdai.com/admin?token=<ADMIN_TOKEN>`
- 功能: 数据看板、预约列表（分页+筛选）、状态流转
- 刷新: 30 秒自动刷新

### O.4 参考文档

- [Express.js 官方文档](https://expressjs.com/)
- [sql.js 文档](https://sql.js.org/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [Nginx 反向代理指南](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

---

> **文档维护**: 随代码迭代同步更新。  
> **负责人**: 郭柠搏  
> **所属**: 来客兄弟（中国数商科技）
