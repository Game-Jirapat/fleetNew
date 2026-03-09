'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('consts', {
      const_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      egat_address_th: { // ตรงตาม underscored: true ใน model
        type: Sequelize.TEXT,
        allowNull: false
      },
      egat_address_eng: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      egat_tax_id: {
        type: Sequelize.STRING,
        allowNull: false
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
    await queryInterface.dropTable('consts');
  }
};