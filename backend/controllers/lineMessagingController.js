const line = require("@line/bot-sdk");
const { Users } = require('../models');

const config = {
  channelAccessToken: process.env.TOKEN,
  channelSecret: process.env.SECRETCODE,
};
const client = new line.Client(config);

exports.sendMessageToUser = async (req, res) => {
    try {
        const { userId, message } = req.body; // userId คือ PK จากระบบเรา
        
        // ค้นหาโดยใช้ user_id และดึง line_id มาใช้ (ตาม Diagram ใหม่)
        const user = await Users.findByPk(userId);

        if (!user || !user.line_id) {
            return res.status(404).json({ message: "User not found or LINE not linked." });
        }

        // ส่งข้อความผ่าน LINE SDK
        await client.pushMessage(user.line_id, {
            type: 'text',
            text: message
        });

        res.status(200).json({ message: "Notification sent via LINE." });
    } catch (error) {
        console.error("LINE Push Error:", error);
        res.status(500).json({ error: "Failed to send LINE message." });
    }
};