import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle2, XCircle, Trash2, Search, Eye, Clock, Calendar, Hash, User } from 'lucide-react';
import ConfirmDeleteModal from '../assets/ConfirmDeleteModal';

const ManageReceipts = () => {
    const [receipts, setReceipts] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, total: 1 });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedItemId, setSelectedItemId] = useState(null); // ✅ เก็บ ID ตัวที่เลือกจะลบ
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState({ id: null, status: '' });
    const [adminComment, setAdminComment] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchReceipts(pagination.current);
    }, [pagination.current]);

    const presets = {
        Approved: ["ข้อมูลถูกต้องครบถ้วน", "ตรวจสอบแล้วผ่านเกณฑ์", "เอกสารต้นฉบับชัดเจน"],
        Rejected: ["รูปภาพไม่ชัดเจน", "ทะเบียนรถไม่ตรงกับใบเสร็จ", "ที่อยู่ กฟผ. ไม่ถูกต้อง", "ไม่พบลายเซ็น"]
    };

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

    const handleStatusUpdate = async (newStatus) => {
        try {
            await api.patch(`/receipts/${selectedAction.id}/status`, {
                approval: selectedAction.status,
                comment: adminComment
            });
            setIsActionModalOpen(false);
            setAdminComment('');
            fetchReceipts();
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
    const allItems = receipts.filter(r =>
        r.license_plate_no?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Receipt Management</h1>
                        <p className="text-slate-500 font-medium">จัดการและตรวจสอบรายการใบเสร็จทั้งหมดในระบบ</p>
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
                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Plate No.</p>
                                        <p className="font-black text-slate-800 leading-none">{item.license_plate_no}</p>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-1">
                                            <p className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Calendar size={12} className="mr-1" /> Date</p>
                                            <p className="font-bold text-slate-700">{new Date(item.bill_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="flex items-center justify-end text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Hash size={12} className="mr-1" /> ID</p>
                                            <p className="font-bold text-slate-700">#{item.receipt_id}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => {
                                            setSelectedAction({ id: item.receipt_id, status: 'Approved' });
                                            setIsActionModalOpen(true);
                                        }}
                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                                        >Approve</button>
                                        <button onClick={() => {
                                            setSelectedAction({ id: item.receipt_id, status: 'Rejected' });
                                            setIsActionModalOpen(true);
                                        }}
                                            className="px-4 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"
                                        ><XCircle size={22} /></button>
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
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="ค้นหาเลขทะเบียนรถ..."
                                className="w-full md:w-80 pl-12 pr-4 py-3 rounded-2xl border-2 border-transparent bg-white shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
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
                                                        <p className="font-black text-slate-800">{item.license_plate_no}</p>
                                                        <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10} /> {new Date(item.bill_date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><User size={14} /></div>
                                                    <p className="text-sm font-bold">{item.users?.name || "Unknown User"}</p>
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
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">
                            Page {pagination.current} of {pagination.total}
                        </p>
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
            {isActionModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
                        {/* Header */}
                        <div className={`p-8 text-white ${selectedAction.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                            <h3 className="text-2xl font-black flex items-center gap-3">
                                {selectedAction.status === 'Approved' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                                Confirm {selectedAction.status}
                            </h3>
                            <p className="opacity-80 font-bold text-sm mt-1 uppercase tracking-widest">ยืนยันการทำรายการสำหรับ ID: #{selectedAction.id}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Comment Input */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Comment / Reason</label>
                                <textarea
                                    value={adminComment}
                                    onChange={(e) => setAdminComment(e.target.value)}
                                    placeholder="พิมพ์เหตุผลหรือเลือกจากด้านล่าง..."
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-50 rounded-2xl outline-none font-bold text-gray-700 focus:border-blue-500 focus:bg-white transition-all min-h-[100px]"
                                />
                            </div>

                            {/* Presets */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quick Presets</p>
                                <div className="flex flex-wrap gap-2">
                                    {presets[selectedAction.status].map((text, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setAdminComment(text)}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-black transition-all active:scale-95"
                                        >
                                            + {text}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsActionModalOpen(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleStatusUpdate}
                                    className={`flex-[2] py-4 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95 ${selectedAction.status === 'Approved' ? 'bg-emerald-500 shadow-emerald-100' : 'bg-rose-500 shadow-rose-100'
                                        }`}
                                >
                                    ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageReceipts;