# 觉醒未来城 · 来客兄弟站点

来客兄弟 AI 集团旗下「觉醒未来城」品牌官网 —— 中国县域 AI 生态综合服务商落地页 + 预约留资系统 + 内容管理系统（CMS）。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 原生 HTML/CSS/JS（单文件落地页，零构建，微信浏览器优先） |
| 后端 | Node.js + Express（端口 3002） |
| 数据库 | SQLite（sql.js 纯 JS 实现，可迁移 MySQL） |
| 内容管理 | site_content 表 + 管理后台在线编辑（文字/图片/上传） |
| 通知 | 控制台 / 文件日志 / Webhook / 企业微信 / 邮件 |

## 项目结构

```
├── index.html            # 前台落地页（含 data-c 内容标记，支持后台覆盖）
├── server/
│   ├── index.js          # Express 入口（:3002，/uploads 静态）
│   ├── routes.js         # API 路由薄层
│   ├── city.config.js    # 8 城市配置
│   ├── content.defaults.js  # 站点内容默认值（CMS seed + 恢复默认）
│   ├── data/             # 数据访问层（connection + 各 repo）
│   ├── services/         # 业务层
│   ├── notify/           # 多渠道通知
│   ├── admin/index.html  # 管理后台（预约管理 + 内容管理）
│   └── uploads/          # 内容管理上传的图片（git 忽略）
├── deploy/               # systemd + nginx + 一键部署脚本
└── docs/                 # 产品需求 / 技术 / 架构文档
```

## 本地启动

```bash
cd server
npm install
npm start          # 或 npm run dev（自动重启）
```

- 前台：http://localhost:3002 （城市落地页：/city/shenzhen）
- 管理后台：http://localhost:3002/admin （默认密钥 `admin-key-2026`，生产务必通过环境变量 `ADMIN_TOKEN` 覆盖）

## 主要 API

| 接口 | 鉴权 | 说明 |
|---|---|---|
| `POST /api/bookings` | 无 | 创建预约（6 模块差异化字段，extra JSON） |
| `GET /api/bookings` | Token | 预约列表（分页） |
| `PATCH /api/bookings/:id` | Token | 状态流转（pending→contacted→confirmed→completed/cancelled） |
| `GET /api/stats` | Token | 数据统计 |
| `GET /api/content` | 无 | 站点内容全部区块（前台加载） |
| `PUT /api/content/:key` | Token | 更新内容区块（CMS） |
| `POST /api/upload` | Token | 图片上传（5MB，png/jpg/jpeg/gif/webp） |
| `POST /api/contacts` / `POST /api/ai-test` | 无 | 留资 / 含AI量检测结果 |

## 部署

- 一键部署：`deploy/deploy.sh`（打包 → scp → systemd + nginx）
- 服务器：腾讯云，域名 lkxdai.com，Nginx 反代 :3002
- 部署前务必在服务器 `deploy/.env` 设置强随机 `ADMIN_TOKEN`

## 安全注意

- 数据库 `laikedixiong.db` 含真实用户手机号，已加入 .gitignore，**严禁提交**
- 默认管理 Token `admin-key-2026` 仅限本地开发，生产环境必须更换
