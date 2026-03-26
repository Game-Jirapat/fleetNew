const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const receiptController = require('../controllers/receiptController');
const { authenticateToken } = require('../middleware/auth');

// 1. [CREATE] อัปโหลดและประมวลผล OCR
// ใช้ key 'image' ในการรับไฟล์รูปภาพ
router.post('/upload', authenticateToken, upload.single('image'), receiptController.processReceipt);

// 2. [READ] ดึงข้อมูลใบเสร็จ
router.get('/', authenticateToken, receiptController.getAllReceipts); // ทั้งหมด
router.get("/:id", authenticateToken, receiptController.getReceiptById); // รายใบ
// GET /api/receipts/user/1
router.get('/user/:userId', authenticateToken, receiptController.getReceiptsByUserId);

// 3. [UPDATE - DATA] บันทึกข้อมูลทะเบียนและวันที่ (สำหรับขั้นตอนยืนยัน/แก้ไข)
// Path: /api/receipts/:id/data
router.put('/:id/data', authenticateToken, receiptController.updateReceiptData);

// 4. [UPDATE - STATUS] อัปเดตสถานะการอนุมัติ (สำหรับ Admin)
// Path: /api/receipts/:id/status
router.patch('/:id/status', authenticateToken, receiptController.updateApprovalStatus);

// 5. [DELETE] ลบใบเสร็จ
router.delete('/:id', authenticateToken, receiptController.deleteReceipt);

module.exports = router;