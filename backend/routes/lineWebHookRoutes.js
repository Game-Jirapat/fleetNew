const express = require("express");
const line = require("@line/bot-sdk");
const router = express.Router();
const { Users } = require('../models');
const jwt = require('jsonwebtoken');

// ✅ 1. ใช้ MessagingApiClient แทน Client เดิมที่ Deprecated
const { messagingApi } = require('@line/bot-sdk');
const { MessagingApiClient } = messagingApi;

const config = {
    channelAccessToken: process.env.TOKEN,
    channelSecret: process.env.SECRETCODE,
};

// ✅ 2. สร้าง Client ด้วย Class ใหม่
const client = new MessagingApiClient({
    channelAccessToken: config.channelAccessToken
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return null;
    }

    const lineUserId = event.source.userId;
    let responseMessageText;

    try {
        // ✅ 3. ตรวจสอบชื่อ Field ใน Database (ใน Model คุณใช้ line_id หรือ lineUserId?)
        // สมมติว่าใช้ line_id ตามมาตรฐานที่คุยกันก่อนหน้า
        let user = await Users.findOne({ where: { line_user_id: lineUserId } });

        if (!user) {
            user = await Users.create({
                line_user_id: lineUserId,
                name: `User-${lineUserId.substring(0, 6)}`, // ตั้งชื่อเบื้องต้น
                role: 'User'
            });
            responseMessageText = `สวัสดีครับ! ระบบได้ลงทะเบียนคุณแล้ว คลิกเพื่อเข้าสู่ระบบ:`;
        } else {
            responseMessageText = `สวัสดีครับ! นี่คือลิงก์เข้าสู่ Dashboard ของคุณ:`;
        }

        // ✅ 4. สร้าง Token โดยใช้ Secret จาก .env
        const token = jwt.sign(
            { user_id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // ✅ 5. ใช้ FRONTEND_URL จาก .env แทนการ Hardcode localhost
        const dashboardUrl = `${process.env.FRONTEND_URL}/magic-login?token=${token}`;
        const finalMessage = `${responseMessageText}\n\n${dashboardUrl}`;

        // ✅ 6. ปรับการเรียก replyMessage ให้เป็นแบบ Object (v9 Style)
        return await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: finalMessage }]
        });

    } catch (error) {
        console.error("Error in handleEvent:", error);
        return null;
    }
}

// ✅ 7. Middleware ตรวจสอบ Signature ยังคงใช้แบบเดิมได้
router.post('/', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error("Webhook Error:", err);
            res.status(500).end();
        });
});

module.exports = router;