const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// --- Public ---
router.post('/login', userController.login);
router.post('/register', userController.register);
router.post('/magic-login', userController.magicLogin);

// --- Protected (ต้อง Login เท่านั้น) ---
router.get('/profile', authenticateToken, userController.getProfile);

// --- Admin Only (ต้อง Login และเป็น Admin) ---
router.get('/', authenticateToken, isAdmin, userController.getAllUsers);
router.get('/:id', authenticateToken, isAdmin, userController.getUserById);
router.put('/:id', authenticateToken, isAdmin, userController.updateUser);
router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);

module.exports = router;