#!/bin/bash
# ==========================================
# 来客兄弟 CMS - 一键部署脚本
# 
# 用法（在本地执行，自动上传到服务器）：
#   chmod +x deploy.sh
#   ./deploy.sh
#
# 或者手动在服务器上执行（先 scp 上传整个项目到 /opt/laikedixiong-site/）：
#   ssh user@server "bash /opt/laikedixiong-site/deploy/server-setup.sh"
# ==========================================

set -e

# ─── 配置（请根据实际情况修改）───
SERVER_IP="42.192.214.167"
SERVER_USER="ubuntu"
PROJECT_DIR="/opt/laikedixiong-site" # ← 服务器上的项目目录
NODE_VERSION="22"                    # ← Node.js 版本（18/20/22）

# ─── 颜色 ───
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  来客兄弟 CMS · 部署工具${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""

# 检查配置
if [ "$SERVER_IP" = "YOUR_SERVER_IP" ]; then
    echo -e "${RED}[错误] 请先编辑 deploy.sh，设置 SERVER_IP${NC}"
    echo "  用文本编辑器打开 deploy/deploy.sh，修改开头的 SERVER_IP"
    exit 1
fi

# ─── Step 1: 打包项目（排除 node_modules 和数据库）───
echo -e "${YELLOW}[1/5] 打包项目文件...${NC}"
cd "$(dirname "$0")/.."
tar -czf /tmp/laikedixiong-deploy.tar.gz \
    --exclude='server/node_modules' \
    --exclude='server/laikedixiong.db' \
    --exclude='server/logs' \
    --exclude='server/uploads' \
    --exclude='dist' \
    --exclude='deploy' \
    --exclude='.git' \
    index.html \
    server/
echo -e "${GREEN}  ✓ 打包完成 ($(du -h /tmp/laikedixiong-deploy.tar.gz | cut -f1))${NC}"

# ─── Step 2: 上传到服务器 ───
echo -e "${YELLOW}[2/5] 上传到服务器 ${SERVER_IP}...${NC}"
scp /tmp/laikedixiong-deploy.tar.gz "${SERVER_USER}@${SERVER_IP}:/tmp/"
echo -e "${GREEN}  ✓ 上传完成${NC}"

# ─── Step 3: 在服务器上执行安装 ───
echo -e "${YELLOW}[3/5] 服务器端安装...${NC}"
ssh "${SERVER_USER}@${SERVER_IP}" bash << 'ENDSSH'
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
PROJECT_DIR="/opt/laikedixiong-site"

# 创建目录结构（/opt 下目录归 www-data，需 sudo）
echo "  创建项目目录..."
sudo mkdir -p $PROJECT_DIR/server/logs
sudo mkdir -p $PROJECT_DIR/deploy
sudo mkdir -p /opt/laikedixiong-site/logs

# 解压项目文件（先清理本地已删除的旧单文件，防止 require 解析到残留版本）
echo "  清理残留旧文件..."
sudo rm -f $PROJECT_DIR/server/notify.js $PROJECT_DIR/server/db.js

# 解压项目文件
echo "  解压项目文件..."
sudo tar -xzf /tmp/laikedixiong-deploy.tar.gz -C $PROJECT_DIR --overwrite
sudo rm /tmp/laikedixiong-deploy.tar.gz

# 安装 Node.js（如果未安装）
if ! command -v node &> /dev/null; then
    echo "  安装 Node.js 22.x..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
    sudo apt-get install -y nodejs
fi
echo "  Node.js $(node -v) ✓"

# 安装依赖
echo "  安装 npm 依赖..."
cd $PROJECT_DIR/server
sudo npm install --production
echo "  ✓ npm 依赖安装完成"

# 设置权限
echo "  设置文件权限..."
sudo chown -R www-data:www-data $PROJECT_DIR 2>/dev/null || sudo chown -R 1000:1000 $PROJECT_DIR
sudo chmod -R 755 $PROJECT_DIR

echo -e "${GREEN}  ✓ 服务器端安装完成${NC}"
ENDSSH

# ─── Step 4: 配置 systemd 服务 ───
echo -e "${YELLOW}[4/5] 配置 systemd 服务...${NC}"

# 上传配置文件（.env.example 只用于「不存在 .env 时」兜底创建，不覆盖已有配置）
scp "$(dirname "$0")/laikedixiong.service" "${SERVER_USER}@${SERVER_IP}:/tmp/laikedixiong.service"
scp "$(dirname "$0")/.env.example" "${SERVER_USER}@${SERVER_IP}:/tmp/laikedixiong.env.example"

ssh "${SERVER_USER}@${SERVER_IP}" bash << 'ENDSSH'
set -e

PROJECT_DIR="/opt/laikedixiong-site"

# 注册 systemd 服务
sudo cp /tmp/laikedixiong.service /etc/systemd/system/laikedixiong.service
sudo systemctl daemon-reload

# 如果 env 文件不存在，创建默认的（存在则保留服务器上的自定义配置）
if [ ! -f "$PROJECT_DIR/deploy/.env" ]; then
    sudo cp /tmp/laikedixiong.env.example "$PROJECT_DIR/deploy/.env"
    echo "  ⚠ 请编辑 $PROJECT_DIR/deploy/.env 设置 ADMIN_TOKEN"
fi
sudo rm -f /tmp/laikedixiong.env.example

echo -e "\033[0;32m  ✓ systemd 配置完成\033[0m"
ENDSSH

# ─── Step 5: 启动服务 ───
echo -e "${YELLOW}[5/5] 启动服务...${NC}"
ssh "${SERVER_USER}@${SERVER_IP}" "
    sudo systemctl stop laikedixiong.service 2>/dev/null || true
    sudo systemctl start laikedixiong.service
    sleep 2
    systemctl status laikedixiong.service --no-pager
"
echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
echo "  访问地址：http://${SERVER_IP}:3002"
echo "  管理后台：http://${SERVER_IP}:3002/admin?token=admin-key-2026"
echo ""
echo "  后续操作："
echo "  1. 配置 Nginx 反向代理：参考 deploy/nginx-laikedixiong.conf"
echo "  2. 修改管理 Token：编辑 /opt/laikedixiong-site/deploy/.env"
echo "  3. 配置通知渠道：编辑 /opt/laikedixiong-site/deploy/.env"
echo "  4. 查看日志：journalctl -u laikedixiong -f"
echo ""
