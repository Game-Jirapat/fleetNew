import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, Scissors, Cpu, Save, X, CheckCircle2, FileText, ArrowLeft, ArrowRight, Trash2, XCircle, Calendar } from 'lucide-react';
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
  const [parsedData, setParsedData] = useState(null);

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
        console.log("Master data fetched:", response.data);
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
      setParsedData(mappedData);
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
      console.log("Saving to DB with data:", editableFields);
      await api.put(`/receipts/${editableFields.dbReceiptId}/data`, {
        license_plate_no: editableFields.plateNo,
        bill_date: editableFields.transactionDate
      });
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
    setParsedData(null);
    setConfirmedRegions({}); // ล้างค่าที่ติ๊กไว้ด้วย
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
        <div className="mb-6 md:mb-10 flex items-center justify-between px-2 max-w-sm mx-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base ${currentStep >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-200 text-gray-400'}`}>
                {s}
              </div>
              <span className={`hidden sm:block text-[9px] md:text-[10px] font-black uppercase tracking-tighter ${currentStep >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Review' : 'Verify'}
              </span>
            </div>
          ))}
        </div>

        {/* --- STEP 1: Upload & Initial Crop --- */}
        {currentStep === 1 && (
          <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto">
            {/* --- Header --- */}
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-sm">
                <Upload size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-800 leading-none">Step 1</h2>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">อัปโหลดใบเสร็จเพื่อเริ่มสแกน</p>
              </div>
            </div>

            {/* --- Image Dropzone (Improved) --- */}
            <div
              onClick={() => fileInputRef.current.click()}
              className="group relative aspect-square md:aspect-video border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-500 overflow-hidden bg-gray-50 shadow-inner"
            >
              {imagePreviewUrl ? (
                <>
                  {/* ✅ รูปพื้นหลังแบบเบลอเพื่อลดความโล่ง */}
                  <img
                    src={imagePreviewUrl}
                    className="absolute inset-0 w-full h-full object-cover blur-xl opacity-20 scale-110 transition-transform duration-700 group-hover:scale-125"
                    alt="Blur Background"
                  />
                  {/* ✅ รูปหลักที่แสดงผลแบบ Overflow Hidden */}
                  <div className="relative w-full h-full p-4 md:p-8 flex items-center justify-center">
                    <img
                      src={imagePreviewUrl}
                      className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-transform duration-500 group-hover:scale-105"
                      alt="Preview"
                    />
                  </div>
                  {/* ✅ Overlay ตอน Hover */}
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors duration-500" />
                </>
              ) : (
                <div className="text-center space-y-4 animate-in fade-in duration-700">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto text-blue-500 group-hover:scale-110 transition-transform duration-500">
                    <Upload size={32} />
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
                  className="flex-1 py-4 bg-white text-gray-600 border-2 border-gray-100 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
                >
                  <Scissors size={20} className="text-blue-500" /> Crop Image
                </button>
              )}
              <button
                disabled={!selectedFile || isProcessing}
                onClick={handleProcessOCR}
                className={`flex-[2] py-5 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${isProcessing ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }`}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <><Cpu size={22} /> Start OCR Process</>
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
                <Scissors size={24} className="text-orange-500" /> Step 2: ตรวจพิกัดข้อมูล
              </h2>
              <span className="text-[10px] bg-gray-100 px-3 py-1 rounded-full font-bold text-gray-400">
                LAYOUT TYPE: {receiptType}
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
                if (activeRegionIndex > 0) setActiveRegionIndex(0); // ป้องกันค้างที่ Index สูงเกินไป
                return <div className="p-20 text-center font-bold text-gray-400 animate-pulse">กำลังโหลดพิกัด...</div>;
              }

              return (
                <div className="space-y-6 md:space-y-8">
                  {/* --- 1. Cropped Image Area --- */}
                  <div className={`relative aspect-[4/5] md:aspect-video rounded-2xl md:rounded-3xl overflow-hidden border-4 bg-gray-900 shadow-2xl transition-all duration-500 ${currentRegion.color}`}>
                    <img
                      src={debugImage}
                      className="w-full h-full object-contain opacity-90 transition-all duration-700 ease-in-out"
                      alt={currentRegion.label}
                      style={{
                        // ✅ เพิ่ม Scale ให้สูงขึ้นสำหรับใบเสร็จยาวเพื่อให้เห็นตัวอักษรชัด
                        transform: `scale(${receiptType === '2'
                          ? (window.innerWidth < 768 ? '3.5' : '5')
                          : (window.innerWidth < 768 ? '1.8' : '1.8')
                          })`,
                        transformOrigin: (() => {
                          // --- 📂 CASE: ใบเสร็จแบบยาว (Long Slip / Type 2) ---
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
                          // --- 📂 CASE: ใบเสร็จทั่วไป (Standard / Type 1) ---
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
                      // 📝 CASE 1: สำหรับ ทะเบียนรถ และ วันที่ (แก้ไขได้)
                      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4">
                        <div>
                          <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-3">
                            ตรวจสอบและแก้ไขข้อมูล
                          </p>

                          {currentRegion.id === 'transactionDate' ? (
                            // ✅ เพิ่ม Date Picker สำหรับวันที่
                            <div className="relative group">
                              <input
                                type="date"
                                className="w-full p-5 bg-white border-2 border-blue-100 rounded-2xl font-black text-xl shadow-sm focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                value={editableFields[currentRegion.id] || ''}
                                onChange={e => setEditableFields({ ...editableFields, [currentRegion.id]: e.target.value })}
                              />
                            </div>
                          ) : (
                            // 🚗 Input ปกติสำหรับ ทะเบียนรถ
                            <input
                              className="w-full p-5 bg-white border-2 border-blue-100 rounded-2xl font-black text-xl shadow-sm focus:border-blue-500 outline-none transition-all"
                              value={editableFields[currentRegion.id] || ''}
                              onChange={e => setEditableFields({ ...editableFields, [currentRegion.id]: e.target.value })}
                            />
                          )}
                        </div>

                        {/* ✅ ปุ่มเลือกพิกัด (เหมือนเดิม) */}
                        <div className="flex justify-center gap-4 border-t pt-6">
                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'incorrect' })}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'incorrect' ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-400'}`}
                          >
                            <XCircle size={20} /> พิกัดไม่ตรง
                          </button>
                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'correct' })}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'correct' ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-400'}`}
                          >
                            <CheckCircle2 size={20} /> พิกัดถูกต้อง
                          </button>
                        </div>
                      </div>
                    ) : (
                      // ❓ CASE 2: สำหรับกรณีตอบคำถาม มี/ไม่มี (Yes/No)
                      <div className="flex-1 animate-in fade-in slide-in-from-right-4 text-center">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{currentRegion.label}</p>
                        <h3 className="text-xl font-bold text-gray-800 mb-6">{currentRegion.question}</h3>

                        <div className="flex justify-center gap-6">
                          {/* ปุ่ม "ไม่มี / ไม่ใช่" (Incorrect) */}
                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'incorrect' })}
                            className={`flex-1 max-w-[160px] py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'incorrect'
                              ? 'bg-red-500 border-red-500 text-white shadow-lg scale-105'
                              : 'bg-white border-gray-200 text-gray-400 hover:border-red-200'
                              }`}
                          >
                            <XCircle size={20} /> ไม่มี / ไม่ใช่
                          </button>

                          {/* ปุ่ม "มี / ใช่" (Correct) */}
                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'correct' })}
                            className={`flex-1 max-w-[160px] py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'correct'
                              ? 'bg-green-500 border-green-500 text-white shadow-lg scale-105'
                              : 'bg-white border-gray-200 text-gray-400 hover:border-green-200'
                              }`}
                          >
                            <CheckCircle2 size={20} /> มี / ใช่
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- 3. Navigation (Prev / Next) --- */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      disabled={activeRegionIndex === 0}
                      onClick={() => setActiveRegionIndex(activeRegionIndex - 1)}
                      className="p-4 bg-gray-100 text-gray-700 rounded-2xl font-bold disabled:opacity-20 hover:bg-gray-200 transition-all"
                    >
                      <ArrowLeft size={24} />
                    </button>

                    {/* Check Logic: ต้องมีการเลือกสถานะก่อนถึงจะกดไปต่อได้ */}
                    {activeRegionIndex < regions.length - 1 ? (
                      <button
                        disabled={!confirmedRegions[currentRegion.id]} // ✅ ล็อกปุ่มถ้ายังไม่ติ๊ก
                        onClick={() => setActiveRegionIndex(activeRegionIndex + 1)}
                        className={`p-4 rounded-2xl font-bold transition-all shadow-lg ${!confirmedRegions[currentRegion.id]
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-90'
                          }`}
                      >
                        <ArrowRight size={24} />
                      </button>
                    ) : (
                      <button
                        disabled={!confirmedRegions[currentRegion.id]} // ✅ ล็อกปุ่มสุดท้ายถ้ายังไม่ติ๊ก
                        onClick={() => setCurrentStep(3)}
                        className={`px-8 py-4 rounded-2xl font-black shadow-xl transition-all flex items-center gap-2 ${!confirmedRegions[currentRegion.id]
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                          : 'bg-green-500 text-white hover:bg-green-600 animate-bounce-subtle'
                          }`}
                      >
                        Go to Final Step <FileText size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* --- STEP 3: Final Data Verification --- */}
        {currentStep === 3 && (
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 animate-in slide-in-from-right duration-500 max-w-5xl mx-auto">
            {/* --- Header: Report Title --- */}
            <div className="flex justify-between items-end mb-10 border-b-2 border-gray-50 pb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center gap-3">
                  <FileText size={32} className="text-green-500" /> Summary Report
                </h2>
                <p className="text-gray-400 font-bold text-[9px] md:text-xs uppercase tracking-[0.3em] mt-2 ml-11">
                  Final Verification Details
                </p>
              </div>
              <div className="text-right hidden md:block">
                <span className="bg-green-100 text-green-700 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm">
                  Status: Ready to Save
                </span>
              </div>
            </div>

            <div className="space-y-10">
              {/* --- Section 1: Core Receipt Data (Grid 3 Columns) --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {[
                  {
                    label: 'ใบเสร็จรับเงิน',
                    value: confirmedRegions.receiptTaxinvoice === 'correct' ? 'ตรวจสอบพบ' : 'ไม่พบข้อมูล',
                    status: confirmedRegions.receiptTaxinvoice,
                    // ✅ ปรับ Origin ตามประเภทใบเสร็จ
                    origin: receiptType === '2' ? '50% 60%' : '90% 0%',
                    scale: receiptType === '2' ? 3.5 : 2
                  },
                  {
                    label: 'ทะเบียนรถ',
                    value: editableFields.plateNo || 'N/A',
                    status: confirmedRegions.plateNo,
                    origin: receiptType === '2' ? '50% 80%' : '15% 40%',
                    scale: receiptType === '2' ? 3.5 : 3.5
                  },
                  {
                    label: 'วันที่ใบเสร็จ',
                    value: editableFields.transactionDate || 'N/A',
                    status: confirmedRegions.transactionDate,
                    origin: receiptType === '2' ? '50% 75%' : '100% 30%',
                    scale: receiptType === '2' ? 3.5 : 2.5
                  }
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 relative transition-all hover:bg-white hover:shadow-md">
                    <div className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${item.status === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {item.status === 'correct' ? '✓ OK' : '⚠ Missing'}
                    </div>
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-4">{item.label}</label>
                    <div className="aspect-square rounded-2xl overflow-hidden border-2 border-white bg-gray-900 shadow-sm mb-4">
                      <img
                        src={debugImage}
                        className="w-full h-full object-contain opacity-80"
                        style={{ transform: `scale(${item.scale})`, transformOrigin: item.origin }}
                      />
                    </div>
                    <p className="text-lg font-black text-gray-800 break-words">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* --- Section 2: EGAT Validation (Full Width) --- */}
              <div className="p-4 md:p-8 rounded-[32px] md:rounded-[40px] transition-all bg-gray-50/50 border border-gray-100">
                <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
                  <label className="text-[10px] md:text-[11px] font-black text-blue-500 uppercase tracking-[0.2em]">
                    ข้อมูลที่อยู่และเลขภาษี กฟผ.
                  </label>
                  <span className={`px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black shadow-sm ${confirmedRegions.egatData === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {confirmedRegions.egatData === 'correct' ? '✓ ok' : '⚠ Incorrect'}
                  </span>
                </div>

                {/* ✅ ปรับ Grid: บนมือถือให้เรียงต่อกันเป็นแถวเดียว (Stacked) เพื่อให้ภาพกว้างที่สุด */}
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8 items-center">

                  {/* 🖼️ ภาพ Preview: บนมือถือขยายเต็มกว้างและลดความสูงลงเล็กน้อยเพื่อให้เห็นภาพกว้างขึ้น */}
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 border-white bg-gray-900 shadow-sm mb-4">
                    <img
                      src={debugImage}
                      className="w-full h-full object-contain opacity-80"
                      style={{
                        // ✅ ปรับ Scale ในมือถือให้ลดลงเล็กน้อยเพื่อให้เห็นข้อความรอบข้างชัดขึ้น
                        transform: receiptType === '2'
                          ? (window.innerWidth < 768 ? 'scale(3.5)' : 'scale(5)')
                          : 'scale(2)',
                        transformOrigin: receiptType === '2' ? '50% 95%' : '20% 20%'
                      }}
                    />
                  </div>

                  {/* 📝 ข้อมูลตัวอักษร: จัดระเบียบใหม่ให้ดูโปร่งบนมือถือ */}
                  <div className="w-full space-y-4 md:space-y-6">
                    <div className="bg-white/70 p-4 md:p-5 rounded-2xl border border-blue-50 shadow-sm">
                      <p className="text-[9px] font-bold text-blue-400 uppercase mb-2">Master Address</p>
                      <p className="text-sm md:text-[15px] font-black text-slate-700 leading-relaxed">
                        {masterData.egat_address_th}
                      </p>
                    </div>

                    <div className="bg-white/70 p-4 md:p-5 rounded-2xl border border-blue-50 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">Master Tax ID</p>
                        <p className="text-sm md:text-[15px] font-black text-slate-600">
                          {masterData.egat_tax_id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- Section 3: Signature & Authentication (Responsive Grid) --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                {/* 🖋️ ลายเซ็น: แสดงเฉพาะใบเสร็จปกติ (Type 1) */}
                {receiptType === '1' && (
                  <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 relative transition-all hover:bg-white hover:shadow-md">
                    <div className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${confirmedRegions.signature === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {confirmedRegions.signature === 'correct' ? '✓ OK' : '⚠ Missing'}
                    </div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">การลงลายมือชื่อ</label>
                    <div className="aspect-video md:aspect-square rounded-2xl overflow-hidden border-2 border-white bg-gray-900 shadow-sm mb-4">
                      <img
                        src={debugImage}
                        className="w-full h-full object-contain opacity-80"
                        style={{ transform: 'scale(2.5)', transformOrigin: '15% 100%' }}
                      />
                    </div>
                    <p className={`text-lg font-black ${confirmedRegions.signature === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                      {confirmedRegions.signature === 'correct' ? 'ตรวจพบลายเซ็น' : 'ไม่พบลายเซ็น'}
                    </p>
                  </div>
                )}
                {/* 📄 ต้นฉบับ: ปรับให้เต็มความกว้างในกรณีที่เป็นสลิปยาว (Type 2) */}
                <div className={`bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 relative transition-all hover:bg-white hover:shadow-md ${receiptType === '2' ? 'md:col-span-2' : ''}`}>
                  <div className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${confirmedRegions.original === 'correct' ? 'bg-cyan-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {confirmedRegions.original === 'correct' ? '✓ Original' : '⚠ Copy'}
                  </div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">ประเภทต้นฉบับ</label>
                  <div className={`rounded-2xl overflow-hidden border-2 border-white bg-gray-900 shadow-sm mb-4 ${receiptType === '2' ? 'aspect-video' : 'aspect-video md:aspect-square'}`}>
                    <img
                      src={debugImage}
                      className="w-full h-full object-contain opacity-80"
                      style={{
                        transform: receiptType === '2' ? 'scale(5)' : 'scale(2)',
                        transformOrigin: receiptType === '2' ? '50% 98%' : '80% 100%'
                      }}
                    />
                  </div>
                  <p className={`text-lg font-black ${confirmedRegions.original === 'correct' ? 'text-cyan-600' : 'text-orange-600'}`}>
                    {confirmedRegions.original === 'correct' ? 'ต้นฉบับ (Original)' : 'สำเนา (Copy)'}
                  </p>
                </div>
              </div>
            </div>

            {/* --- 🚀 Action Buttons Group (จัดใหม่ให้สวยงาม) --- */}
            <div className="mt-16 bg-white/50 backdrop-blur-md p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-4">

              {/* 1. Re-Check: เน้นความคลีน */}
              <button
                onClick={() => setCurrentStep(2)}
                className="w-full md:w-auto px-6 py-4 bg-white text-slate-500 rounded-2xl font-bold border border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              >
                <ArrowLeft size={18} /> กลับไปตรวจสอบ
              </button>

              {/* 2. Discard: สีแดงอ่อนดูนุ่มนวลแต่ชัดเจน */}
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full md:w-auto px-6 py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold hover:bg-rose-100 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Trash2 size={18} /> ยกเลิกรายการ
              </button>
              <div className="hidden md:block flex-1"></div>

              {/* 3. Confirm & Save: ปรับ Font และ Padding ใหม่ให้พอดีบรรทัดเดียว */}
              <button
                onClick={handleSaveToDB}
                className="w-full md:w-auto px-10 py-5 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-200/50 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Save size={22} className="shrink-0" />
                <span className="whitespace-nowrap">ยืนยันและบันทึก</span>
              </button>
            </div>

            {/* ✅ วาง Modal ไว้ล่างสุดตามเดิม (ไม่ต้องแก้ไข) */}
            <ConfirmDeleteModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={executeDelete}
              title="ยกเลิกการสแกน"
              itemName={`ใบเสร็จเลขที่ ${editableFields.dbReceiptId}`}
              message="หากคุณเริ่มใหม่ ข้อมูลที่สแกนไว้ในฐานข้อมูลจะถูกลบออกถาวร"
            />
          </div>
        )}
      </div>

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
                      <option value={3 / 2}>A4 (3:2)</option>
                      <option value={1 / 4}>สลิปยาว (1:4)</option>
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
                    Cancel
                  </button>
                  <button
                    onClick={handleCropSave}
                    className="flex-[2] md:flex-none px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} /> Apply Crop
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