"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Receipts extends Model {
    static associate(models) {
      // Receipt belongs to a User (FK: user_id ในรูป)
      Receipts.belongsTo(models.Users, {
        foreignKey: "user_id",
        as: "users",
      });
    }
  }

  Receipts.init(
    {
      //(PK)
      receipt_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      //(FK)
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "user_id",
        },
      },
      //license_plate_no
      license_plate_no: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      //bill_date
      bill_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      //og_pic
      og_pic: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Path to original picture",
      },
      //framed_pic path
      framed_pic: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Path to processed/framed picture",
      },
      //approval
      approval: {
        type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
        allowNull: false,
        defaultValue: "Pending",
      },
    },
    {
      sequelize,
      modelName: "Receipts",
      underscored: true,
      timestamps: true,
    }
  );

  return Receipts;
};