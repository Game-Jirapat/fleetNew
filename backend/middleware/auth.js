const jwt = require('jsonwebtoken');

// ตรวจสอบว่าเป็น User ที่ล็อกอินแล้ว
exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // ดึงค่าหลังคำว่า 'Bearer '

    if (!token) return res.status(401).json({ message: "Access Denied: No Token Provided" });

    jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid or Expired Token" });
        req.user = user; // เก็บข้อมูล user_id และ role ไว้ใน request
        next();
    });
};

// ตรวจสอบว่าเป็น Admin เท่านั้น
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ message: "Access Denied: Admin Role Required" });
    }
};