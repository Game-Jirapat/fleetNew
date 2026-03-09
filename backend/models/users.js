'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Users.init(
    {
      user_id: { // เพิ่มคอลัมน์ id เป็น primary key แบบ auto-increment
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      line_user_id: { // lineuserid สำหรับผู้ใช้ที่ลงทะเบียนผ่าน LINE
        type: DataTypes.STRING,
        allowNull: true, // true เพื่อรองรับ admin ที่ไม่มี LINE
        unique: true,
      },
      name: { // ชื่อผู้ใช้
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true, // กำหนดให้เป็น true เพื่อให้ผู้ใช้ LINE ไม่จำเป็นต้องมีรหัสผ่าน
      },
      role: {
        type: DataTypes.ENUM('Admin', 'User'),
        allowNull: false,
        defaultValue: 'User'
      },
    },
    {
      sequelize,
      modelName: "Users",
      underscored: true,
      timestamps: true,
    }
  );
  return Users;
};