const { spawn } = require("child_process");
const path = require("path");
const { Receipts, Users } = require("../models");
const axios = require("axios");
const FormData = require("form-data");

const PHP_API_URL = "https://ecar.egat.co.th//up_pic/upload.php";

// [CREATE] - ประมวลผลและบันทึกใบเสร็จ
exports.processReceipt = async (req, res) => {
  console.log("=== [START] Processing Receipt ===");

  // 1. ตรวจสอบไฟล์ที่อัปโหลด
  if (!req.file) {
    console.error("❌ Error: No image file received in request.");
    return res.status(400).json({ error: "No image file uploaded." });
  }

  const userId = req.user?.user_id || 1; // ใช้ user_id ตาม Schema ใหม่ [cite: 1]
  const receiptType = req.body.type || '1'; // '1' สำหรับ Thermal, '2' สำหรับ A4
  const receiptImageBuffer = req.file.buffer;
  const originalFilename = req.file.originalname;

  console.log(`📸 File: ${originalFilename} | Type: ${receiptType} | Users: ${userId}`);

  try {
    // --- STEP 1: Upload to PHP Storage (ได้ URL รูปต้นฉบับ) ---
    console.log("🛰️ Step 1: Uploading to PHP API...");
    const phpFormData = new FormData();
    phpFormData.append("image", receiptImageBuffer, {
      filename: originalFilename,
      contentType: req.file.mimetype,
    });

    const uploadResponse = await axios.post(PHP_API_URL, phpFormData, {
      headers: phpFormData.getHeaders(),
      timeout: 30000,
    });

    const og_pic_url = uploadResponse.data.imageUrl;
    console.log(`✅ Image uploaded to PHP: ${og_pic_url}`);

    // --- STEP 2: Process with Python OCR ---
    console.log("🐍 Step 2: Starting Python OCR...");
    const pythonScriptPath = path.join(__dirname, "..", "ocr_processor.py");
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    const pythonProcess = spawn(pythonCommand, [
      pythonScriptPath,
      originalFilename,
      receiptType
    ]);

    let pythonData = "";
    let pythonError = "";

    pythonProcess.stdout.on("data", (data) => { pythonData += data.toString(); });
    pythonProcess.stderr.on("data", (data) => { pythonError += data.toString(); });

    // ส่ง Buffer รูปภาพเข้า Python ทาง stdin
    pythonProcess.stdin.write(receiptImageBuffer);
    pythonProcess.stdin.end();

    pythonProcess.on("close", async (code) => {
      console.log(`🏁 Python process exited with code: ${code}`);

      if (code !== 0) {
        console.error("❌ Python Error:", pythonError);
        return res.status(500).json({ error: "Python OCR failed", details: pythonError });
      }

      try {
        const parsedResult = JSON.parse(pythonData);
        console.log("📝 OCR Parsed Data:", parsedResult.parsed_data);

        // --- STEP 3: Save to PostgreSQL (New Schema) ---
        console.log("💾 Step 3: Saving to Database...");

        // จัดการวันที่ให้เป็น Format ที่ DB ยอมรับ (YYYY-MM-DD)
        const billDate = parsedResult.parsed_data?.transactionDate || new Date();

        const newReceipt = await Receipts.create({
          user_id: userId,
          license_plate_no: parsedResult.parsed_data?.plateNo || "Unknown",
          bill_date: parsedResult.parsed_data?.transactionDate || new Date(),
          og_pic: og_pic_url,// URL จาก PHP
          framed_pic: parsedResult.debug_image,// Base64 หรือ Path รูปตีกรอบจาก Python
          approval: 'Pending'// ค่าเริ่มต้นตาม ENUM ใหม่ 
        });

        console.log(`✨ Receipt saved! ID: ${newReceipt.receipt_id}`);

        // 4. ส่งผลลัพธ์กลับไปให้ React Frontend
        res.status(200).json({
          message: "Receipt processed and saved successfully!",
          data: newReceipt, // ข้อมูลที่บันทึกลง DB
          parsed_data: parsedResult.parsed_data, // ข้อมูลดิบจาก OCR สำหรับหน้า Preview
          debug_image: parsedResult.debug_image  // รูปตีกรอบให้ User ดู 
        });

      } catch (jsonErr) {
        console.error("❌ JSON Parse Error:", jsonErr.message);
        console.error("Raw Python Output:", pythonData);
        res.status(500).json({ error: "Failed to parse OCR results", details: jsonErr.message });
      }
    });

  } catch (error) {
    console.error("❌ Controller Fatal Error:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

// [READ ALL] - ดึงรายการทั้งหมดพร้อมข้อมูล User
exports.getAllReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.findAll({
      order: [['created_at', 'DESC']],
      include: [{
        model: Users,
        as: 'user',
        attributes: ['user_id', 'name', 'role']
      }]
    });
    res.status(200).json(receipts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
};

// [UPDATE] - แก้ไขสถานะ (Admin Approve/Reject)
exports.updateReceiptStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval } = req.body; // 'Approved' หรือ 'Rejected'

    const receipt = await Receipts.findByPk(id);
    if (!receipt) return res.status(404).json({ error: "Receipt not found" });

    await receipt.update({ approval });
    res.status(200).json({ message: "Status updated", data: receipt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [DELETE]
exports.deleteReceipt = async (req, res) => {
  try {
    const deleted = await Receipts.destroy({ where: { receipt_id: req.params.id } });
    if (deleted) res.status(200).json({ message: "Deleted successfully" });
    else res.status(404).json({ error: "Not found" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};