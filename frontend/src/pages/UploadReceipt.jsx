import React, { useState, useRef, useCallback, useMemo } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import api from '../api/axios';
import { UploadCloud, Crop as CropIcon, Search, AlertCircle, FileText } from 'lucide-react';

// ฟังก์ชัน Helper สำหรับสร้าง Aspect Ratio (ถ้าต้องการ Fix เช่น 3:4)
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth, mediaHeight
  );
}

const UploadReceipt = () => {
  const [imgSrc, setImgSrc] = useState(''); // รูปต้นฉบับ (Base64)
  const [crop, setCrop] = useState(); // สถานะการ Crop
  const [completedCrop, setCompletedCrop] = useState(); // Area ที่ Crop เสร็จแล้ว
  const imgRef = useRef(null); // อ้างอิงถึง Element รูปภาพ

  const [result, setResult] = useState(null); // ผลลัพธ์จาก API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. เลือกไฟล์และแสดงรูปต้นฉบับ
  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Reset Crop เก่า
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // 2. เมื่อรูปโหลดเสร็จ (ตั้งค่า Crop เริ่มต้น)
  const onImageLoad = (e) => {
    // const { width, height } = e.currentTarget;
    // setCrop(centerAspectCrop(width, height, 16 / 9)); // ถ้าอยาก Fix Aspect
  };

  // 3. ฟังก์ชัน Helper สำหรับแปลง Canvas เป็นไฟล์รูป (Blob)
  const getCroppedImg = (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  // 4. ส่งรูปที่ Crop แล้วไปประมวลผล (Upload & Scan)
  const handleUploadAndScan = async () => {
    if (!completedCrop || !imgRef.current) return alert("กรุณาเลือกรูปและพื้นที่ใบเสร็จ");

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // ได้ไฟล์รูปที่ Crop แล้วเป็น Blob
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      const file = new File([croppedBlob], "receipt.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', '1'); // Default Thermal ตาม Schema

      // ยิง API (backend/controllers/receiptController.js)
      const response = await api.post('/receipts/upload', formData);

      // Backend จะส่งข้อมูลตาม Schema ใหม่กลับมา
      setResult(response.data);

      // ใน UploadReceipt.jsx
    } catch (err) {
      console.error("Full Error Response:", err.response?.data); // ดู Error รายละเอียดจาก Backend
      setError(err.response?.data?.error || "เกิดข้อผิดพลาดที่ระบบหลังบ้าน");
    } finally {
      setLoading(false);
    }
  };

  // แสดงผลสถานะใบเสร็จ (Approval)
  const statusBadge = useMemo(() => {
    if (!result?.data) return null;
    const status = result.data.approval;
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800'
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  }, [result]);

  return (
    <div className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex items-center space-x-3 mb-8 border-b pb-4">
        <FileText className="text-blue-600 w-8 h-8" />
        <h1 className="text-3xl font-bold text-gray-800">อัปโหลดและสแกนใบเสร็จ (กฟผ.)</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* --- ส่วนที่ 1: อัปโหลดและ Crop (เลียนแบบ ScannerPage) --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">เลือกรูปใบเสร็จ</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-200 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                  <UploadCloud className="w-8 h-8 mb-3 text-blue-500" />
                  <p className="mb-2 text-sm text-blue-700"><span className="font-semibold">คลิกเพื่ออัปโหลด</span> หรือลากไฟล์มาวาง</p>
                  <p className="text-xs text-blue-500">PNG, JPG (แนะนำแนวตั้ง)</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={onSelectFile} />
              </label>
            </div>
          </div>

          {imgSrc && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 flex items-center"><CropIcon className="mr-2 w-4 h-4" /> ตัดรูป (Crop)</label>
                <span className="text-xs text-gray-400">กรุณาเลือกเฉพาะพื้นที่ใบเสร็จ</span>
              </div>
              <div className="border-4 border-gray-200 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={c => setCompletedCrop(c)}
                  className="w-full"
                >
                  <img ref={imgRef} src={imgSrc} alt="Original" onLoad={onImageLoad} style={{ maxWidth: '100%' }} />
                </ReactCrop>
              </div>

              <button
                onClick={handleUploadAndScan}
                className="w-full flex justify-center items-center py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition"
                disabled={loading || !completedCrop}
              >
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div> กำลังประมวลผล OCR...</>
                ) : (
                  <><Search className="mr-2 w-5 h-5" /> สแกนใบเสร็จ</>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start">
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* --- ส่วนที่ 2: แสดงผลลัพธ์ (ตาม Database Schema ใหม่) --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-lg font-bold">ผลลัพธ์การสแกน</h2>
            {statusBadge}
          </div>

          {!result && !loading && (
            <div className="text-center py-20 text-gray-400 border-2 border-gray-100 border-dashed rounded-xl">
              <Search className="w-16 h-16 mx-auto mb-4" />
              อัปโหลดและสแกนรูปภาพเพื่อดูข้อมูล
            </div>
          )}

          {loading && (
            <div className="text-center py-20 animate-pulse text-blue-500">
              <FileText className="w-16 h-16 mx-auto mb-4" />
              กำลังรอข้อมูลจาก Backend...
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* ข้อมูลที่จำเป็นตาม Database */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border">
                <div>
                  <label className="text-xs text-gray-500">ทะเบียนรถ</label>
                  <p className="font-bold text-xl">{result.data.license_plate_no || result.parsed_data?.license_plate || 'ไม่พบ'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">วันที่</label>
                  <p className="font-semibold">{new Date(result.data.bill_date).toLocaleDateString('th-TH')}</p>
                </div>
              </div>

              {/* แสดงภาพผลลัพธ์ที่ตีกรอบ (จาก Python Debug) */}
              {result.framed_pic && (
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-700">ภาพที่ผ่านการตีกรอบ (OCR View):</h4>
                  <div className="border-4 border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={result.framed_pic.startsWith('data:') ? result.framed_pic : `data:image/jpeg;base64,${result.framed_pic}`}
                      alt="OCR Debug"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadReceipt;