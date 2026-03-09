"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Const extends Model {
    static associate(models) {
      // No direct associations
    }
  }
  Const.init(
    {
      const_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      egat_address_th: { // EGAT's address in Thai
        type: DataTypes.TEXT,
        allowNull: false,
      },
      egat_address_eng: { // EGAT's address in English
        type: DataTypes.TEXT,
        allowNull: false,
      },
      egat_tax_id: { // EGAT's tax ID
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Const",
      underscored: true,
    }
  );
  return Const;
};
