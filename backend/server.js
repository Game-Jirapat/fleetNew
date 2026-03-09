require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./models"); // ดึง Sequelize models มาใช้งาน

// Import Routes (อ้างอิงตามที่คุณมีในโครงสร้างเดิม)
const receiptRoutes = require("./routes/receiptRoutes");
const masterRoutes = require("./routes/masterRoutes");
const userRoutes = require("./routes/userRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const lineWebhookRoutes = require("./routes/lineWebHookRoutes");

const app = express();
const port = process.env.PORT || 8080;

// --- 1. Middleware ---

// Webhook สำหรับ LINE ต้องวางไว้ก่อน express.json() 
// เพราะบางครั้งต้องใช้ raw body ในการตรวจสอบ signature
app.use("/webhook", lineWebhookRoutes);

app.use(cors()); // อนุญาตให้ Frontend (Vite) ยิง API มาได้
app.use(express.json()); // อ่าน body แบบ JSON
app.use(express.urlencoded({ extended: true })); // อ่าน body แบบ URL-encoded

// --- 2. Static Files ---

// เก็บรูปต้นฉบับและรูปที่ Process แล้ว (ปรับชื่อ Folder ให้ตรงกับที่คุณใช้)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/processed_uploads", express.static(path.join(__dirname, "processed_uploads")));

// --- 3. API Routes ---

app.use("/api/users", userRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/approvals", approvalRoutes);

// --- 4. Frontend Integration (Production) ---

// ชี้ไปยัง Folder 'dist' ที่ได้จากการรัน npm run build ใน React/Vite
const distPath = path.join(__dirname, "public"); // หรือ "dist" ตามที่คุณตั้งค่า
app.use(express.static(distPath));

// Fallback: ถ้าไม่ใช่ API route ให้ส่ง index.html กลับไปให้ React Router จัดการ
app.use((req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// --- 5. Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Something went wrong on the server!" 
  });
});

// --- 6. Database Connection & Start Server ---

// ใช้ authenticate() แทน sync() เพราะเราใช้ Migration ในการคุม Schema แล้ว
db.sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Database connected (PostgreSQL)");
    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Unable to connect to the database:", err);
    process.exit(1); // ปิด server ทันทีถ้าต่อ DB ไม่ได้
  });