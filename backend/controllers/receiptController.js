require("dotenv").config();
const { spawn } = require("child_process");
const path = require("path");
const { Receipts, Users } = require("../models");
const axios = require("axios");
const FormData = require("form-data");

const PHP_API_URL = process.env.PHP_API_URL;

const uploadToPHP = async (buffer, filename, mimetype) => {
  const formData = new FormData();
  formData.append("image", buffer, { filename, contentType: mimetype });

  const response = await axios.post(PHP_API_URL, formData, {
    headers: formData.getHeaders(),
    timeout: 30000,
  });
  return response.data.imageUrl;
};

// [CREATE] - ประมวลผลและบันทึกใบเสร็จ
exports.processReceipt = async (req, res) => {
  try {
    const userId = req.user?.user_id || 1;
    const originalBuffer = req.file.buffer;
    const originalName = req.file.originalname;

    // ✅ 1. เพิ่มการประกาศตัวแปร receiptType (รับจาก Frontend หรือ Default เป็น '1')
    const receiptType = req.body.type || '1';

    // --- STEP 1: Upload Original Image ---
    console.log("🛰️ Step 1: Uploading Original to PHP...");
    const og_pic_url = await uploadToPHP(originalBuffer, originalName, req.file.mimetype);

    // --- STEP 2: Process with Python OCR ---
    console.log("🐍 Step 2: Starting Python OCR...");
    const pythonScriptPath = path.join(__dirname, "..", "ocr_processor.py");
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    // ✅ 2. แก้ไขให้ใช้ originalBuffer แทน receiptImageBuffer ที่ไม่ได้ประกาศไว้
    const pythonProcess = spawn(pythonCommand, [
      pythonScriptPath,
      originalName,
      receiptType
    ]);

    let pythonData = "";
    let pythonError = "";

    pythonProcess.stdout.on("data", (data) => { pythonData += data.toString(); });
    pythonProcess.stderr.on("data", (data) => { pythonError += data.toString(); });

    // ส่ง Buffer รูปภาพเข้า Python ทาง stdin
    pythonProcess.stdin.write(originalBuffer);
    pythonProcess.stdin.end();

    pythonProcess.on("close", async (code) => {
      if (code !== 0) return res.status(500).json({ error: "Python failed", details: pythonError });

      try {
        const parsedResult = JSON.parse(pythonData);
        const ocr = parsedResult.parsed_data;
        const framedBase64 = parsedResult.debug_image;

        let framed_pic_url = og_pic_url; // ✅ ตั้งค่า Default เป็นรูปต้นฉบับ (Fallback)

        // ถ้ามี Base64 ส่งมาจาก Python จริง ถึงจะทำการอัปโหลด
        if (framedBase64 && framedBase64.length > 0) {
          console.log("🛰️ Step 3: Uploading Framed image to PHP...");
          try {
            const framedBuffer = Buffer.from(framedBase64, 'base64');
            framed_pic_url = await uploadToPHP(
              framedBuffer,
              `framed_${originalName}`,
              'image/jpeg'
            );
          } catch (uploadErr) {
            console.warn("⚠️ Warning: Framed upload failed, using original pic instead.");
          }
        }

        let billDate = new Date(); // Default เป็นวันที่ปัจจุบันหากอ่านไม่ออก
        if (ocr?.bill_date && ocr.bill_date !== "null") {
          const checkDate = new Date(ocr.bill_date);
          if (!isNaN(checkDate.getTime())) {
            billDate = checkDate;
          }
        }
        // --- STEP 4: Save to Database ---
        // ตอนนี้ framed_pic_url จะมีค่าเสมอ (ไม่เป็น URL ใหม่ ก็เป็น URL เดิม)
        const newReceipt = await Receipts.create({
          user_id: userId,
          license_plate_no: ocr?.license_plate_no || "Unknown",
          bill_date: billDate,
          og_pic: og_pic_url,
          framed_pic: framed_pic_url,
          approval: 'Pending'
        });

        console.log(`✨ Receipt saved! ID: ${newReceipt.receipt_id}`);

        res.status(200).json({
          message: "Receipt processed and saved successfully!",
          data: newReceipt,
          parsed_data: ocr,
          debug_image: parsedResult.debug_image
        });

      } catch (jsonErr) {
        console.error("❌ JSON/Processing Error:", jsonErr.message);
        res.status(500).json({ error: "Processing failed", details: jsonErr.message });
      }
    });

  } catch (error) {
    console.error("❌ Controller Fatal Error:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

// [READ ONE] - ดึงข้อมูลใบเสร็จใบเดียวตาม ID
exports.getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipts.findByPk(id, {
      include: [{
        model: Users,
        as: 'users',
        attributes: ['user_id', 'name', 'role']
      }]
    });

    if (!receipt) {
      return res.status(404).json({ error: "ไม่พบข้อมูลใบเสร็จนี้" });
    }

    res.status(200).json(receipt);
  } catch (error) {
    console.error("❌ Get Receipt Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// [READ ALL] - ดึงรายการทั้งหมดพร้อมข้อมูล User
exports.getAllReceipts = async (req, res) => {
  try {
    // รับค่า page และ limit จาก query string (เช่น ?page=1&limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // ✅ ใช้ findAndCountAll เพื่อให้ได้ทั้งข้อมูลและจำนวนทั้งหมด
    const { count, rows } = await Receipts.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit: limit,
      offset: offset,
      include: [{
        model: Users,
        as: 'users',
        attributes: ['user_id', 'name', 'role']
      }]
    });

    res.status(200).json({
      receipts: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [UPDATE 1] - สำหรับ Admin อัปเดตสถานะ (Approve/Reject) เท่านั้น
exports.updateApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval } = req.body;

    const receipt = await Receipts.findByPk(id);
    if (!receipt) return res.status(404).json({ error: "ไม่พบข้อมูลใบเสร็จ" });

    await receipt.update({ approval }); // อัปเดตเฉพาะสถานะ

    res.status(200).json({
      message: `เปลี่ยนสถานะเป็น ${approval} สำเร็จ`,
      data: receipt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [UPDATE 2] - สำหรับบันทึก/แก้ไขข้อมูลใบเสร็จ (ทะเบียนรถ และ วันที่)
exports.updateReceiptData = async (req, res) => {
  try {
    const { id } = req.params;
    // รับแค่ 2 ตัวแปรตามที่คุณกำหนด
    const { license_plate_no, bill_date } = req.body;

    const receipt = await Receipts.findByPk(id);
    if (!receipt) return res.status(404).json({ error: "ไม่พบข้อมูลใบเสร็จ" });

    let finalBillDate = receipt.bill_date; // ค่าเริ่มต้นเป็นค่าเดิมใน DB

    if (bill_date) {
      let dateObj = new Date(bill_date);

      if (!isNaN(dateObj.getTime())) {
        let year = dateObj.getFullYear();

        // 🛡️ Logic ตรวจสอบปี: ถ้าเป็น พ.ศ. ( > 2400) ให้ลบ 543 เพื่อเป็น ค.ศ.
        if (year > 2400) {
          year = year - 543;
          dateObj.setFullYear(year);
        }
        finalBillDate = dateObj;
      }
    }

    // อัปเดตข้อมูล
    await receipt.update({
      license_plate_no: license_plate_no || receipt.license_plate_no,
      bill_date: finalBillDate
    });

    res.status(200).json({
      message: "บันทึกข้อมูลสำเร็จ",
      data: receipt
    });
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