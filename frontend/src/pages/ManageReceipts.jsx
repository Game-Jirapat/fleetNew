import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle, XCircle, Trash2, Search, Eye, Filter } from 'lucide-react';

const ManageReceipts = () => {
    const [receipts, setReceipts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchReceipts();
    }, []);

    const fetchReceipts = async () => {
        try {
            const response = await api.get('/receipts');
            setReceipts(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching receipts:", error);
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/receipts/${id}`, { approval: status });
            fetchReceipts(); // Refresh ข้อมูล
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) {
            try {
                await api.delete(`/receipts/${id}`);
                fetchReceipts();
            } catch (error) {
                alert("Delete failed");
            }
        }
    };

    // แยกกลุ่มข้อมูล
    const pendingItems = receipts.filter(r => r.approval === 'Pending');
    const allItems = receipts.filter(r =>
        r.license_plate_no?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 p-6 bg-gray-50 min-h-screen">

            {/* --- SECTION 1: APPROVAL ZONE (PENDING) --- */}
            <section>
                <div className="flex items-center mb-4">
                    <div className="w-2 h-8 bg-yellow-400 rounded-full mr-3"></div>
                    <h2 className="text-2xl font-black text-gray-800">Pending Approval</h2>
                    <span className="ml-3 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold">
                        {pendingItems.length} รายการใหม่
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingItems.map((item) => (
                        <div key={item.receipt_id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="relative h-48 bg-gray-200">
                                <img src={item.og_pic} alt="Receipt" className="w-full h-full object-cover" />
                                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-xl text-xs font-bold">
                                    {item.license_plate_no}
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Date</p>
                                        <p className="font-bold text-gray-800">{new Date(item.bill_date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Amount</p>
                                        <p className="font-bold text-blue-600 text-lg">฿{item.amount || '0.00'}</p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleStatusUpdate(item.receipt_id, 'Approved')}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl flex items-center justify-center transition-all"
                                    >
                                        <CheckCircle size={18} className="mr-2" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(item.receipt_id, 'Rejected')}
                                        className="flex-1 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold py-3 rounded-2xl flex items-center justify-center transition-all"
                                    >
                                        <XCircle size={18} className="mr-2" /> Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {pendingItems.length === 0 && <p className="text-gray-400 italic">ไม่มีรายการรออนุมัติ</p>}
                </div>
            </section>

            <hr className="border-gray-200" />

            {/* --- SECTION 2: SEARCH & MANAGEMENT ZONE --- */}
            <section>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center">
                        <div className="w-2 h-8 bg-blue-600 rounded-full mr-3"></div>
                        <h2 className="text-2xl font-black text-gray-800">All Records</h2>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="ค้นหาด้วยทะเบียนรถ..."
                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-black">
                                <th className="px-6 py-4">Receipt Info</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {allItems.map((item) => (
                                <tr key={item.receipt_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden mr-3 border border-gray-100">
                                                <img src={item.og_pic} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{item.license_plate_no}</p>
                                                <p className="text-xs text-gray-400">{new Date(item.bill_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                        {item.user?.name || "N/A"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.approval === 'Approved' ? 'bg-green-100 text-green-700' :
                                            item.approval === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {item.approval}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => navigate(`/admin/receipts/${item.receipt_id}`)} // ✅ ทำการ Navigate ไปยังหน้า Detail ตาม ID
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="ดูรายละเอียดและแก้ไข"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.receipt_id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default ManageReceipts;