/**
 * 认证中间件
 * — requireLogin：前端请求需带 Authorization: Bearer <token>
 * — optionalLogin：有 token 则解析挂载 req.user，无则放行（预约时可选登录）
 */
const { verify } = require('./jwt');

function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ success: false, error: '请先登录' });
  }
  try {
    req.user = verify(match[1]);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
  }
}

function optionalLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) {
    try {
      req.user = verify(match[1]);
    } catch (_) {
      // token 无效，不阻止（按未登录处理）
    }
  }
  next();
}

module.exports = { requireLogin, optionalLogin };
