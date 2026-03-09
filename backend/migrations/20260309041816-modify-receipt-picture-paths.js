'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * เปลี่ยนชนิดข้อมูลเป็น TEXT เพื่อรองรับ Base64 หรือ URL ที่มีความยาวมาก
     */
    await queryInterface.changeColumn('receipts', 'og_pic', {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: "Path to original picture"
    });

    await queryInterface.changeColumn('receipts', 'framed_pic', {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: "Path to processed/framed picture"
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * กรณีต้องการ Rollback กลับเป็น VARCHAR(255) 
     * (ระวัง: หากมีข้อมูล Base64 อยู่ ข้อมูลอาจจะถูกตัดทอนจนเสียหาย)
     */
    await queryInterface.changeColumn('receipts', 'og_pic', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    await queryInterface.changeColumn('receipts', 'framed_pic', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  }
};