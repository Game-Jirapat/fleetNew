'use strict';
const bcrypt = require('bcryptjs'); // อย่าลืม npm install bcryptjs

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // เข้ารหัส password ก่อนเก็บลง DB
    const hashedPassword = await bcrypt.hash('admin1234', 10);

    return queryInterface.bulkInsert('users', [{
      name: 'SystemAdmin',
      password: hashedPassword,
      line_user_id: null,
      role: 'Admin',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('users', { role: 'Admin' }, {});
  }
};