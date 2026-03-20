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
        <div className="mb-10 flex items-center justify-between px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {s}
              </div>
              <span className={`text-[10px] font-black uppercase ${currentStep >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Review Image' : 'Verify Data'}
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
                { id: 'receiptTaxinvoice', label: '1. ใบกำกับภาษี', color: 'border-blue-500', bg: 'bg-blue-500' },
                { id: 'plateNo', label: '2. ทะเบียนรถ', color: 'border-green-500', bg: 'bg-green-500' },
                { id: 'transactionDate', label: '3. วันที่', color: 'border-purple-500', bg: 'bg-purple-500' },
                { id: 'egatData', label: '4. ที่อยู่ กฟผ. และ เลขภาษี กฟผ.', color: 'border-red-500', bg: 'bg-red-500' },
                { id: 'signature', label: '5. ลายเซ็น', color: 'border-orange-500', bg: 'bg-orange-500' },
                { id: 'original', label: '6. ต้นฉบับ', color: 'border-cyan-500', bg: 'bg-cyan-500' },
              ];
              const currentRegion = regions[activeRegionIndex];

              return (
                <div className="space-y-8">
                  {/* --- 1. Cropped Image Area --- */}
                  <div className={`relative aspect-video rounded-3xl overflow-hidden border-4 bg-gray-900 shadow-2xl transition-all duration-500 ${currentRegion.color}`}>
                    <img
                      src={debugImage}
                      className="w-full h-full object-contain transition-all duration-700 ease-in-out"
                      alt={currentRegion.label}
                      style={{
                        // ✅ ขยายเพิ่มเป็น 2.5 เท่าเพื่อให้เห็นตัวอักษรชัดเจน
                        transform: `scale(2)`,

                        // ✅ ปรับตำแหน่งการซูมตามลำดับข้อมูลที่สแกน
                        transformOrigin: (() => {
                          switch (activeRegionIndex) {
                            case 0: return '90% 0%';  // เน้นใบเสร็จรับเงิน/ใบกำกับภาษี (Blue Box)
                            case 1: return '10% 30%';  // เน้นทะเบียนรถ (Green Box)
                            case 2: return '100% 30%';  // เน้นวันที่ (Purple Box)
                            case 3: return '20% 20%';  // เน้นที่อยู่ กฟผ. (Red Box)
                            case 4: return '15% 100%';  // เน้นลายเซ็น (Orange Box)
                            case 5: return '80% 100%';  // เน้นต้นฉบับ (Cyan Box)
                            default: return 'center';
                          }
                        })()
                      }}
                    />
                    <div className={`absolute top-4 left-4 ${currentRegion.bg} text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-lg`}>
                      FOCUSING: {currentRegion.label}
                    </div>
                  </div>

                  {/* --- 2. Text Content & Confirmation Checkbox --- */}
                  <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-inner">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Extracted Text:</p>
                      <div className="bg-white p-3 rounded-xl border border-gray-100 min-h-[50px] flex items-center">
                        <span className="text-lg font-bold text-gray-800">
                          {editableFields[currentRegion.id] || <span className="text-gray-300 italic font-normal">ไม่พบข้อมูล</span>}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {/* ปุ่ม "ผิด" (Incorrect) */}
                      <button
                        onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'incorrect' })}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md ${confirmedRegions[currentRegion.id] === 'incorrect'
                          ? 'bg-red-500 text-white scale-110'
                          : 'bg-white border-2 border-gray-200 text-gray-300 hover:border-red-400'
                          }`}
                      >
                        <XCircle size={28} />
                      </button>

                      {/* ปุ่ม "ถูก" (Correct) */}
                      <button
                        onClick={() => setConfirmedRegions({ ...confirmedRegions, [currentRegion.id]: 'correct' })}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md ${confirmedRegions[currentRegion.id] === 'correct'
                          ? 'bg-green-500 text-white scale-110'
                          : 'bg-white border-2 border-gray-200 text-gray-300 hover:border-green-400'
                          }`}
                      >
                        <CheckCircle2 size={28} />
                      </button>
                    </div>
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
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100 animate-in slide-in-from-right duration-400">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h2 className="text-2xl font-black flex items-center gap-3 text-green-600">
                <FileText size={28} /> Step 3: ยืนยันข้อมูล
              </h2>
            </div>

            <div className="space-y-8">
              {/* receipt/Taxinvoice & Plate Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- 1. มี receipt/Taxinvoice --- */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 relative transition-all hover:shadow-md">
                  {/* --- 1. Badge Status (ปรับตำแหน่งให้ลอยสวยๆ) --- */}
                  <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg tracking-wider z-10 animate-in fade-in slide-in-from-top-2 ${confirmedRegions.receiptTaxinvoice === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {confirmedRegions.receiptTaxinvoice === 'correct' ? 'มี' : 'ไม่มี'} ใบเสร็จรับเงิน/ใบกำกับภาษี
                  </div>
                  {/* --- 2. Label --- */}
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4 ml-2">
                    ใบเสร็จรับเงิน/ใบกำกับภาษี
                  </label>
                  {/* --- 3. Image Container (เพิ่ม Margin Bottom และความโค้ง) --- */}
                  <div className={`relative aspect-video rounded-[24px] overflow-hidden border-2 bg-gray-900 shadow-inner mb-6 transition-all duration-500 ${confirmedRegions.receiptTaxinvoice === 'correct' ? 'border-green-100' : 'border-red-100'
                    }`}>
                    <img
                      src={debugImage}
                      alt="Debug"
                      className="w-full h-full object-contain opacity-90"
                      style={{
                        transform: `scale(2)`,
                        transformOrigin: `90% 0%`
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  {/* --- 4. Input Field (เพิ่ม Padding และขนาด) --- */}
                  <div className="relative">
                    <p
                      className={`w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-lg transition-all outline-none focus:bg-white ${confirmedRegions.plateNo === 'correct'
                        ? 'border-gray-100 focus:border-blue-500 text-gray-700'
                        : 'border-red-100 focus:border-red-500 text-red-600'
                        }`}
                    >
                      {confirmedRegions.receiptTaxinvoice === 'correct' ? (
                        "ใบเสร็จนี้มีคำว่า ใบเสร็จรับเงิน/ใบกำกับภาษี"
                      ) : (
                        "ใบเสร็จนี้ไม่มีคำว่า ใบเสร็จรับเงิน/ใบกำกับภาษี"
                      )}
                    </p>
                  </div>
                </div>

                {/* --- 2. ทะเบียนรถ --- */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 relative transition-all hover:shadow-md">
                  {/* --- 1. Badge Status (ปรับตำแหน่งให้ลอยสวยๆ) --- */}
                  <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg tracking-wider z-10 animate-in fade-in slide-in-from-top-2 ${confirmedRegions.plateNo === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {confirmedRegions.plateNo === 'correct' ? 'มี' : 'ไม่มี'} พิกัดทะเบียนรถ
                  </div>
                  {/* --- 2. Label --- */}
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4 ml-2">
                    ทะเบียนรถ
                  </label>
                  {/* --- 3. Image Container (เพิ่ม Margin Bottom และความโค้ง) --- */}
                  <div className={`relative aspect-video rounded-[24px] overflow-hidden border-2 bg-gray-900 shadow-inner mb-6 transition-all duration-500 ${confirmedRegions.plateNo === 'correct' ? 'border-green-100' : 'border-red-100'
                    }`}>
                    <img
                      src={debugImage}
                      alt="Debug"
                      className="w-full h-full object-contain opacity-90"
                      style={{
                        transform: `scale(3.5)`,
                        transformOrigin: `15% 40%`
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  {/* --- 4. Input Field (เพิ่ม Padding และขนาด) --- */}
                  <div className="relative">
                    <p
                      className={`w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-lg transition-all outline-none focus:bg-white ${confirmedRegions.plateNo === 'correct'
                        ? 'border-gray-100 focus:border-blue-500 text-gray-700'
                        : 'border-red-100 focus:border-red-500 text-red-600'
                        }`}
                    >
                      {confirmedRegions.plateNo === 'correct' ? (
                        "ใบเสร็จนี้มีเลขทะเบียนรถ"
                      ) : (
                        "ใบเสร็จนี้ไม่มีเลขทะเบียนรถ"
                      )}
                    </p>
                    <input
                      className={`w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-lg transition-all outline-none focus:bg-white ${confirmedRegions.plateNo === 'correct'
                        ? 'border-gray-100 focus:border-blue-500 text-gray-700'
                        : 'border-red-100 focus:border-red-500 text-red-600'
                        }`}
                      value={editableFields.plateNo}
                      placeholder="กรอกทะเบียนรถ..."
                      onChange={e => setEditableFields({ ...editableFields, plateNo: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* วันที่ & signature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- 3. วันที่ --- */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 relative transition-all hover:shadow-md">
                  {/* --- 1. Badge Status (ปรับตำแหน่งให้ลอยสวยๆ) --- */}
                  <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg tracking-wider z-10 animate-in fade-in slide-in-from-top-2 ${confirmedRegions.transactionDate === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {confirmedRegions.transactionDate === 'correct' ? 'มี' : 'ไม่มี'} วันที่ใบเสร็จ
                  </div>
                  {/* --- 2. Label --- */}
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4 ml-2">
                    วันที่ใบเสร็จ
                  </label>
                  {/* --- 3. Image Container (เพิ่ม Margin Bottom และความโค้ง) --- */}
                  <div className={`relative aspect-video rounded-[24px] overflow-hidden border-2 bg-gray-900 shadow-inner mb-6 transition-all duration-500 ${confirmedRegions.transactionDate === 'correct' ? 'border-green-100' : 'border-red-100'
                    }`}>
                    <img
                      src={debugImage}
                      alt="Debug"
                      className="w-full h-full object-contain opacity-90"
                      style={{
                        transform: `scale(2)`,
                        transformOrigin: `100% 30%`
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  {/* --- 4. Input Field (เพิ่ม Padding และขนาด) --- */}
                  <div className="relative">
                    <p
                      className={`w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-lg transition-all outline-none focus:bg-white ${confirmedRegions.plateNo === 'correct'
                        ? 'border-gray-100 focus:border-blue-500 text-gray-700'
                        : 'border-red-100 focus:border-red-500 text-red-600'
                        }`}
                    >
                      {confirmedRegions.transactionDate === 'correct' ? (
                        "ใบเสร็จนี้มีวันที่ใบเสร็จ"
                      ) : (
                        "ใบเสร็จนี้ไม่มีวันที่ใบเสร็จ"
                      )}
                    </p>
                    <input
                      className={`w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-lg transition-all outline-none focus:bg-white ${confirmedRegions.plateNo === 'correct'
                        ? 'border-gray-100 focus:border-blue-500 text-gray-700'
                        : 'border-red-100 focus:border-red-500 text-red-600'
                        }`}
                      value={editableFields.transactionDate}
                      placeholder="กรอกวันที่ใบเสร็จ..."
                      onChange={e => setEditableFields({ ...editableFields, transactionDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* --- 4. signature --- */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 relative transition-all hover:shadow-md">
                  {/* --- 1. Badge Status (ปรับตำแหน่งให้ลอยสวยๆ) --- */}
                  <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg tracking-wider z-10 animate-in fade-in slide-in-from-top-2 ${confirmedRegions.signature === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {confirmedRegions.signature === 'correct' ? 'มี' : 'ไม่มี'} ลายเซ็น
                  </div>
                  {/* --- 2. Label --- */}
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4 ml-2">
                    ลายเซ็น
                  </label>
                  {/* --- 3. Image Container (เพิ่ม Margin Bottom และความโค้ง) --- */}
                  <div className={`relative aspect-video rounded-[24px] overflow-hidden border-2 bg-gray-900 shadow-inner mb-6 transition-all duration-500 ${confirmedRegions.signature === 'correct' ? 'border-green-100' : 'border-red-100'
                    }`}>
                    <img
                      src={debugImage}
                      alt="Debug"
                      className="w-full h-full object-contain opacity-90"
                      style={{
                        transform: `scale(2)`,
                        transformOrigin: `15% 100%`
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  {/* --- 4. Input Field (เพิ่ม Padding และขนาด) --- */}
                  <div className="relative">
                    <p
                      className={`w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-lg transition-all outline-none focus:bg-white ${confirmedRegions.signature === 'correct'
                        ? 'border-gray-100 focus:border-blue-500 text-gray-700'
                        : 'border-red-100 focus:border-red-500 text-red-600'
                        }`}
                    >
                      {confirmedRegions.signature === 'correct' ? (
                        "ใบเสร็จนี้มีลายเซ็น"
                      ) : (
                        "ใบเสร็จนี้ไม่มีลายเซ็น"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/*  Egat Data */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                {/* Egat Address */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 relative transition-all hover:shadow-md">
                  {/* --- 1. Badge Status (ปรับตำแหน่งให้ลอยสวยๆ) --- */}
                  <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg tracking-wider z-10 animate-in fade-in slide-in-from-top-2 ${confirmedRegions.egatData === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {confirmedRegions.egatData === 'correct' ? 'มี' : 'ไม่มี'} ข้อมูลกฟผ.
                  </div>
                  {/* --- 2. Label --- */}
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4 ml-2">
                    ที่อยู่ กฟผ. และ เลขภาษี กฟผ.
                  </label>
                  {/* --- 3. Image Container (เพิ่ม Margin Bottom และความโค้ง) --- */}
                  <div className={`relative aspect-video rounded-[24px] overflow-hidden border-2 bg-gray-900 shadow-inner mb-6 transition-all duration-500 ${confirmedRegions.signature === 'correct' ? 'border-green-100' : 'border-red-100'
                    }`}>
                    <img
                      src={debugImage}
                      alt="Debug"
                      className="w-full h-full object-contain opacity-90"
                      style={{
                        transform: `scale(2)`,
                        transformOrigin: `20% 20%`
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  {/* --- 4. Input Field (เพิ่ม Padding และขนาด) --- */}
                  <div className="relative">
                    <p
                      className={`w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-lg transition-all outline-none focus:bg-white ${confirmedRegions.egatData === 'correct'
                        ? 'border-gray-100 focus:border-blue-500 text-gray-700'
                        : 'border-red-100 focus:border-red-500 text-red-600'
                        }`}
                    >
                      {confirmedRegions.egatData === 'correct' ? (
                        "ใบเสร็จนี้มีข้อมูลกฟผ."
                      ) : (
                        "ใบเสร็จนี้ไม่มีข้อมูลกฟผ."
                      )}
                    </p>
                    <input
                      className={`w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-lg transition-all outline-none focus:bg-white ${confirmedRegions.egatData === 'correct'
                        ? 'border-gray-100 focus:border-blue-500 text-gray-700'
                        : 'border-red-100 focus:border-red-500 text-red-600'
                        }`}
                      value={editableFields.egatAddress}
                      placeholder="กรอกที่อยู่ กฟผ..."
                      onChange={e => setEditableFields({ ...editableFields, egatAddress: e.target.value })}
                    />
                    <br />
                    <p className="text-xs font-black text-gray-400 px-2 uppercase">Master {masterData.egat_address_th}</p>
                    <input
                      className={`w-full p-5 bg-gray-50 border-2 rounded-2xl font-black text-lg transition-all outline-none focus:bg-white ${confirmedRegions.egatData === 'correct'
                        ? 'border-gray-100 focus:border-blue-500 text-gray-700'
                        : 'border-red-100 focus:border-red-500 text-red-600'
                        }`}
                      value={editableFields.egatTaxId}
                      placeholder="กรอกเลขผู้เสียภาษี กฟผ..."
                      onChange={e => setEditableFields({ ...editableFields, egatTaxId: e.target.value })}
                    />
                    <br />
                    <p className="text-xs font-black text-gray-400 px-2 uppercase">Master {masterData.egat_tax_id}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button onClick={() => setCurrentStep(2)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200">
                <ArrowLeft size={20} /> Back to Image
              </button>
              <button onClick={handleSaveToDB} className="flex-[2] py-5 bg-green-500 text-white rounded-[24px] font-black text-xl shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-3">
                <Save size={24} /> Confirm & Save
              </button>
            </div>
            <button onClick={resetFlow} className="w-full mt-6 flex items-center justify-center gap-2 text-gray-400 font-bold text-sm hover:text-red-500 transition-colors">
              <Trash2 size={16} /> ล้างข้อมูลและเริ่มใหม่
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

      {/* --- Status Notification --- */}
      {statusMessage && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center font-bold animate-in slide-in-from-right-10 ${isError ? 'bg-red-500 text-white' : 'bg-white text-gray-800'}`}>
          {isError ? <AlertCircle className="mr-2" /> : <CheckCircle2 className="mr-2 text-green-500" />}
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default UploadReceipt;