// seeders/XXXXXXXXXXXXXX-default-const.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('consts', [{
      egat_address_th: '53 หมู่ 2 ถนนจรัญสนิทวงศ์ ตำบลบางกรวย อำเภอบางกรวย จังหวัดนนทบุรี 11130',
      egat_address_eng: 'ELECTRICITY GENERATING AUTHORITY OF THAILAND 53 Moo 2 CharanSanitWong Road, BangKruai, Nonthaburi 11130',
      egat_tax_id: '0994000244843',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('consts', null, {});
  }
};