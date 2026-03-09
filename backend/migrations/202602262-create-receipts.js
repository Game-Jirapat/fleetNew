'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('receipts', {
      receipt_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // ชื่อตารางเป้าหมาย
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      license_plate_no: {
        type: Sequelize.STRING,
        allowNull: false
      },
      bill_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      og_pic: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      framed_pic: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      approval: {
        type: Sequelize.ENUM('Pending', 'Approved', 'Rejected'),
        allowNull: false,
        defaultValue: 'Pending'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('receipts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_receipts_approval";');
  }
};