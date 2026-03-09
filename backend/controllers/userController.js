const { Users } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Register (สำหรับสร้าง Admin หรือ User แบบ Manual)
exports.register = async (req, res) => {
    try {
        const { name, password, line_id, role } = req.body;

        // ตรวจสอบว่ามี user นี้หรือยัง
        const existingUser = await User.findOne({ where: { name } });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
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
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: "Token is required." });
    }

    try {
        // 1. ตรวจสอบโทเคนที่ได้จาก LINE Link
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 2. ค้นหาผู้ใช้ (ใช้ user_id ตาม Schema ใหม่)
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // 3. สร้าง Session Token ใหม่ (7 วัน) 
        // ใส่ข้อมูล user_id และ role ให้ตรงกับ Schema ใหม่
        const sessionToken = jwt.sign(
            { id: user.user_id, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 4. ส่งกลับไปให้ Frontend
        res.status(200).json({
            success: true,
            message: "Magic login successful.",
            token: sessionToken,
            user: {
                id: user.user_id,
                role: user.role,
                name: user.name
            }
        });

    } catch (error) {
        console.error('Magic link verification failed:', error.message);
        res.status(401).json({
            success: false,
            message: 'ลิงก์หมดอายุหรือข้อมูลไม่ถูกต้อง กรุณาขอลิงก์ใหม่จาก LINE'
        });
    }
};

// 4. Get User Profile (ดึงข้อมูลตัวเอง)
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.user_id, {
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
        const users = await User.findAll({
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
        const user = await User.findByPk(req.params.id, {
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
        const user = await User.findByPk(req.params.id);

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
        const deleted = await User.destroy({
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