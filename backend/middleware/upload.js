const multer = require('multer');

// เก็บไฟล์ไว้ใน Memory (Buffer) เพื่อส่งต่อไปยัง Python/PHP
const storage = multer.memoryStorage();

// ตรวจสอบประเภทไฟล์
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // จำกัด 5MB
});

module.exports = upload;