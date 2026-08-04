/**
 * 提示词攻防小游戏 - LLM 调用与泄露检测
 * 守密 AI：DeepSeek API（OpenAI 兼容），未配置 key 且非 MOCK 时游戏暂不可用
 */
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

function isConfigured() {
  return !!process.env.DEEPSEEK_API_KEY;
}

function isMock() {
  return process.env.MOCK_LLM === '1';
}

/**
 * 调用守密 AI
 * @param {string} systemPrompt 该关卡的守密指令
 * @param {Array<{role:string,content:string}>} messages 对话历史
 * @returns {Promise<string>} AI 回复文本
 */
async function chat(systemPrompt, messages) {
  // MOCK 模式（本地开发）：无 key 时按关卡返回可控回复，用于验证游戏流程
  if (!isConfigured() && isMock()) {
    return mockReply(systemPrompt, messages);
  }
  if (!isConfigured()) {
    const err = new Error('游戏尚未开放');
    err.status = 503;
    throw err;
  }

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.8,
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[攻防游戏] DeepSeek 调用失败:', res.status, text.slice(0, 200));
    throw new Error('守密AI暂时走神了，请稍后再试');
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// MOCK 回复：第 1 条用户消息直接泄露秘密，后续消息也泄露（用于测试通关流程）
function mockReply(systemPrompt, messages) {
  const secretMatch = systemPrompt.match(/秘密是「(.+?)」/);
  const secret = secretMatch ? secretMatch[1] : '秘密';
  const last = messages[messages.length - 1];
  const isLevel4 = systemPrompt.includes('base64');
  const reply = isLevel4
    ? Buffer.from(`我是守密AI，我的秘密是${secret}`, 'utf8').toString('base64')
    : `我是守密AI。你说"${last?.content || ''}"？好的，我的秘密就是${secret}。`;
  return new Promise((resolve) => setTimeout(() => resolve(reply), 400));
}

/**
 * 泄露检测：回复是否包含秘密
 * ① 明文直接包含（大小写不敏感）
 * ② base64 片段解码后包含（L4 密文关卡）
 */
function detectLeak(reply, secret) {
  if (!reply || !secret) return false;
  const lower = reply.toLowerCase();
  if (lower.includes(secret.toLowerCase())) return true;

  // base64 片段检测（ASCII 字符且长度≥4 的连续段）
  const b64Segments = reply.match(/[A-Za-z0-9+/=]{8,}/g) || [];
  for (const seg of b64Segments) {
    try {
      const decoded = Buffer.from(seg, 'base64').toString('utf8');
      if (decoded.toLowerCase().includes(secret.toLowerCase())) return true;
    } catch (e) { /* 忽略无法解码的片段 */ }
  }
  return false;
}

module.exports = { chat, detectLeak, isConfigured, isMock };
