import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle2, XCircle, Trash2, Search, FileText, Eye, Clock, Calendar, Hash, User, Zap, CheckCircle } from 'lucide-react';
import ConfirmDeleteModal from '../assets/ConfirmDeleteModal';

const ManageReceipts = () => {
    const [receipts, setReceipts] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, total: 1 });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedItemId, setSelectedItemId] = useState(null); // เก็บ ID ตัวที่เลือกจะลบ
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [activeRegionIndex, setActiveRegionIndex] = useState(0);
    const [selectedAction, setSelectedAction] = useState({ id: null, status: '' });
    const [adminComment, setAdminComment] = useState('');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [masterData, setMasterData] = useState(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        fetchReceipts(pagination.current);
    }, [pagination.current]);

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const response = await api.get('/master');
                setMasterData(Array.isArray(response.data) ? response.data[0] : response.data);
            } catch (error) { console.error("Error fetching master data:", error); }
        };
        fetchMasterData();
    }, []);

    const allRegions = [
        { id: 'receiptTaxinvoice', label: '1. ใบกำกับภาษี', color: 'border-blue-500', bg: 'bg-blue-500', type: 'question', question: 'มีคำว่า ใบเสร็จรับเงิน/ใบกำกับภาษี หรือ Tax invoice/Receipt หรือไม่?' },
        { id: 'plateNo', label: '2. ทะเบียนรถ', color: 'border-green-500', bg: 'bg-green-500', type: 'edit' },
        { id: 'transactionDate', label: '3. วันที่', color: 'border-cyan-500', bg: 'bg-cyan-500', type: 'edit' },
        { id: 'egatData', label: '4. ที่อยู่ กฟผ. และ เลขภาษี กฟผ.', color: 'border-red-500', bg: 'bg-red-500', type: 'question', question: 'มีที่อยู่ และเลขภาษี กฟผ. หรือไม่?' },
        { id: 'signature', label: '5. ลายเซ็น', color: 'border-pink-500', bg: 'bg-pink-500', type: 'question', question: 'มีลายเซ็นหรือไม่?' },
        { id: 'original', label: '6. ต้นฉบับ', color: 'border-yellow-500', bg: 'bg-yellow-500', type: 'question', question: 'เป็นเอกสารฉบับจริง/ต้นฉบับหรือไม่?' },
    ];
    const currentRegion = allRegions[activeRegionIndex];

    const fetchReceipts = async (page = 1) => {
        try {
            const response = await api.get(`/receipts?page=${page}&limit=10`);
            setReceipts(response.data.receipts); // เก็บเฉพาะ array ข้อมูล
            setPagination({
                current: response.data.currentPage,
                total: response.data.totalPages
            });
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    const handleViewDetail = (item) => {
        setSelectedReceipt(item);
        setIsDetailModalOpen(true);
        setAdminComment(''); // ล้างคอมเมนต์เก่า
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            await api.patch(`/receipts/${selectedAction.id}/status`, {
                approval: selectedAction.status,
                comment: adminComment
            });
            setAdminComment('');
            fetchReceipts();
            console.log(`Receipt ID ${selectedAction.id} updated to ${selectedAction.status} with comment: ${adminComment}`);
            setIsActionModalOpen(false);
            setSelectedReceipt(''); // ล้างข้อมูลใบเสร็จที่เลือก
        } catch (error) {
            alert("บันทึกไม่สำเร็จ: " + error.message);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/receipts/${selectedItemId}`);
            fetchReceipts();
        } catch (error) { alert("Delete failed"); }
    };

    const pendingItems = receipts.filter(r => r.approval === 'Pending');
    const allItems = receipts.filter(r => {
        // กรองด้วยทะเบียนรถ หรือ ชื่อผู้ใช้
        const matchesSearch =
            r.license_plate_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.users?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        // กรองด้วยช่วงวันที่ (ถ้ามีการเลือก)
        const receiptDate = new Date(r.bill_date).getTime();
        const start = startDate ? new Date(startDate).getTime() : -Infinity;
        const end = endDate ? new Date(endDate).getTime() : Infinity;
        const matchesDate = receiptDate >= start && receiptDate <= end;

        return matchesSearch && matchesDate;
    });

    return (
        <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Receipt Management</h1>
                        <div className="text-slate-500 font-medium">จัดการและตรวจสอบรายการใบเสร็จทั้งหมดในระบบ</div>
                    </div>
                </div>

                {/* --- PENDING APPROVAL (Cards) --- */}
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-8 bg-amber-400 rounded-full"></div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider">Pending Tasks</h2>
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black shadow-sm shadow-amber-100">
                            {pendingItems.length} NEW
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {pendingItems.map((item) => (
                            <div key={item.receipt_id} className="group bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="relative h-56 overflow-hidden">
                                    <img src={item.og_pic} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Receipt" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-2xl shadow-lg border border-white/20">
                                        <div className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Plate No.</div>
                                        <div className="font-black text-slate-800 leading-none">{item.license_plate_no}</div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Calendar size={12} className="mr-1" /> Date</div>
                                            <div className="font-bold text-slate-700">{new Date(item.bill_date).toLocaleDateString()}</div>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <div className="flex items-center justify-end text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Hash size={12} className="mr-1" /> ID</div>
                                            <div className="font-bold text-slate-700">#{item.receipt_id}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleViewDetail(item)}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
                                        >
                                            <Eye size={20} /> Review Detail
                                        </button>
                                        <button
                                            onClick={() => { setSelectedItemId(item.receipt_id); setIsDeleteModalOpen(true); }}
                                            className="px-4 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"
                                        >
                                            <Trash2 size={22} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- ALL RECORDS (Table) --- */}
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider">Historical Data</h2>
                        <div className="flex flex-col lg:flex-row gap-4 mb-8">

                            {/* 🔍 ค้นหาทะเบียนหรือชื่อผู้ใช้ */}
                            <div className="relative group flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="ค้นหาเลขทะเบียน หรือ ชื่อผู้ใช้..."
                                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-transparent bg-white shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* 📅 ตัวกรองช่วงวันที่ (Date Range) */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="pl-4 pr-10 py-3 rounded-2xl border-2 border-transparent bg-white shadow-sm focus:border-blue-500 outline-none transition-all font-bold text-slate-500 text-sm"
                                        onChange={(e) => setStartDate(e.target.value)}
                                        title="วันที่เริ่มต้น"
                                    />
                                </div>
                                <div className="flex items-center text-slate-400 font-bold hidden sm:block">ถึง</div>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="pl-4 pr-10 py-3 rounded-2xl border-2 border-transparent bg-white shadow-sm focus:border-blue-500 outline-none transition-all font-bold text-slate-500 text-sm"
                                        onChange={(e) => setEndDate(e.target.value)}
                                        title="วันที่สิ้นสุด"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                                        <th className="px-8 py-5">Receipt Info</th>
                                        <th className="px-8 py-5">Uploader</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5 text-right italic">Options</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-medium">
                                    {allItems.map((item) => (
                                        <tr key={item.receipt_id} className="group hover:bg-blue-50/30 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                                                        <img src={item.og_pic} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="font-black text-slate-800">{item.license_plate_no}</div>
                                                        <div className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10} /> {new Date(item.bill_date).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><User size={14} /></div>
                                                    <div className="text-sm font-bold">{item.users?.name || "Unknown User"}</div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${item.approval === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                    item.approval === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${item.approval === 'Approved' ? 'bg-emerald-500' :
                                                        item.approval === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500'
                                                        }`} />
                                                    {item.approval}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => navigate(`/admin/receipts/${item.receipt_id}`)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="View Detail">
                                                        <Eye size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedItemId(item.receipt_id); setIsDeleteModalOpen(true); }}
                                                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">
                            Page {pagination.current} of {pagination.total}
                        </div>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.current === 1}
                                onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                                className="px-6 py-2 bg-gray-50 text-gray-500 rounded-xl font-black hover:bg-gray-100 disabled:opacity-30 transition-all"
                            >
                                Previous
                            </button>
                            <button
                                disabled={pagination.current === pagination.total}
                                onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-30 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* --- MODAL --- */}
            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="ยืนยันการลบข้อมูล"
                itemName={`ใบเสร็จหมายเลข #${selectedItemId}`}
                message="คุณต้องการลบข้อมูลใบเสร็จนี้ออกจากระบบถาวรใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
            />

            {isDetailModalOpen && selectedReceipt && (
                <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    {/* ✅ จุดที่ 1: ต้องระบุความสูงที่แน่นอน เช่น h-[95vh] หรือ h-[900px] และ flex-col */}
                    <div className="bg-white w-full max-w-7xl h-[95vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Receipt Verification Center</h3>
                                    <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">ID: #{selectedReceipt.receipt_id}</div>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 transition-all active:scale-90"><XCircle size={28} /></button>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

                            {/* --- 📝 LEFT COLUMN (70%): Verification Checklist with Zoomed Images --- */}
                            <div className="lg:w-[70%] h-full overflow-y-auto p-8 bg-slate-50/50 space-y-6">

                                <div className="grid grid-cols-1 gap-4">
                                    {[
                                        { id: 'receiptTaxinvoice', label: '1. ใบกำกับภาษี', value: '', color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100' },
                                        { id: 'plateNo', label: '2. ทะเบียนรถ', value: selectedReceipt.license_plate_no, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
                                        { id: 'transactionDate', label: '3. วันที่', value: new Date(selectedReceipt.bill_date).toLocaleDateString('th-TH'), color: 'text-cyan-600', bg: 'bg-cyan-50/50', border: 'border-cyan-100' },
                                        { id: 'egatData', label: '4. ข้อมูล กฟผ.', value: '', color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100' },
                                        { id: 'signature', label: '5. ลายเซ็น', value: '', color: 'text-pink-600', bg: 'bg-pink-50/50', border: 'border-pink-100' },
                                        { id: 'original', label: '6. ต้นฉบับ', value: '', color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100' }
                                    ].filter(r => !(selectedReceipt.receipt_type === '2' && r.id === 'signature')).map((region, idx) => (

                                        /* ✅ Card ที่มีรูปซูมขนาดใหญ่คู่กับหัวข้อ */
                                        <div key={idx} className={`${region.bg} p-5 rounded-[32px] border-2 ${region.border} shadow-sm flex flex-col md:flex-row gap-6 transition-all hover:bg-white hover:shadow-md`}>

                                            {/* Image Zoom Area (ขนาดใหญ่ขึ้นตามต้องการ) */}
                                            <div className="w-full md:w-[500px] h-[250px] rounded-2xl overflow-hidden border-2 border-white bg-slate-900 shadow-inner shrink-0 relative">
                                                <img
                                                    src={selectedReceipt.og_pic}
                                                    className="w-full h-full object-contain opacity-95"
                                                    style={{
                                                        transform: `scale(${selectedReceipt.receipt_type === '2' ? 5 : 1.8})`, // ✅ ปรับ Scale ให้ใหญ่ขึ้น
                                                        transformOrigin: (() => {
                                                            if (selectedReceipt.receipt_type === '2') { // ✅ สำหรับใบเสร็จยาว
                                                                switch (region.id) {
                                                                    case 'receiptTaxinvoice': return '50% 60%'; case 'plateNo': return '50% 90%'; case 'transactionDate': return '50% 70%'; case 'egatData': return '50% 99%'; case 'original': return '50% 100%'; default: return 'center';
                                                                }
                                                            } else { // ✅ สำหรับใบเสร็จปกติ
                                                                switch (region.id) {
                                                                    case 'receiptTaxinvoice': return '90% 5%'; case 'plateNo': return '15% 40%'; case 'transactionDate': return '90% 35%'; case 'egatData': return '15% 25%'; case 'signature': return '15% 99%'; case 'original': return '90% 99%'; default: return 'center';
                                                                }
                                                            }
                                                        })()
                                                    }}
                                                />
                                            </div>

                                            {/* Text Data */}
                                            <div className="flex-1 flex flex-col justify-center">
                                                <div className="text-xl font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{region.label}</div>
                                                <div className={`text-2xl font-black tracking-tight ${region.color}`}>
                                                    {region.value || ""}
                                                    {region.id === 'egatData' && (
                                                        <div>
                                                            <span className="text-xl text-rose-600">{masterData?.egat_tax_id}</span>
                                                            {(() => {
                                                                switch (selectedReceipt.receipt_type) {
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
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Admin Action Section */}
                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6 mt-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Feedback (LINE Notification)</label>
                                        <textarea
                                            value={adminComment}
                                            onChange={(e) => setAdminComment(e.target.value)}
                                            placeholder="พิมพ์เหตุผลการพิจารณา เพื่อส่งแจ้งเตือนไปยังผู้ใช้..."
                                            className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[28px] outline-none font-bold text-slate-700 focus:border-blue-500 focus:bg-white transition-all min-h-[120px]"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => { setSelectedAction({ id: selectedReceipt.receipt_id, status: 'Rejected' }); handleStatusUpdate(); }} className="flex-1 py-5 bg-rose-500 text-white rounded-[24px] font-black shadow-lg active:scale-95 transition-all hover:bg-rose-600 uppercase tracking-widest">Reject</button>
                                        <button onClick={() => { setSelectedAction({ id: selectedReceipt.receipt_id, status: 'Approved' }); handleStatusUpdate(); }} className="flex-[2] py-5 bg-emerald-500 text-white rounded-[24px] font-black shadow-xl active:scale-95 transition-all hover:bg-emerald-600 uppercase tracking-widest">Approve & Save</button>
                                    </div>
                                </div>
                            </div>

                            {/* --- 🖼️ RIGHT COLUMN (30%): Full Image Reference --- */}
                            <div className="lg:w-[30%] h-full p-8 flex flex-col gap-8 overflow-y-auto border-l border-white/5">
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1 h-1 bg-slate-500 rounded-full" /> Original (og img)
                                    </div>
                                    <div className="rounded-3xl overflow-hidden border-2 border-slate-700 bg-black/20 aspect-[3/4]">
                                        <img src={selectedReceipt.og_pic} className="w-full h-full object-contain" alt="Original Full" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1 h-1 bg-blue-500 rounded-full" /> Framed (framed img)
                                    </div>
                                    <div className="rounded-3xl overflow-hidden border-2 border-blue-900/50 bg-black/20 aspect-[3/4]">
                                        <img src={selectedReceipt.framed_pic} className="w-full h-full object-contain" alt="Framed Full" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageReceipts;