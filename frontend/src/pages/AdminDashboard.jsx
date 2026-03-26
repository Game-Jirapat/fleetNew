import React, { useState, useEffect, useMemo } from 'react';
import { Zap, Clock, ShieldCheck, Search, LayoutDashboard, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AdminDashboard = () => {
    const [receipts, setReceipts] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/receipts?limit=10');
                if (response.data && response.data.receipts) {
                    setReceipts(response.data.receipts);
                } else {
                    setReceipts([]); // Fallback
                }
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setReceipts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ✅ 4. เพิ่ม Safety Check ใน useMemo
    const stats = useMemo(() => {
        // ตรวจสอบว่าเป็น Array ก่อน Filter เพื่อป้องกัน App ค้าง
        const data = Array.isArray(receipts) ? receipts : [];
        return {
            pending: data.filter(r => r.approval === 'Pending').length,
            approved: data.filter(r => r.approval === 'Approved').length,
            total: data.length
        };
    }, [receipts]);

    const filteredReceipts = receipts.filter(r =>
        r.license_plate_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div onClick={() => navigate('/admin/receipts')} className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-400 cursor-pointer hover:shadow-md transition">
                    <div className="flex items-center space-x-4">
                        <Clock className="text-yellow-500 w-10 h-10" />
                        <div>
                            <p className="text-gray-500 text-sm">รออนุมัติ</p>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                            <LayoutDashboard size={28} />
                        </div>
                        Welcome Back, Admin
                    </h1>
                    <p className="text-gray-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mt-2 ml-16 flex items-center gap-2">
                        <Calendar size={12} className="text-blue-500" />
                        {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* --- Quick Search ใน Dashboard (ค้นหาตามทะเบียนรถ) --- */}
                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ค้นหาทะเบียนรถอย่างรวดเร็ว..."
                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent rounded-2xl shadow-sm outline-none focus:border-blue-500 transition-all font-bold text-gray-700"
                    />
                </div>
            </div>
            <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
                    <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm flex items-center gap-3">
                        <div className="p-2.5 bg-gray-50 text-gray-400 w-fit rounded-xl border border-gray-100"><FileText size={18} /></div>
                        Recent FleetCard Activity
                    </h3>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        showing last 10 entries
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User ID</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">License Plate</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bill Date</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="p-20 text-center font-black text-gray-300 animate-pulse uppercase tracking-[0.3em]">
                                        Loading recent activity...
                                    </td>
                                </tr>
                            ) : filteredReceipts.length > 0 ? (
                                filteredReceipts.map(receipt => (
                                    <tr key={receipt.receipt_id} className="group hover:bg-blue-50/30 transition-all duration-300">
                                        <td className="px-8 py-5">
                                            <span className="flex items-center gap-2 font-mono text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-lg w-fit">
                                                <ShieldCheck size={12} /> #{receipt.user_id}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 font-black text-gray-700">{receipt.license_plate_no}</td>
                                        <td className="px-8 py-5">
                                            <span className="flex items-center gap-2 text-sm font-bold text-gray-500">
                                                <Calendar size={14} className="text-gray-300" />
                                                {new Date(receipt.bill_date).toLocaleDateString('th-TH')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 w-fit ${receipt.approval === 'Approved' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                                receipt.approval === 'Rejected' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                                                    'bg-amber-50 text-amber-500 border-amber-100'
                                                }`}>
                                                <Zap size={10} className={receipt.approval === 'Approved' ? 'text-emerald-500' : receipt.approval === 'Rejected' ? 'text-rose-500' : 'text-amber-500'} />
                                                {receipt.approval}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                                        ไม่พบรายการใบเสร็จ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;