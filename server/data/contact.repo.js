/**
 * 来客兄弟 API - 咨询留资数据仓储层
 */
const { run } = require('./connection');

function saveContact(data) {
  run("INSERT INTO contacts (name, phone, city, source) VALUES (?, ?, ?, ?)",
    [data.name, data.phone, data.city || '', data.source || 'cta']);
}

module.exports = { saveContact };
