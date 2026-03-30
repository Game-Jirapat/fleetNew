import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, FileText, CheckCircle2, AlertCircle, Hash, Calendar, MapPin, CreditCard } from 'lucide-react';
import api from '../api/axios';

const ReceiptDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    // --- States ---
    const [editableFields, setEditableFields] = useState({
        plateNo: '', transactionDate: '', receipt_type: ''
    });
    const [ogPicUrl, setOgPicUrl] = useState(null);
    const [framedPicUrl, setFramedPicUrl] = useState(null);
    const [masterData, setMasterData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const receiptRes = await api.get(`/receipts/${id}`);
                const data = receiptRes.data;

                // ✅ ปรับ Date Format ให้เป็น ISO สำหรับ input[type="date"] หรือจัดการตามที่ DB ต้องการ
                setEditableFields({
                    dbReceiptId: data.receipt_id,
                    plateNo: data.license_plate_no || '',
                    transactionDate: data.bill_date ? new Date(data.bill_date).toISOString().split('T')[0] : '',
                    receipt_type: data.receipt_type,
                });
                setOgPicUrl(data.og_pic);
                setFramedPicUrl(data.framed_pic);

                const masterRes = await api.get('/master');
                setMasterData(Array.isArray(masterRes.data) ? masterRes.data[0] : masterRes.data);
            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (isLoading) return <div className="p-10 text-center font-black text-blue-600 animate-pulse">กำลังโหลดข้อมูล...</div>;

    const handleUpdate = async () => {
        setIsSaving(true);
        try {
            await api.put(`/receipts/${id}/data`, {
                license_plate_no: editableFields.plateNo,
                bill_date: editableFields.transactionDate
            });
            alert('อัปเดตข้อมูลสำเร็จ! ✅');
            setIsEditing(false); // ✅ ปิดโหมดแก้ไขเมื่อบันทึกสำเร็จ
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center font-black text-blue-600 animate-pulse">กำลังโหลดข้อมูลใบเสร็จ...</div>;

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-6xl mx-auto">
                {/* --- Header Section --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white hover:bg-gray-100 rounded-2xl text-gray-400 shadow-sm transition-all"><ArrowLeft size={24} /></button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-800">Receipt Details</h1>
                            <p className="text-gray-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mt-1">ใบเสร็จ #{id}</p>
                        </div>
                    </div>

                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Edit Details
                        </button>
                    ) : (
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => setIsEditing(false)} className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black">Cancel</button>
                            <button
                                onClick={handleUpdate}
                                disabled={isSaving}
                                className="flex-1 md:flex-none px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={22} /> {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* --- Left Column: Form Fields (7 Columns) --- */}
                    <div className="lg:col-span-7 space-y-6">

                        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
                            <h2 className="text-sm font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <FileText size={18} /> OCR Result Details
                            </h2>

                            {/* 🚗 Plate No Section */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    <Hash size={14} /> 1. ทะเบียนรถ (License Plate)
                                </label>
                                {isEditing ? (
                                    <input
                                        className="w-full p-5 bg-gray-50 border-2 border-blue-500 rounded-2xl outline-none font-black text-xl text-gray-700 shadow-inner animate-in zoom-in duration-200"
                                        value={editableFields.plateNo}
                                        onChange={(e) => setEditableFields({ ...editableFields, plateNo: e.target.value })}
                                    />
                                ) : (
                                    <div className="p-5 bg-gray-50/50 rounded-2xl font-black text-2xl text-slate-800 border-2 border-transparent">
                                        {editableFields.plateNo || "N/A"}
                                    </div>
                                )}
                            </div>

                            {/* 📅 Date Section */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    <Calendar size={14} /> 2. วันที่ในใบเสร็จ (Bill Date)
                                </label>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        className="w-full p-5 bg-gray-50 border-2 border-blue-500 rounded-2xl outline-none font-black text-xl text-gray-700 shadow-inner animate-in zoom-in duration-200"
                                        value={editableFields.transactionDate}
                                        onChange={(e) => setEditableFields({ ...editableFields, transactionDate: e.target.value })}
                                    />
                                ) : (
                                    <div className="p-5 bg-gray-50/50 rounded-2xl font-black text-2xl text-slate-800 border-2 border-transparent">
                                        {editableFields.transactionDate ? new Date(editableFields.transactionDate).toLocaleDateString('th-TH') : "N/A"}
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-50" />

                            {/* 🏛️ EGAT Address Comparison */}
                            <div className="p-6 bg-blue-50/50 rounded-[32px] border border-blue-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                        <MapPin size={14} /> 3. EGAT Address
                                    </label>
                                </div>
                                {(() => {
                                    switch (editableFields.receipt_type) {
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

                            {/* 💳 Tax ID Comparison */}
                            <div className="p-6 bg-emerald-50/50 rounded-[32px] border border-emerald-100 flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                        <CreditCard size={14} /> 4. EGAT Tax ID
                                    </label>
                                    <p className="text-lg font-black text-emerald-700 tracking-wider">
                                        {masterData?.egat_tax_id}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Right Column: Evidence Images (5 Columns) --- */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-gray-100">
                            <h3 className="text-sm font-black text-gray-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                                <AlertCircle size={18} className="text-orange-400" /> Evidence Images
                            </h3>
                            <div className="space-y-8">
                                <div className="group">
                                    <p className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-wider ml-1">Framed Preview</p>
                                    <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-gray-900 transition-all group-hover:shadow-xl group-hover:-translate-y-1">
                                        <img
                                            src={framedPicUrl || ogPicUrl}
                                            className="w-full h-full object-contain opacity-90"
                                            alt="Framed"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <p className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-wider ml-1">Original Receipt</p>
                                    <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 opacity-60 hover:opacity-100 transition-all">
                                        <img
                                            src={ogPicUrl}
                                            className="w-full h-full object-contain p-2"
                                            alt="Original"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ReceiptDetail;