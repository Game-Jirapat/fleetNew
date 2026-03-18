import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api/axios'; //

const ReceiptDetail = () => {
    const { id } = useParams(); // รับ Receipt ID จาก URL /receipts/:id
    const navigate = useNavigate();

    // --- States ---
    const [editableFields, setEditableFields] = useState(null);
    const [ogPicUrl, setOgPicUrl] = useState(null);
    const [framedPicUrl, setFramedPicUrl] = useState(null);
    const [masterData, setMasterData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- 1. Fetch ข้อมูลใบเสร็จ และ Master Data ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // ดึงข้อมูลใบเสร็จเก่า
                const receiptRes = await api.get(`/receipts/${id}`);
                const data = receiptRes.data;

                setEditableFields({
                    dbReceiptId: data.id,
                    plateNo: data.license_plate_no || '',
                    transactionDate: data.bill_date ? new Date(data.bill_date).toLocaleDateString('en-GB') : '',
                    egatAddress: data.egat_address || '',
                    egatTaxId: data.egat_tax_id || ''
                });
                setOgPicUrl(data.og_pic);
                setFramedPicUrl(data.framed_pic);

                // ดึง Master Data มาเปรียบเทียบ
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

    // --- 2. Save Changes ---
    const handleUpdate = async () => {
        setIsSaving(true);
        try {
            await api.put(`/receipts/${id}`, {
                ...editableFields,
                approval: 'Pending' // ส่งกลับไปรอตรวจสอบใหม่
            });
            alert('แก้ไขข้อมูลสำเร็จ! ✅');
            navigate('/admin/receipts');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center font-bold">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold">
                        <ArrowLeft size={20} /> ย้อนกลับ
                    </button>
                    <h1 className="text-2xl font-black text-gray-800">แก้ไขข้อมูลใบเสร็จ #{id}</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ฝั่งซ้าย: ข้อมูลที่แก้ไขได้สลับกับ Master Data */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">

                        {/* 1. Plate No */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Plate No</label>
                            <input
                                className="w-full p-4 bg-gray-50 border-2 border-gray-50 rounded-2xl outline-none font-bold text-gray-700 focus:border-blue-500"
                                value={editableFields.plateNo}
                                onChange={(e) => setEditableFields({ ...editableFields, plateNo: e.target.value })}
                            />
                        </div>

                        {/* 2. Transaction Date */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">2. Transaction Date</label>
                            <input
                                className="w-full p-4 bg-gray-50 border-2 border-gray-50 rounded-2xl outline-none font-bold text-gray-700 focus:border-blue-500"
                                value={editableFields.transactionDate}
                                onChange={(e) => setEditableFields({ ...editableFields, transactionDate: e.target.value })}
                            />
                        </div>

                        {/* 3. EGAT Address (Comparison) */}
                        <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">3. EGAT Address (ปัจจุบัน)</label>
                                <textarea
                                    rows="2"
                                    className="w-full p-3 bg-white border-2 border-blue-50 rounded-xl font-bold text-sm"
                                    value={editableFields.egatAddress}
                                    onChange={(e) => setEditableFields({ ...editableFields, egatAddress: e.target.value })}
                                />
                            </div>
                            <div className="pt-2 border-t border-blue-100">
                                <label className="block text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">🎯 Master Data Address</label>
                                <p className="text-xs font-bold text-green-800">
                                    {/[ก-ฮ]/.test(editableFields.egatAddress) ? masterData?.egat_address_th : masterData?.egat_address_eng}
                                </p>
                            </div>
                        </div>

                        {/* 4. EGAT Tax ID (Comparison) */}
                        <div className="p-5 bg-orange-50/50 rounded-3xl border border-orange-100 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">4. EGAT Tax ID (ปัจจุบัน)</label>
                                <input
                                    className={`w-full p-3 bg-white border-2 rounded-xl font-black ${editableFields.egatTaxId !== '0994000244843' ? 'border-red-300 text-red-600' : 'border-orange-50'}`}
                                    value={editableFields.egatTaxId}
                                    onChange={(e) => setEditableFields({ ...editableFields, egatTaxId: e.target.value })}
                                />
                            </div>
                            <div className="pt-2 border-t border-orange-100">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🎯 Master Tax ID</label>
                                <p className="text-sm font-black text-gray-400">0994000244843</p>
                            </div>
                        </div>

                        <button
                            onClick={handleUpdate}
                            disabled={isSaving}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg transition-all"
                        >
                            <Save className="inline mr-2" /> {isSaving ? 'Saving...' : 'Update Receipt Data'}
                        </button>
                    </div>

                    {/* ฝั่งขวา: รูปภาพใบเสร็จหลักฐาน */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                                <AlertCircle size={16} /> Evidence Images
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Framed Image (รูปที่มีการตีกรอบ)</p>
                                    <img src={framedPicUrl || ogPicUrl} className="w-full rounded-2xl border-2 border-gray-100 shadow-sm" alt="Framed" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Original Image (รูปต้นฉบับ)</p>
                                    <img src={ogPicUrl} className="w-full rounded-2xl border-2 border-gray-100 opacity-70" alt="Original" />
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