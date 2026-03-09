const { Const } = require("../models");

// ดึงค่าคงที่ทั้งหมด (ปกติจะมีแค่ 1 record)
exports.getConstants = async (req, res) => {
  try {
    const data = await Const.findOne();
    if (!data) return res.status(404).json({ message: "Constants not found" });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// อัปเดตค่าคงที่ (สำหรับ Admin แก้ไขที่อยู่/Tax ID)
exports.updateConstants = async (req, res) => {
  try {
    const { egatAddressTH, egatAddressENG, egatTaxId } = req.body;
    let data = await Const.findOne();

    if (data) {
      await data.update({ egatAddressTH, egatAddressENG, egatTaxId });
    } else {
      data = await Const.create({ egatAddressTH, egatAddressENG, egatTaxId });
    }
    res.status(200).json({ message: "Constants updated", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};