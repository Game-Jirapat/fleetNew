'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('users', {
            user_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            line_user_id: {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            password: {
                type: Sequelize.STRING,
                allowNull: true
            },
            role: {
                type: Sequelize.ENUM('Admin', 'User'),
                allowNull: false,
                defaultValue: 'User'
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
        await queryInterface.dropTable('users');
        // ลบประเภท ENUM ออกด้วยเมื่อ rollback (เฉพาะ Postgres)
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
    }
};