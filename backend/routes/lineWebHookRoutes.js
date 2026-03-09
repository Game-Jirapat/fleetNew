const express = require("express");
const line = require("@line/bot-sdk");
const router = express.Router();
const { User } = require('../models');
const jwt = require('jsonwebtoken');

// LINE Bot SDK Configuration
const config = {
    channelAccessToken: process.env.TOKEN,
    channelSecret: process.env.SECRETCODE,
};
const client = new line.Client(config);

// Handle LINE webhook events
// ส่วนหนึ่งของ handleEvent ใน lineWebHookRoutes.js
async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') return null;

    const lineIdFromEvent = event.source.userId;

    // ค้นหา/สร้าง User โดยใช้ line_id (ตาม Schema ใหม่)
    let user = await User.findOne({ where: { line_id: lineIdFromEvent } });

    if (!user) {
        user = await User.create({
            line_id: lineIdFromEvent,
            name: `LINE User ${lineIdFromEvent.substring(0, 5)}`,
            role: 'User' // ค่าเริ่มต้นตาม ENUM
        });
    }

    // สร้าง Token โดยใช้ user_id (ตาม Diagram ใหม่)
    const token = jwt.sign(
        { user_id: user.user_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const dashboardUrl = `${process.env.FRONTEND_URL}/magic-login?token=${token}`;

    const responseMessage = {
        type: 'text',
        text: `เข้าสู่ระบบ Dashboard ของคุณได้ที่นี่:\n${dashboardUrl}`
    };

    return client.replyMessage(event.replyToken, responseMessage);
}

// Webhook endpoint
router.post('/', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

module.exports = router;