import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { Upload, Scissors, Cpu, Save, AlertCircle, CheckCircle2, RotateCcw, FileText } from 'lucide-react';
import api from '../api/axios'; // ใช้ api instance ที่เราสร้างไว้
import getCroppedImg from '../utils/cropImage';

const UploadReceipt = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- States ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [receiptType, setReceiptType] = useState('1');
  const [debugImage, setDebugImage] = useState(null);
  const [masterData, setMasterData] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  // --- Cropper States ---
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState('free');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // --- Editable Fields ---
  const [editableFields, setEditableFields] = useState({
    plateNo: '',
    transactionDate: '',
    egatAddress: '',
    egatTaxId: ''
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const response = await api.get('/master');
        setMasterData(response.data);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, []);

  // --- Handlers ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setStatusMessage(`เลือกไฟล์: ${file.name}`);
      setIsError(false);
      setParsedData(null); // Reset ข้อมูลเก่า
      setDebugImage(null);
    }
  };

  const handleProcessOCR = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setStatusMessage('กำลังวิเคราะห์ใบเสร็จด้วย Python OCR...');
    setDebugImage(null); // ล้างรูปเก่าก่อนประมวลผลใหม่

    const formData = new FormData();
    formData.append('image', selectedFile); // Key 'image' ตรงกับ upload.single('image')
    formData.append('type', receiptType);   // ส่งประเภทใบเสร็จ

    try {
      // ✅ Step 2: เรียก API ตาม Route และ Schema ใหม่
      const response = await api.post('/receipts/upload', formData);
      console.log("🔍 Raw Response Data:", response.data);
      const { data, parsed_data, debug_image } = response.data;
      // ✅ แสดงรูปภาพที่ผ่านการประมวลผล (Framed Image)
      // Backend ส่งมาเป็น Base64 เราต้องเติม Prefix เพื่อให้ <img> แสดงผลได้
      if (debug_image) {
        // ตรวจสอบว่าใน String มี Header หรือยัง ถ้ายังไม่มีให้เติมเข้าไป
        const formattedImage = debug_image.startsWith('data:image')
          ? debug_image
          : `data:image/jpeg;base64,${debug_image}`;
        setDebugImage(formattedImage);
      }

      // ✅ Step 3: แมปข้อมูลให้ตรงกับ editableFields ตาม Schema
      const mappedData = {
        dbReceiptId: data.receipt_id,
        plateNo: parsed_data.license_plate_no || '',
        transactionDate: parsed_data.bill_date || '',
        egatTaxId: parsed_data.egat_tax_id || '',
        egatAddress: parsed_data.egat_address || '',
      };

      setParsedData(mappedData);
      setEditableFields(prev => ({ ...prev, ...mappedData }));
      setStatusMessage('วิเคราะห์สำเร็จ! กรุณาตรวจสอบและบันทึกข้อมูล');
    } catch (err) {
      console.error("OCR Error:", err);
      setStatusMessage('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
      setIsError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToDB = async () => {
    try {
      setStatusMessage('กำลังบันทึกข้อมูล...');
      await api.put(`/receipts/${editableFields.dbReceiptId}`, {
        ...editableFields,
        approval: 'Pending'
      });
      setStatusMessage('บันทึกสำเร็จ! ✅');
      setTimeout(() => navigate('/admin/receipts'), 1500);
    } catch (err) {
      setStatusMessage('บันทึกไม่สำเร็จ: ' + err.message);
      setIsError(true);
    }
  };

  // --- Cropper Logic ---
  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);
  const handleCropSave = async () => {
    const croppedBlob = await getCroppedImg(imagePreviewUrl, croppedAreaPixels);
    const croppedFile = new File([croppedBlob], selectedFile.name, { type: 'image/jpeg' });
    setSelectedFile(croppedFile);
    setImagePreviewUrl(URL.createObjectURL(croppedBlob));
    setShowCropper(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-gray-800 mb-8 flex items-center">
          <Upload className="mr-3 text-blue-600" /> Upload & Process Receipt
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Column 1: Upload & Preview */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Scissors size={20} />อัปโหลดและดูตัวอย่าง</h2>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current.click()}
              className="aspect-[4/3] border-4 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-200 transition-all bg-gray-50 overflow-hidden"
            >
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} className="w-full h-full object-contain" alt="Preview" />
              ) : (
                <div className="text-center text-gray-300">
                  <Upload size={48} className="mx-auto mb-2" />
                  <p className="font-medium text-sm">Click to upload</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} hidden onChange={handleImageChange} accept="image/*" />

            {/* Actions */}
            {imagePreviewUrl && (
              <button onClick={() => setShowCropper(true)} className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200">
                <Scissors size={18} /> Crop Image
              </button>
            )}

            {/* Main Action Button */}
            <button
              disabled={!selectedFile || isProcessing}
              onClick={handleProcessOCR}
              className={`w-full mt-4 py-4 rounded-2xl font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                }`}
            >
              {isProcessing ? <><span className="animate-spin text-lg">🌀</span> Processing</> : <><Cpu size={20} /> Start OCR</>}
            </button>
          </div>

          {/* Column 2: Form Data */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="text-black-600" /> ตรวจสอบและยืนยันข้อมูล
            </h2>
            {parsedData && (
              <div className="space-y-6">

                {/* 1. Plate No (ทะเบียนรถ) */}
                <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Plate No (ทะเบียนรถจากใบเสร็จ)</label>
                  <input
                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none font-bold text-gray-700 focus:border-blue-500 transition-all shadow-sm"
                    value={editableFields.plateNo}
                    onChange={(e) => setEditableFields({ ...editableFields, plateNo: e.target.value })}
                  />
                </div>

                {/* 2. Transaction Date (วันที่) */}
                <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">2. Transaction Date (วันที่จากใบเสร็จ)</label>
                  <input
                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none font-bold text-gray-700 focus:border-blue-500 transition-all shadow-sm"
                    value={editableFields.transactionDate}
                    onChange={(e) => setEditableFields({ ...editableFields, transactionDate: e.target.value })}
                  />
                </div>

                {/* 3. EGAT Address (เทียบที่อยู่) */}
                <div className="p-6 bg-blue-50/30 rounded-3xl border border-blue-50 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">3. EGAT Address (ที่อยู่จากใบเสร็จ)</label>
                    <textarea
                      rows="2"
                      className="w-full p-4 bg-white border-2 border-blue-100 rounded-2xl outline-none font-bold text-gray-700 focus:border-blue-500 shadow-sm"
                      value={editableFields.egatAddress}
                      onChange={(e) => setEditableFields({ ...editableFields, egatAddress: e.target.value })}
                    />
                  </div>
                  <div className="pt-2 border-t border-blue-100/50">
                    <label className="block text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">🎯 Master EGAT Address (ข้อมูลอ้างอิงมาตรฐาน)</label>
                    <p className="p-4 bg-green-50 border-2 border-green-100 rounded-2xl font-bold text-green-800 text-sm leading-relaxed shadow-sm">
                      {/[ก-ฮ]/.test(editableFields.egatAddress || "")
                        ? masterData?.egat_address_th || masterData?.egatAddress
                        : masterData?.egat_address_eng}
                    </p>
                  </div>
                </div>

                {/* 4. EGAT Tax ID (เทียบเลขภาษี) */}
                <div className="p-6 bg-orange-50/30 rounded-3xl border border-orange-50 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">4. EGAT Tax ID (เลขภาษีจากใบเสร็จ)</label>
                    <input
                      className={`w-full p-4 bg-white border-2 rounded-2xl outline-none font-black text-lg transition-all shadow-sm ${editableFields.egatTaxId !== '0994000244843'
                        ? 'border-red-300 text-red-600 ring-4 ring-red-50'
                        : 'border-orange-100 text-gray-700'
                        }`}
                      value={editableFields.egatTaxId}
                      onChange={(e) => setEditableFields({ ...editableFields, egatTaxId: e.target.value })}
                    />
                  </div>
                  <div className="pt-2 border-t border-orange-100/50">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">🎯 Master EGAT Tax ID (ข้อมูลอ้างอิงมาตรฐาน)</label>
                    <p className="p-4 bg-gray-100 border-2 border-gray-200 rounded-2xl font-black text-gray-400 text-lg tracking-widest shadow-sm">
                      0994000244843
                    </p>
                  </div>
                </div>

                {/* ปุ่มบันทึกด้านล่างสุด */}
                <button
                  onClick={handleSaveToDB}
                  disabled={isProcessing}
                  className="w-full mt-10 py-5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-green-100 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-200 disabled:shadow-none"
                >
                  <Save size={24} /> {isProcessing ? "กำลังบันทึก..." : "Confirm & Save Changes"}
                </button>
              </div>
            )}
          </div>

          {/* Column 3: image */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            {/* --- ส่วนที่ 2: รูปภาพพรีวิว (Framed Image) --- */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest text-center">หลักฐานการตรวจสอบ (OCR Vision)</p>
              {debugImage && (
                <div className="relative rounded-2xl overflow-hidden border-4 border-gray-50 shadow-inner max-w-4xl mx-auto">
                  <img src={debugImage} className="w-full h-auto" alt="Processed View" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div >

      {/* --- Cropper Modal --- */}
      {
        showCropper && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm p-8 flex flex-col">
            <div className="relative flex-1 bg-gray-800 rounded-3xl overflow-hidden">
              <Cropper
                image={imagePreviewUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect === 'free' ? undefined : aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-4 items-center justify-center">
              {/* Dropdown เลือกสัดส่วน พร้อมเซ็ตประเภทใบเสร็จอัตโนมัติ */}
              <select
                value={aspect}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'free') {
                    setAspect('free');
                  } else {
                    const numAspect = parseFloat(val);
                    setAspect(numAspect);
                    // ✅ ถ้าเลือก 1.5 (3:2) ให้เป็นแบบที่ 1, ถ้าเลือก 0.25 (1:4) ให้เป็นแบบที่ 2
                    setReceiptType(numAspect === 1.5 ? '1' : '2');
                  }
                }}
                className="p-3 rounded-xl bg-white font-bold text-gray-700 outline-none ring-2 ring-blue-500"
              >
                <option value={3 / 2}>3:2 (ใบเสร็จทั่วไป - แบบที่ 1)</option>
                <option value={1 / 4}>1:4 (ใบเสร็จยาว - แบบที่ 2)</option>
              </select>

              <button
                onClick={handleCropSave}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
              >
                Apply Crop
              </button>

              <button
                onClick={() => setShowCropper(false)}
                className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      }

      {/* --- Status Toast --- */}
      {
        statusMessage && (
          <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center font-bold ${isError ? 'bg-red-500 text-white' : 'bg-white text-gray-800'}`}>
            {isError ? <AlertCircle className="mr-2" /> : <CheckCircle2 className="mr-2 text-green-500" />}
            {statusMessage}
          </div>
        )
      }
    </div >
  );
};

export default UploadReceipt;