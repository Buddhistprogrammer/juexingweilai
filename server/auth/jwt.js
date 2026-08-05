/**
 * JWT 工具模块
 * — token 有效期 7 天
 * — SECRET 可从环境变量 JWT_SECRET 注入，默认自动生成（重启后旧 token 失效）
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const EXPIRES_IN = '7d';

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verify(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };
