const { Users } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Register (สำหรับสร้าง Admin หรือ User แบบ Manual)
exports.register = async (req, res) => {
    try {
        const { name, password, line_id, role } = req.body;

        // ตรวจสอบว่ามี user นี้หรือยัง
        const existingUser = await Users.findOne({ where: { name } });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await Users.create({
            name,
            password: hashedPassword,
            line_id,
            role: role || 'User' // ตาม ENUM ที่เราตั้งไว้
        });

        res.status(201).json({ message: "User created successfully", userId: newUser.user_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Login (สำหรับ Admin/User เข้าสู่ระบบผ่านหน้าเว็บ)
exports.login = async (req, res) => {
    try {
        const { name, password } = req.body;

        const user = await Users.findOne({ where: { name } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // สร้าง JWT Token
        const token = jwt.sign(
            { user_id: user.user_id, role: user.role },
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Magic Login (แลก Token จาก LINE เป็น Session Token)
exports.magicLogin = async (req, res) => {
    try {
        const { token } = req.body; // Token จาก URL
        if (!token) return res.status(400).json({ message: "ไม่พบโทเค็น" });

        // 1. ตรวจสอบ Token ที่ส่งมาจาก LINE
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 2. ค้นหา User ในระบบ
        const user = await Users.findByPk(decoded.user_id);
        if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้งานในระบบ" });

        // 3. สร้าง Auth Token ชุดใหม่สำหรับใช้ในระบบ (Session จริง)
        const authToken = jwt.sign(
            { user_id: user.user_id, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            token: authToken, // ส่งกลับไปให้ Frontend เก็บลง LocalStorage
            user: { user_id: user.user_id, name: user.name, role: user.role }
        });
    } catch (error) {
        console.error("Magic Login Error:", error);
        res.status(401).json({ message: "ลิงก์หมดอายุหรือไม่ถูกต้อง" });
    }
};

// 4. Get User Profile (ดึงข้อมูลตัวเอง)
exports.getProfile = async (req, res) => {
    try {
        const user = await Users.findByPk(req.user.user_id, {
            attributes: { exclude: ['password'] } // ไม่ส่ง password กลับไป
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [READ ALL] - สำหรับ Admin ดูรายชื่อผู้ใช้ทั้งหมด
exports.getAllUsers = async (req, res) => {
    try {
        const users = await Users.findAll({
            attributes: { exclude: ['password'] }, // ไม่ส่ง password ออกไปเพื่อความปลอดภัย
            order: [['user_id', 'ASC']]
        });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// [READ ONE] - ดูรายละเอียดผู้ใช้รายบุคคล
exports.getUserById = async (req, res) => {
    try {
        const user = await Users.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// [UPDATE] - Admin แก้ไขข้อมูลผู้ใช้ (เช่น เปลี่ยน Role หรือชื่อ)
exports.updateUser = async (req, res) => {
    try {
        const { name, role, line_id } = req.body;
        const user = await Users.findByPk(req.params.id);

        if (!user) return res.status(404).json({ message: "User not found" });

        await user.update({ name, role, line_id });
        res.json({ success: true, message: "User updated successfully", data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// [DELETE] - Admin ลบผู้ใช้
exports.deleteUser = async (req, res) => {
    if (parseInt(req.params.id) === req.user.user_id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
    }
    try {
        const deleted = await Users.destroy({
            where: { user_id: req.params.id }
        });
        if (deleted) {
            res.json({ success: true, message: "User deleted successfully" });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};