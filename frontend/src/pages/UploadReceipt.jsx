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
        const response = await fetch(`${API}/api/master`);
        if (!response.ok) throw new Error('Failed to fetch master data');
        const data = await response.json();
        setMasterData(data);
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
            <h2 className="text-lg font-bold mb-4 flex items-center"><Scissors className="mr-2 w-5 h-5" /> Step 1: Image</h2>

            <div
              onClick={() => fileInputRef.current.click()}
              className="aspect-[3/4] border-4 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-200 transition-all overflow-hidden bg-gray-50"
            >
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} className="w-full h-full object-contain" alt="Preview" />
              ) : (
                <div className="text-center p-6">
                  <Upload className="mx-auto mb-4 text-gray-300" size={48} />
                  <p className="text-gray-400 font-medium">Click to upload receipt</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} hidden onChange={handleImageChange} accept="image/*" />

            {imagePreviewUrl && (
              <button
                onClick={() => setShowCropper(true)}
                className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center hover:bg-gray-200"
              >
                <Scissors size={18} className="mr-2" /> Crop Image
              </button>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <label className="block text-sm font-bold text-blue-700 mb-2">Receipt Layout:</label>
              <div className="flex gap-4">
                {['1', '2'].map(t => (
                  <label key={t} className="flex items-center cursor-pointer">
                    <input type="radio" className="mr-2" checked={receiptType === t} onChange={() => setReceiptType(t)} />
                    <span className="text-sm">{t === '1' ? 'Thermal Slip' : 'A4 Full Page'}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              disabled={!selectedFile || isProcessing}
              onClick={handleProcessOCR}
              className={`w-full mt-4 py-4 rounded-2xl font-black text-white shadow-lg transition-all flex items-center justify-center ${isProcessing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
            >
              {isProcessing ? <><span className="animate-spin mr-2">🌀</span> Processing...</> : <><Cpu className="mr-2" /> Start OCR</>}
            </button>
          </div>

          {/* Column 2: Form Data */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 flex items-center"><FileText className="mr-2 w-5 h-5" /> Step 2: Data</h2>
            {parsedData ? (
              <div className="space-y-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(editableFields).map((key) => (
                  key !== 'dbReceiptId' && (
                    <div key={key}>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{key}</label>
                      <input
                        className="w-full p-3 bg-gray-50 border-2 border-gray-50 rounded-xl focus:border-blue-500 outline-none font-medium"
                        value={editableFields[key]}
                        onChange={(e) => setEditableFields({ ...editableFields, [key]: e.target.value })}
                      />
                    </div>
                  )
                ))}
                <button
                  onClick={handleSaveToDB}
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black shadow-lg flex items-center justify-center transition-all"
                >
                  <Save className="mr-2" /> Confirm & Save
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                <FileText size={64} className="mb-4" />
                <p>Waiting for OCR process...</p>
              </div>
            )}
          </div>

          {/* Column 3: Debug & OCR Text */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <AlertCircle className="mr-2 w-5 h-5 text-orange-500" /> Step 3: Result
            </h2>

            {/* ส่วนแสดงรูปที่ผ่านการตีกรอบ */}
            {debugImage ? (
              <div className="mb-6 animate-in fade-in zoom-in duration-300">
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Framed Image (OCR View)</p>
                <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg">
                  {/* ✅ ใช้ debugImage ตรงๆ เพราะเราใส่ Prefix ใน Step 1 แล้ว */}
                  <img src={debugImage} className="w-full h-auto" alt="Processed View" />
                </div>
              </div>
            ) : (
              <div className="mb-6 h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center">
                <p className="text-gray-300 text-sm">No processed image yet</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- Cropper Modal --- */}
      {showCropper && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm p-8 flex flex-col">
          <div className="relative flex-1 bg-gray-800 rounded-3xl overflow-hidden">
            <Cropper
              image={imagePreviewUrl}
              crop={crop} zoom={zoom} aspect={aspect === 'free' ? undefined : aspect}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-4 items-center justify-center">
            <select onChange={(e) => setAspect(e.target.value === 'free' ? 'free' : parseFloat(e.target.value))} className="p-3 rounded-xl bg-white font-bold">
              <option value="free">Free Aspect</option>
              <option value={3 / 2}>3:2 (Receipt)</option>
              <option value={1 / 4}>1:4 (Long)</option>
            </select>
            <button onClick={handleCropSave} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold">Apply Crop</button>
            <button onClick={() => setShowCropper(false)} className="px-8 py-3 bg-gray-600 text-white rounded-xl font-bold">Cancel</button>
          </div>
        </div>
      )}

      {/* --- Status Toast --- */}
      {statusMessage && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center font-bold ${isError ? 'bg-red-500 text-white' : 'bg-white text-gray-800'}`}>
          {isError ? <AlertCircle className="mr-2" /> : <CheckCircle2 className="mr-2 text-green-500" />}
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default UploadReceipt;