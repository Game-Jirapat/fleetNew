import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, Scissors, Cpu, Save, X, CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight, Trash2, XCircle, Calendar } from 'lucide-react';
import api from '../api/axios';
import getCroppedImg from '../utils/cropImage';
import ConfirmDeleteModal from '../assets/ConfirmDeleteModal'

const UploadReceipt = () => {
  const fileInputRef = useRef(null);

  // --- Global States ---
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [masterData, setMasterData] = useState(null);
  const [activeRegionIndex, setActiveRegionIndex] = useState(0); // ✅ เก็บว่ากำลังดูกรอบไหน
  const [confirmedRegions, setConfirmedRegions] = useState({}); // ✅ เก็บสถานะ Check box
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // --- Image & OCR States ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [debugImage, setDebugImage] = useState(null);
  const [receiptType, setReceiptType] = useState('1');
  const [isCropped, setIsCropped] = useState(false);
  // --- Cropper States ---
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(3 / 2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // --- Form States ---
  const [editableFields, setEditableFields] = useState({
    plateNo: '', transactionDate: ''
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const response = await api.get('/master');
        setMasterData(Array.isArray(response.data) ? response.data[0] : response.data);
      } catch (error) { console.error("Error fetching master data:", error); }
    };
    fetchMasterData();
  }, []);

  // --- Handlers ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setIsError(false);
    }
  };

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  const handleCropSave = async () => {
    const croppedBlob = await getCroppedImg(imagePreviewUrl, croppedAreaPixels);
    const croppedFile = new File([croppedBlob], selectedFile.name, { type: 'image/jpeg' });
    setSelectedFile(croppedFile);
    setImagePreviewUrl(URL.createObjectURL(croppedBlob));
    setShowCropper(false);
    setIsCropped(true);
  };

  const handleProcessOCR = async () => {
    setIsProcessing(true);
    setStatusMessage('กำลังวิเคราะห์ใบเสร็จ...');
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('type', receiptType);

    try {
      const response = await api.post('/receipts/upload', formData);
      const { data, parsed_data, debug_image } = response.data;

      if (debug_image) {
        setDebugImage(debug_image.startsWith('data:image') ? debug_image : `data:image/jpeg;base64,${debug_image}`);
      }

      const mappedData = {
        dbReceiptId: data.receipt_id,
        plateNo: parsed_data.license_plate_no || '',
        transactionDate: parsed_data.bill_date || '',
      };
      setEditableFields(mappedData);
      setCurrentStep(2); // ✅ ย้ายไป Step 2 เมื่อ OCR เสร็จ
      setStatusMessage('วิเคราะห์สำเร็จ!');
    } catch (err) {
      setIsError(true);
      setStatusMessage('เกิดข้อผิดพลาด: ' + err.message);
    } finally { setIsProcessing(false); }
  };

  const handleSaveToDB = async () => {
    try {
      setStatusMessage('กำลังบันทึกข้อมูล...');
      await api.put(`/receipts/${editableFields.dbReceiptId}/data`, {
        license_plate_no: editableFields.plateNo,
        bill_date: editableFields.transactionDate
      });

      /*await api.post(`/receipts/notify-confirmed`, {
        receiptId: editableFields.dbReceiptId,
        confirmedRegions: confirmedRegions,
        editableFields: editableFields
      });*/

      setStatusMessage('บันทึกสำเร็จ!');
      setTimeout(() => resetFlow(), 1500);
    } catch (err) { setIsError(true); setStatusMessage('บันทึกไม่สำเร็จ'); }
  };

  const resetFlow = async () => {
    // ล้าง State เดิมของคุณ
    setCurrentStep(1);
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setDebugImage(null);
    setConfirmedRegions({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeDelete = async () => {
    if (editableFields.dbReceiptId) {
      try {
        await api.delete(`/receipts/${editableFields.dbReceiptId}`);
        console.log("Deleted temporary record from DB");
        resetFlow(); // ล้าง State หน้าจอ
      } catch (err) {
        console.error("Delete failed");
      }
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Step Indicator */}
        <div className="mb-6 md:mb-10 flex items-center justify-between px-2 max-w-xs mx-auto">
          {[1, 2].map((s) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base ${currentStep >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-200 text-gray-400'}`}>
                {s}
              </div>
              <span className={`hidden sm:block text-[9px] md:text-[10px] font-black uppercase tracking-tighter ${currentStep >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                {s === 1 ? 'อัปโหลด' : 'ตรวจสอบและยืนยัน'}
              </span>
            </div>
          ))}
        </div>

        {/* --- STEP 1: Upload & Initial Crop --- */}
        {currentStep === 1 && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-500 max-w-xl mx-auto space-y-6">
            {/* --- Header --- */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shadow-sm flex-shrink-0">
                <Upload size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800 leading-none">ขั้นตอนที่ 1</h2>
                <p className="text-gray-400 font-bold text-l uppercase tracking-widest mt-1">อัปโหลดใบเสร็จเพื่อเริ่มสแกน</p>
              </div>
            </div>

            {/* --- Image Dropzone (Improved) --- */}
            <div
              onClick={() => fileInputRef.current.click()}
              className="group relative aspect-[4/3] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-500 overflow-hidden bg-gray-50 shadow-inner"
            >
              {imagePreviewUrl ? (
                <>
                  {/* ✅ รูปพื้นหลังแบบเบลอเพื่อลดความโล่ง */}
                  <img
                    src={imagePreviewUrl}
                    className="absolute inset-0 w-full h-full object-cover blur-lg opacity-20 scale-110"
                    alt="Blur Background"
                  />
                  {/* ✅ รูปหลักที่แสดงผลแบบ Overflow Hidden */}
                  <div className="relative w-full h-full p-2 flex items-center justify-center">
                    <img
                      src={imagePreviewUrl}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                      alt="Preview"
                    />
                  </div>
                  {/* ✅ Overlay ตอน Hover */}
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors duration-500" />
                </>
              ) : (
                <div className="text-center space-y-3 animate-in fade-in duration-700">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto text-blue-500 group-hover:scale-110 transition-transform">
                    <Upload size={28} />
                  </div>
                  <p className="text-gray-400 font-black text-sm uppercase tracking-tighter">คลิกเพื่อเลือกไฟล์รูปภาพ</p>
                </div>
              )}
            </div>

            <input type="file" ref={fileInputRef} hidden onChange={handleImageChange} accept="image/*" />

            {/* --- Buttons --- */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              {imagePreviewUrl && (
                <button
                  onClick={() => setShowCropper(true)}
                  className={`flex-1 py-4 border-2 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isCropped
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Scissors size={20} className="text-blue-500" /> {isCropped ? 'ภาพถูกตัดแล้ว' : 'ตัดขอบรูปภาพ'}
                </button>
              )}
              <button
                disabled={!selectedFile || isProcessing || !isCropped}
                onClick={handleProcessOCR}
                className={`flex-[2] py-5 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${(!selectedFile || isProcessing || !isCropped)
                  ? 'bg-gray-300 cursor-not-allowed opacity-70 shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }`}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังประมวลผล...
                  </div>
                ) : (
                  <><Cpu size={22} />เริ่มประมวลผล</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- Step 2: Region-by-Region Verification */}
        {currentStep === 2 && debugImage && (
          <div className="bg-white p-4 md:p-8 rounded-[30px] md:rounded-[40px] shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-300 mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2 text-gray-800">
                <Scissors size={28} className="text-orange-500" /> ขั้นตอนที่ 2: ตรวจพิกัดข้อมูล
              </h2>
              <span className="text-[10px] bg-gray-100 px-3 py-1 rounded-full font-bold text-gray-400">
                ใบเสร็จชนิด: {receiptType}
              </span>
            </div>

            {(() => {
              // กำหนดรายการตรวจสอบตามลำดับที่คุณต้องการ
              const allRegions = [
                { id: 'receiptTaxinvoice', label: '1. ใบกำกับภาษี', color: 'border-blue-500', bg: 'bg-blue-500', type: 'question', question: 'มีคำว่า ใบเสร็จรับเงิน/ใบกำกับภาษี หรือ Tax invoice/Receipt หรือไม่?' },
                { id: 'plateNo', label: '2. ทะเบียนรถ', color: 'border-green-500', bg: 'bg-green-500', type: 'edit' },
                { id: 'transactionDate', label: '3. วันที่', color: 'border-cyan-500', bg: 'bg-cyan-500', type: 'edit' },
                { id: 'egatData', label: '4. ที่อยู่ กฟผ. และ เลขภาษี กฟผ.', color: 'border-red-500', bg: 'bg-red-500', type: 'question', question: 'มีที่อยู่ และเลขภาษี กฟผ. หรือไม่?' },
                { id: 'signature', label: '5. ลายเซ็น', color: 'border-pink-500', bg: 'bg-pink-500', type: 'question', question: 'มีลายเซ็นหรือไม่?' },
                { id: 'original', label: '6. ต้นฉบับ', color: 'border-yellow-500', bg: 'bg-yellow-500', type: 'question', question: 'เป็นเอกสารฉบับจริง/ต้นฉบับหรือไม่?' },
              ];

              const regions = receiptType === '2'
                ? allRegions.filter(r => r.id !== 'signature')
                : allRegions;

              const currentRegion = regions[activeRegionIndex];

              if (!currentRegion) {
                if (activeRegionIndex > 0) setActiveRegionIndex(0);
                return <div className="p-20 text-center font-bold text-gray-400 animate-pulse">กำลังโหลดพิกัด...</div>;
              }

              return (
                <div className="space-y-6 md:space-y-8">
                  {/* --- 1. Cropped Image Area --- */}
                  <div className={`relative aspect-[4/5] md:aspect-video rounded-2xl md:rounded-3xl overflow-hidden border-4 bg-gray-900 shadow-xl transition-all duration-500 ${currentRegion.color}`}>
                    <img
                      src={debugImage}
                      className="w-full h-full object-contain opacity-90 transition-all duration-700 ease-in-out"
                      alt={currentRegion.label}
                      style={{
                        // เพิ่ม Scale ให้สูงขึ้นสำหรับใบเสร็จยาวเพื่อให้เห็นตัวอักษรชัด
                        transform: `scale(${receiptType === '2'
                          ? (window.innerWidth < 768 ? '3.5' : '5')
                          : (window.innerWidth < 768 ? '1.8' : '1.8')
                          })`,
                        transformOrigin: (() => {
                          // --- CASE: ใบเสร็จแบบยาว (Long Slip / Type 2) ---
                          if (receiptType === '2') {
                            switch (currentRegion.id) {
                              case 'receiptTaxinvoice': return '50% 60%';  //หัวข้อ TAX INVOICE
                              case 'plateNo': return '50% 90%';  //ทะเบียนรถ
                              case 'transactionDate': return '50% 70%'; //วันที่
                              case 'egatData': return '50% 99%';  //ข้อมูล กฟผ.
                              case 'original': return '50% 100%';  //ต้นฉบับ
                              default: return 'center';
                            }
                          }
                          // --- CASE: ใบเสร็จทั่วไป (Standard / Type 1) ---
                          else {
                            switch (currentRegion.id) {
                              case 'receiptTaxinvoice': return '90% 5%';
                              case 'plateNo': return '15% 40%';
                              case 'transactionDate': return '90% 35%';
                              case 'egatData': return '15% 25%';
                              case 'signature': return '15% 95%';
                              case 'original': return '90% 95%';
                              default: return 'center';
                            }
                          }
                        })()
                      }}
                    />
                    <div className={`absolute top-4 left-4 ${currentRegion.bg} text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-lg`}>
                      FOCUSING: {currentRegion.label}
                    </div>
                  </div>

                  {/* --- 2. Text Content & Confirmation Checkbox --- */}
                  <div className="bg-gray-50 p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-inner">
                    {currentRegion.type === 'edit' ? (

                      // CASE 1: สำหรับ ทะเบียนรถ และ วันที่ (แก้ไขได้)
                      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4">
                        <div className="space-y-5 animate-in fade-in duration-500">

                          {/* --- Consolidated Verify Card --- */}
                          <div className={`p-6 rounded-[32px] border-2 shadow-inner transition-all duration-300 ${!editableFields[currentRegion.id]
                            ? 'bg-rose-50/50 border-rose-200' // 🔴 ข้อมูลขาดหาย
                            : 'bg-white border-blue-100 shadow-xl shadow-gray-200/40' // 🔵 ข้อมูลครบ
                            }`}>

                            {/* Header with Title & Missing Badge */}
                            <div className="flex items-center justify-between mb-5">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${!editableFields[currentRegion.id] ? 'bg-rose-500 animate-ping' : 'bg-blue-500'}`} />
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${!editableFields[currentRegion.id] ? 'text-rose-500' : 'text-blue-500'}`}>
                                  {currentRegion.id === 'plateNo' ? 'ตรวจสอบทะเบียนรถ' : 'ตรวจสอบวันที่ใบเสร็จ'}
                                </p>
                              </div>

                              {!editableFields[currentRegion.id] && (
                                <span className="bg-rose-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter animate-bounce">
                                  ข้อมูลขาดหาย!
                                </span>
                              )}
                            </div>

                            {/* Integrated Display & Input Group */}
                            <div className="space-y-4">
                              {currentRegion.id === 'transactionDate' ? (
                                < div className="flex flex-col sm:flex-row gap-3 items-stretch">

                                  {/* ส่วน Input วันที่ (เต็มความกว้างในมือถือ) */}
                                  <div className="relative group flex-1">
                                    <input
                                      type="date"
                                      id="hiddenDatePicker"
                                      value={editableFields[currentRegion.id] || ''}
                                      onChange={e => setEditableFields({ ...editableFields, [currentRegion.id]: e.target.value })}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />

                                    <div className={`w-full p-4 sm:p-5 bg-gray-50/50 rounded-2xl border-2 transition-all flex items-center justify-between ${!editableFields[currentRegion.id] ? 'border-rose-200' : 'border-transparent group-hover:border-blue-400'
                                      }`}>
                                      <span className="font-black text-xl sm:text-2xl text-gray-800">
                                        {(() => {
                                          const dateValue = editableFields[currentRegion.id];
                                          if (!dateValue) return 'เลือกวันที่...';

                                          // ตรวจสอบว่า String สามารถแปลงเป็น Date ได้จริงหรือไม่
                                          const d = new Date(dateValue);
                                          if (isNaN(d.getTime())) {
                                            return <span className="text-rose-500">รูปแบบวันที่ผิดพลาด</span>;
                                          }

                                          // แสดงผลเป็น วัน/เดือน/ปี แบบไทย
                                          return d.toLocaleDateString('th-TH', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                          });
                                        })()}
                                      </span>
                                      <Calendar size={20} className="text-blue-500 flex-shrink-0" />
                                    </div>
                                  </div>

                                  {/* ✅ ปุ่ม Today (ปรับขนาดให้พอดีกับมือถือ) */}
                                  <button
                                    onClick={() => {
                                      const today = new Date().toISOString().split('T')[0];
                                      setEditableFields({ ...editableFields, [currentRegion.id]: today });
                                    }}
                                    className="h-[60px] sm:h-auto px-6 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                                  >
                                    วันนี้
                                  </button>
                                </div>
                              ) : (
                                // ✅ 2. แบบข้อความ (Plate No) - แสดงค่า OCR พร้อม Input
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <input
                                    type="text"
                                    value={editableFields[currentRegion.id] || ''}
                                    placeholder="กรุณาระบุข้อมูลที่ถูกต้อง..."
                                    onChange={e => setEditableFields({ ...editableFields, [currentRegion.id]: e.target.value })}
                                    className="w-full p-4 bg-white border-2 border-blue-100 focus:border-blue-500 rounded-2xl font-black text-xl text-gray-800 outline-none transition-all placeholder:text-gray-300 shadow-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* --- Floating Hint Box --- */}
                          <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-500">
                            <div className="flex-shrink-0 w-6 h-6 bg-white rounded-lg shadow-sm flex items-center justify-center font-black text-xs text-amber-500">!</div>
                            <p className="text-[11px] font-bold tracking-tight leading-tight">
                              {editableFields[currentRegion.id]
                                ? "ตรวจสอบความถูกต้องอีกครั้ง หากไม่ตรงกับใบเสร็จ กรุณาพิมพ์แก้ไขในช่องด้านบน"
                                : "ระบบตรวจไม่พบข้อมูลในกรอบนี้ โปรดระบุข้อมูลที่ถูกต้องตามใบเสร็จจริง"}
                            </p>
                          </div>
                        </div>

                        {/* ปุ่มเลือกพิกัด */}
                        <div className="flex justify-center gap-4 border-t pt-6">
                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'incorrect' })}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'incorrect' ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-400'}`}
                          >
                            <XCircle size={20} /> ไม่มี{currentRegion.id === 'plateNo' ? 'ทะเบียนรถในกรอบ' : 'วันที่ในกรอบ'}
                          </button>
                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'correct' })}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'correct' ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-400'}`}
                          >
                            <CheckCircle2 size={20} /> มี{currentRegion.id === 'plateNo' ? 'ทะเบียนรถในกรอบ' : 'วันที่ในกรอบ'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // CASE 2: สำหรับกรณีตอบคำถาม มี/ไม่มี (Yes/No)
                      <div className="flex-1 animate-in fade-in slide-in-from-right-4 text-center">
                        <p className="text-2xl font-black text-gray-400 uppercase tracking-widest mb-4">{currentRegion.label}</p>
                        <h3 className="text-xl font-bold text-gray-800 mb-6">{currentRegion.question}</h3>
                        {currentRegion.id === 'egatData' && masterData && (
                          <div className="mb-8 space-y-3 max-w-md mx-auto animate-in zoom-in duration-500">
                            <div className="p-5 bg-blue-50 border-2 border-blue-100 rounded-[24px] text-left shadow-sm">
                              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <ShieldCheck size={14} /> เปรียบเทียบข้อมูลกับฐานข้อมูล กฟผ.
                              </p>
                              <div className="space-y-3">
                                <div className="pt-2">
                                  {(() => {
                                    switch (receiptType) {
                                      case '1': // ✅ ใบเสร็จ ปตท. (ภาษาไทย)
                                        return (
                                          <div className="animate-in fade-in duration-300">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">ที่อยู่ กฟผ. (TH)</p>
                                            <p className="text-sm font-black text-gray-700 leading-tight">{masterData.egat_address_th}</p>
                                          </div>
                                        );
                                      case '2': // ✅ ใบเสร็จ บางจาก (ภาษาอังกฤษ)
                                        return (
                                          <div className="animate-in fade-in duration-300">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">EGAT Address (EN)</p>
                                            <p className="text-sm font-black text-gray-700 leading-tight italic">{masterData.egat_address_eng}</p>
                                          </div>
                                        );
                                      default:
                                        return null;
                                    }
                                  })()}
                                </div>
                                <div className="pt-2 border-t border-blue-100">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">เลขประจำตัวผู้เสียภาษี</p>
                                  <p className="text-lg font-black text-blue-600">{masterData.egat_tax_id}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] font-bold text-amber-500 bg-amber-50 py-2 rounded-xl border border-amber-100 uppercase tracking-tighter">
                              ⚠️ กรุณาเทียบข้อมูลด้านบนกับรูปภาพในกรอบสีแดง
                            </p>
                          </div>
                        )}
                        {currentRegion.id === 'original' && (
                          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl mb-6">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 flex-shrink-0 w-5 h-5 bg-yellow-300 text-yellow-800 rounded-lg flex items-center justify-center font-black text-[10px]">
                                !
                              </div>
                              <p className="text-sm text-gray-600">
                                หากเป็นใบเสร็จยาวจะมีคนว่าต้นฉบับอยู่ที่ท้ายใบเสร็จ
                                หากเป็นใบเสร็จแบบ A5 จะไม่มีอะไรเขียนอยู่ในกรอบ
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-center gap-6">
                          {/* ปุ่ม "ไม่มี / ไม่ใช่" (Incorrect) */}
                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'incorrect' })}
                            className={`flex-1 max-w-[160px] py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'incorrect'
                              ? 'bg-red-500 border-red-500 text-white shadow-lg scale-105'
                              : 'bg-white border-gray-200 text-gray-400 hover:border-red-200'
                              }`}
                          >
                            <XCircle size={20} /> {currentRegion.id === 'receiptTaxinvoice' ? 'ไม่ใช่' : currentRegion.id === 'egatData' ? 'ไม่มีข้อมูล กฟผ.' : currentRegion.id === 'signature' ? 'ไม่มีลายเซ็น' : 'ไม่ใช่ต้นฉบับ'}
                          </button>

                          {/* ปุ่ม "มี / ใช่" (Correct) */}
                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'correct' })}
                            className={`flex-1 max-w-[160px] py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'correct'
                              ? 'bg-green-500 border-green-500 text-white shadow-lg scale-105'
                              : 'bg-white border-gray-200 text-gray-400 hover:border-green-200'
                              }`}
                          >
                            <CheckCircle2 size={20} /> {currentRegion.id === 'receiptTaxinvoice' ? 'ใช่' : currentRegion.id === 'egatData' ? 'มีข้อมูล กฟผ.' : currentRegion.id === 'signature' ? 'มีลายเซ็น' : 'ใช่ต้นฉบับ'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- 3. Navigation (Prev / Next) --- */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button
                        disabled={activeRegionIndex === 0}
                        onClick={() => setActiveRegionIndex(activeRegionIndex - 1)}
                        className="p-4 bg-gray-100 text-gray-700 rounded-2xl font-bold disabled:opacity-20 hover:bg-gray-200 transition-all active:scale-95"
                      >
                        <ArrowLeft size={24} />
                      </button>

                      {/* เพิ่มปุ่มยกเลิกรายการในพิกัดสุดท้าย (ต้นฉบับ) */}
                      {currentRegion.id === 'original' && (
                        <button
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="px-6 py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold hover:bg-rose-100 transition-all flex items-center justify-center gap-2 active:scale-95 border border-rose-100"
                        >
                          <Trash2 size={20} /> <span className="hidden sm:inline text-sm">ยกเลิกรายการ</span>
                        </button>
                      )}
                    </div>

                    <div className="w-full md:w-auto">
                      {activeRegionIndex < regions.length - 1 ? (
                        <button
                          disabled={!confirmedRegions[currentRegion.id]}
                          onClick={() => setActiveRegionIndex(activeRegionIndex + 1)}
                          className={`w-full md:w-auto px-10 py-4 rounded-2xl font-black transition-all shadow-lg flex items-center justify-center gap-2 ${!confirmedRegions[currentRegion.id]
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-90 shadow-blue-100'
                            }`}
                        >
                          ถัดไป <ArrowRight size={20} />
                        </button>
                      ) : (
                        /* เปลี่ยนจาก "ไปขั้นตอนที่ 3" เป็น "ยืนยันและบันทึก" ทันที */
                        <button
                          disabled={!confirmedRegions[currentRegion.id]}
                          onClick={handleSaveToDB}
                          className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${!confirmedRegions[currentRegion.id]
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100 animate-in zoom-in duration-300'
                            }`}
                        >
                          <Save size={22} /> ยืนยันและบันทึกข้อมูล
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* --- delete Modal --- */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title="ยกเลิกการสแกน"
        itemName={editableFields.dbReceiptId ? `ใบเสร็จเลขที่ ${editableFields.dbReceiptId}` : "รายการปัจจุบัน"}
        message="หากคุณยกเลิก ข้อมูลที่สแกนไว้จะถูกลบออกถาวรและต้องเริ่มใหม่อีกครั้ง"
      />
      {/* --- Cropper Modal --- */}
      {
        showCropper && (
          <div className="fixed inset-0 z-[150] bg-white/80 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
            {/* --- Header: Clean & Minimal --- */}
            <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-100 bg-white/50">
              <div className="flex items-center gap-3 text-gray-800">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Scissors size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black leading-none">Crop Receipt</h2>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-bold">ปรับแต่งขนาดใบเสร็จ</p>
                </div>
              </div>
              <button
                onClick={() => setShowCropper(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors active:scale-90"
              >
                <X size={24} />
              </button>
            </div>

            {/* --- Main Area: Light Background Cropper --- */}
            <div className="relative flex-1 m-4 md:m-8 rounded-[32px] md:rounded-[40px] overflow-hidden border-2 border-white bg-gray-50 shadow-2xl shadow-gray-200/50">
              <Cropper
                image={imagePreviewUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: { background: '#f8fafc' } // ปรับพื้นหลัง Cropper ให้เป็นเทาอ่อนๆ
                }}
              />
            </div>

            {/* --- Footer: Controls (Matching Main Page Style) --- */}
            <div className="bg-white p-6 md:p-10 border-t border-gray-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
              <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-10">

                {/* Aspect Ratio Selector */}
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">เลือกประเภทใบเสร็จ</label>
                  <div className="relative group">
                    <select
                      value={aspect}
                      onChange={e => {
                        setAspect(parseFloat(e.target.value));
                        setReceiptType(e.target.value === "1.5" ? "1" : "2")
                      }}
                      className="w-full p-4 pl-5 rounded-2xl bg-gray-50 text-gray-700 font-bold outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer shadow-sm"
                    >
                      <option value={3 / 2}>ปตท.</option>
                      <option value={1 / 4}>บางจาก</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ArrowRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setShowCropper(false)}
                    className="flex-1 md:flex-none px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCropSave}
                    className="flex-[2] md:flex-none px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} /> ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default UploadReceipt;