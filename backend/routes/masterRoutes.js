const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ดึงค่าคงที่ (ทุกคนที่ล็อกอินดูได้)
router.get('/', authenticateToken, masterController.getConstants);

// อัปเดตค่าคงที่ (Admin เท่านั้น)
router.put('/', authenticateToken, isAdmin, masterController.updateConstants);

module.exports = router;