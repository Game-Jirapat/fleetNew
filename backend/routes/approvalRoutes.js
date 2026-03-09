const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Admin ทำการ Approve หรือ Reject ใบเสร็จ
router.put('/:id', authenticateToken, isAdmin, approvalController.approveReceipt);

module.exports = router;