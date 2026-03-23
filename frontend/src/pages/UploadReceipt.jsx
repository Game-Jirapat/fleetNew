import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, Scissors, Cpu, Save, AlertCircle, CheckCircle2, FileText, ArrowLeft, ArrowRight, Trash2, XCircle } from 'lucide-react';
import api from '../api/axios';
import getCroppedImg from '../utils/cropImage';

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
    plateNo: '', transactionDate: '', egatAddress: '', egatTaxId: ''
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
        egatTaxId: parsed_data.egat_tax_id || '',
        egatAddress: parsed_data.egat_address || '',
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
      await api.put(`/receipts/${editableFields.dbReceiptId}`, { ...editableFields, approval: 'Pending' });
      setStatusMessage('บันทึกสำเร็จ! ✅');
      setTimeout(() => resetFlow(), 1500);
    } catch (err) { setIsError(true); setStatusMessage('บันทึกไม่สำเร็จ'); }
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setDebugImage(null);
    setParsedData(null);
    setStatusMessage('');
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Step Indicator */}
        <div className="mb-10 flex items-center justify-between px-2 md:px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {s}
              </div>
              <span className={`hidden md:block text-[10px] font-black uppercase ${currentStep >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Review' : 'Verify'}
              </span>
            </div>
          ))}
        </div>

        {/* --- STEP 1: Upload & Initial Crop --- */}
        {currentStep === 1 && (
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Upload size={28} className="text-blue-600" /> Step 1: อัปโหลดใบเสร็จ</h2>
            <div
              onClick={() => fileInputRef.current.click()}
              className="aspect-video border-4 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-blue-200 transition-all bg-gray-50 overflow-hidden"
            >
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} className="w-full h-full object-contain" alt="Preview" />
              ) : (
                <div className="text-center text-gray-300"><Upload size={64} className="mx-auto mb-4" /><p className="font-bold">คลิกเพื่อเลือกไฟล์รูปภาพ</p></div>
              )}
            </div>
            <input type="file" ref={fileInputRef} hidden onChange={handleImageChange} accept="image/*" />

            <div className="mt-8 flex gap-4">
              {imagePreviewUrl && (
                <button onClick={() => setShowCropper(true)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200">
                  <Scissors size={20} /> Crop Image
                </button>
              )}
              <button
                disabled={!selectedFile || isProcessing}
                onClick={handleProcessOCR}
                className={`flex-[2] py-4 rounded-2xl font-black text-white shadow-lg flex items-center justify-center gap-2 ${isProcessing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
              >
                {isProcessing ? 'Processing...' : <><Cpu size={20} /> Start OCR Process</>}
              </button>
            </div>
          </div>
        )}

        {/* 🔍 Step 2: Region-by-Region Verification */}

        {currentStep === 2 && debugImage && (
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-300 max-w-2xl mx-auto">
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
              const regions = [
                { id: 'receiptTaxinvoice', label: '1. ใบกำกับภาษี', color: 'border-blue-500', bg: 'bg-blue-500', type: 'question', question: 'มีคำว่า ใบเสร็จรับเงิน/ใบกำกับภาษี หรือไม่?' },
                { id: 'plateNo', label: '2. ทะเบียนรถ', color: 'border-green-500', bg: 'bg-green-500', type: 'edit' },
                { id: 'transactionDate', label: '3. วันที่', color: 'border-purple-500', bg: 'bg-purple-500', type: 'edit' },
                { id: 'egatData', label: '4. ที่อยู่ กฟผ. และ เลขภาษี กฟผ.', color: 'border-red-500', bg: 'bg-red-500', type: 'question', question: 'มีที่อยู่ และเลขภาษี กฟผ. หรือไม่?' },
                { id: 'signature', label: '5. ลายเซ็น', color: 'border-orange-500', bg: 'bg-orange-500', type: 'question', question: 'มีลายเซ็นหรือไม่?' },
                { id: 'original', label: '6. ต้นฉบับ', color: 'border-cyan-500', bg: 'bg-cyan-500', type: 'question', question: 'เป็นเอกสารฉบับจริง/ต้นฉบับหรือไม่?' },
              ];
              const currentRegion = regions[activeRegionIndex];

              return (
                <div className="space-y-8">
                  {/* --- 1. Cropped Image Area --- */}
                  <div className={`relative aspect-[3/4] md:aspect-video rounded-3xl overflow-hidden border-4 bg-gray-900 shadow-2xl transition-all duration-500 ${currentRegion.color}`}>
                    <img
                      src={debugImage}
                      className="w-full h-full object-contain transition-all duration-700 ease-in-out"
                      alt={currentRegion.label}
                      style={{
                        // ✅ เพิ่ม Scale ให้สูงขึ้นสำหรับใบเสร็จยาวเพื่อให้เห็นตัวอักษรชัด
                        transform: `scale(${receiptType === '2' ? '2.8' : '2.2'})`,

                        transformOrigin: (() => {
                          // --- 📂 CASE: ใบเสร็จแบบยาว (Long Slip / Type 2) ---
                          if (receiptType === '2') {
                            switch (activeRegionIndex) {
                              case 0: return '50% 60%';  // 🟦 กลางบน: หัวข้อ TAX INVOICE
                              case 1: return '50% 90%';  // 🟩 กลางล่าง: ทะเบียนรถ
                              case 2: return '50% 70%';  // 🟪 กลางล่าง: วันที่
                              case 3: return '50% 99%';  // 🟥 ล่างสุด: ข้อมูล กฟผ.
                              case 4: return '50% 100%';  // 🔲 ล่างขวา: ต้นฉบับ
                              case 5: return '50% 100%';  // 🔲 ล่างขวา: ต้นฉบับ
                              default: return 'center';
                            }
                          }
                          // --- 📂 CASE: ใบเสร็จทั่วไป (Standard / Type 1) ---
                          else {
                            switch (activeRegionIndex) {
                              case 0: return '90% 5%';   // 🟦 ขวาบน: หัวข้อใบเสร็จ
                              case 1: return '15% 40%';  // 🟩 กลางซ้าย: ทะเบียนรถ
                              case 2: return '90% 35%';  // 🟪 กลางขวา: วันที่
                              case 3: return '15% 25%';  // 🟥 กลางบน: ข้อมูล กฟผ.
                              case 4: return '15% 95%';  // 🟧 ล่างซ้าย: ลายเซ็น
                              case 5: return '90% 95%';  // 🔲 ล่างขวา: ต้นฉบับ
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
                  <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 shadow-inner">
                    {currentRegion.type === 'edit' ? (
                      // 📝 CASE 1: สำหรับ ทะเบียนรถ และ วันที่ (แก้ไขได้)
                      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4">
                        <div>
                          <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-3">ตรวจสอบและแก้ไขข้อมูล</p>
                          <input
                            className="w-full p-5 bg-white border-2 border-blue-100 rounded-2xl font-black text-xl shadow-sm focus:border-blue-500 outline-none transition-all"
                            value={editableFields[currentRegion.id] || ''}
                            onChange={e => setEditableFields({ ...editableFields, [currentRegion.id]: e.target.value })}
                          />
                        </div>

                        {/* ✅ เพิ่มส่วนนี้เข้าไปเพื่อให้ user กดเลือกสถานะได้ในหน้าแก้ไข */}
                        <div className="flex justify-center gap-4 border-t pt-6">
                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'incorrect' })}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'incorrect' ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-400'
                              }`}
                          >
                            <XCircle size={20} /> พิกัดไม่ตรง
                          </button>

                          <button
                            onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'correct' })}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 ${confirmedRegions[currentRegion.id] === 'correct' ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-400'
                              }`}
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
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                  <FileText size={32} className="text-green-500" /> Summary Report
                </h2>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-2 ml-11">
                  Final Verification Details
                </p>
              </div>
              <div className="text-right">
                <span className="bg-green-100 text-green-700 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm">
                  Status: Ready to Save
                </span>
              </div>
            </div>

            <div className="space-y-10">
              {/* --- Section 1: Core Receipt Data (Grid 3 Columns) --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {[
                  { label: 'ใบเสร็จรับเงิน', value: confirmedRegions.receiptTaxinvoice === 'correct' ? 'ตรวจสอบพบ' : 'ไม่พบข้อมูล', status: confirmedRegions.receiptTaxinvoice, origin: '90% 0%', scale: 2 },
                  { label: 'ทะเบียนรถ', value: editableFields.plateNo || 'N/A', status: confirmedRegions.plateNo, origin: '15% 40%', scale: 3.5 },
                  { label: 'วันที่ใบเสร็จ', value: editableFields.transactionDate || 'N/A', status: confirmedRegions.transactionDate, origin: '100% 30%', scale: 2 }
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 relative transition-all hover:bg-white hover:shadow-md">
                    <div className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${item.status === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {item.status === 'correct' ? '✓ OK' : '⚠ Missing'}
                    </div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">{item.label}</label>
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
              <div className={`p-8 rounded-[40px] border-2 transition-all ${confirmedRegions.egatData === 'correct' ? 'bg-blue-50/30 border-blue-100' : 'bg-red-50/30 border-red-100'}`}>
                <div className="flex items-center justify-between mb-6">
                  <label className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em]">ข้อมูลที่อยู่และเลขภาษี กฟผ.</label>
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black ${confirmedRegions.egatData === 'correct' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
                    Coordinate: {confirmedRegions.egatData}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="aspect-video rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-gray-900">
                    <img src={debugImage} className="w-full h-full object-contain" style={{ transform: 'scale(2)', transformOrigin: '20% 20%' }} />
                  </div>
                  <div className="space-y-6">
                    <div className="bg-white/60 p-5 rounded-2xl border border-blue-50">
                      <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Address</p>
                      <p className="mt-2 text-[15px] font-black text-green-600 bg-green-50 px-2 py-1 rounded inline-block">Master Match: {masterData.egat_address_th}</p>
                    </div>
                    <div className="bg-white/60 p-5 rounded-2xl border border-blue-50">
                      <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Tax ID</p>
                      <p className={`mt-2 text-[15px] font-black px-2 py-1 rounded inline-block text-green-600 bg-green-50`}>
                        เลขประจำตัวผู้เสียภาษี: {masterData.egat_tax_id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- Section 3: Signature & Authentication --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-6 p-6 bg-gray-50/50 rounded-[32px] border border-gray-100">
                  <div className="w-32 h-20 rounded-xl overflow-hidden bg-gray-900 border-2 border-white shadow-sm">
                    <img src={debugImage} className="w-full h-full object-contain" style={{ transform: 'scale(2.5)', transformOrigin: '15% 100%' }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">การลงลายมือชื่อ</p>
                    <p className={`text-sm font-black ${confirmedRegions.signature === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                      {confirmedRegions.signature === 'correct' ? '✓ ตรวจพบลายเซ็น' : '⚠ ไม่พบลายเซ็น'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 p-6 bg-gray-50/50 rounded-[32px] border border-gray-100">
                  <div className="w-32 h-20 rounded-xl overflow-hidden bg-gray-900 border-2 border-white shadow-sm">
                    <img src={debugImage} className="w-full h-full object-contain" style={{ transform: 'scale(1.5)', transformOrigin: '80% 100%' }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ประเภทต้นฉบับ</p>
                    <p className={`text-sm font-black ${confirmedRegions.original === 'correct' ? 'text-cyan-600' : 'text-orange-600'}`}>
                      {confirmedRegions.original === 'correct' ? '✓ ต้นฉบับ (Original)' : '⚠ สำเนา (Copy)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Action Buttons --- */}
            <div className="mt-12 flex flex-col md:flex-row gap-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[24px] font-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Re-Check Image
              </button>
              <button
                onClick={handleSaveToDB}
                className="flex-[2] py-5 bg-green-500 text-white rounded-[24px] font-black text-xl shadow-2xl shadow-green-200 hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-3 animate-pulse-slow"
              >
                <Save size={24} /> Confirm & Save Report
              </button>
            </div>

            <button onClick={resetFlow} className="w-full mt-8 flex items-center justify-center gap-2 text-gray-400 font-bold text-[11px] hover:text-red-500 transition-colors uppercase tracking-tighter">
              <Trash2 size={14} /> Discard & New Upload
            </button>
          </div>
        )}
      </div>

      {/* --- Cropper Modal --- */}
      {showCropper && (
        <div className="fixed inset-0 z-[100] bg-black/95 p-8 flex flex-col">
          <div className="relative flex-1 rounded-3xl overflow-hidden"><Cropper image={imagePreviewUrl} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} /></div>
          <div className="mt-6 flex gap-4 justify-center">
            <select value={aspect} onChange={e => { setAspect(parseFloat(e.target.value)); setReceiptType(e.target.value === "1.5" ? "1" : "2") }} className="p-3 rounded-xl bg-white font-bold outline-none ring-2 ring-blue-500">
              <option value={3 / 2}>3:2 (Standard)</option>
              <option value={1 / 4}>1:4 (Long Slip)</option>
            </select>
            <button onClick={handleCropSave} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold">Apply Crop</button>
            <button onClick={() => setShowCropper(false)} className="px-10 py-3 bg-gray-700 text-white rounded-xl font-bold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadReceipt;