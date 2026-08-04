/**
 * 来客兄弟 API - 含AI量检测业务层
 */
const aiTestRepo = require('../data/aiTest.repo');

function saveAiTest(data) {
  aiTestRepo.saveAiTest(data);
}

module.exports = { saveAiTest };
