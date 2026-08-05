/**
 * 用户业务逻辑：注册 / 登录
 */
const bcrypt = require('bcryptjs');
const userRepo = require('../data/user.repo');
const { sign } = require('../auth/jwt');

const SALT_ROUNDS = 10;

/**
 * 注册：手机号 + 姓名 + 密码
 * 返回 { token, user }
 */
function register({ phone, name, password }) {
  const existing = userRepo.findByPhone(phone);
  if (existing) {
    const err = new Error('该手机号已注册，请直接登录');
    err.status = 409;
    throw err;
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const user = userRepo.create({ phone, name, passwordHash });
  return {
    token: sign({ id: user.id, phone: user.phone, name: user.name }),
    user: { id: user.id, phone: user.phone, name: user.name },
  };
}

/**
 * 登录：手机号 + 密码
 * 返回 { token, user }
 */
function login({ phone, password }) {
  const user = userRepo.findByPhone(phone);
  if (!user) {
    const err = new Error('该手机号未注册');
    err.status = 404;
    throw err;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    const err = new Error('密码错误');
    err.status = 401;
    throw err;
  }

  return {
    token: sign({ id: user.id, phone: user.phone, name: user.name }),
    user: { id: user.id, phone: user.phone, name: user.name },
  };
}

module.exports = { register, login };
