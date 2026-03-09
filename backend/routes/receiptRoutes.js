const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const receiptController = require('../controllers/receiptController');
const { authenticateToken } = require('../middleware/auth');

// ใช้ upload.single('image') โดย 'image' คือชื่อ Key ที่ส่งมาจาก React
router.post('/upload', authenticateToken, upload.single('image'), receiptController.processReceipt);

module.exports = router;