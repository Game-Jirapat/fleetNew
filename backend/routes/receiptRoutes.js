const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const receiptController = require('../controllers/receiptController');
const { authenticateToken } = require('../middleware/auth');

// 1. [CREATE] อัปโหลดและสแกนใบเสร็จ
// ใช้ key 'image' ตามที่ตั้งไว้ในหน้า UploadReceipt.jsx
router.post('/upload', authenticateToken, upload.single('image'), receiptController.processReceipt);

// 2. [READ ALL] ดึงรายการใบเสร็จทั้งหมด (สำหรับหน้า Admin/Dashboard)
router.get('/', authenticateToken, receiptController.getAllReceipts);
router.get("/:id", receiptController.getReceiptById);
// 3. [UPDATE] อัปเดตสถานะการตรวจสอบ (Approved / Rejected)
// Path: /api/receipts/:id
router.put('/:id', authenticateToken, receiptController.updateReceiptStatus);

// 4. [DELETE] ลบใบเสร็จ
router.delete('/:id', authenticateToken, receiptController.deleteReceipt);

module.exports = router;