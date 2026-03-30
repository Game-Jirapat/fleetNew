'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('receipts', 'receipt_type', {
      type: Sequelize.ENUM('1', '2'),
      allowNull: false,
      defaultValue: '1',
      comment: '1: PTT, 2: Bangchak'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('receipts', 'receipt_type');
    // หมายเหตุ: การลบ ENUM type ใน PostgreSQL อาจต้องใช้คำสั่ง SQL เพิ่มเติมหากต้องการลบ Type ออกจากระบบด้วย
  }
};