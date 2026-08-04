/**
 * 来客兄弟 API - 咨询留资业务层
 */
const contactRepo = require('../data/contact.repo');

function saveContact(data) {
  contactRepo.saveContact(data);
}

module.exports = { saveContact };
