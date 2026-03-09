const { Receipts } = require("../models");

// Admin ทำการอนุมัติหรือปฏิเสธใบเสร็จ
exports.approveReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // รับค่า 'Approved' หรือ 'Rejected'

        const receipt = await Receipt.findByPk(id);
        if (!receipt) return res.status(404).json({ message: "Receipt not found" });

        // อัปเดตฟิลด์ approval ตาม ENUM ที่ตั้งไว้
        await receipt.update({ approval: status });

        res.status(200).json({
            message: `Receipt has been ${status}`,
            data: receipt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};