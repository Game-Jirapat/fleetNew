import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User as UserIcon, Mail, Calendar, ShieldCheck, Fingerprint, Receipt, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const UserDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- States ---
    const [userData, setUserData] = useState(null);
    const [userReceipts, setUserReceipts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editRole, setEditRole] = useState('');

    useEffect(() => {
        const fetchUserFullData = async () => {
            try {
                const userRes = await api.get(`/users/${id}`);
                const data = Array.isArray(userRes.data) ? userRes.data[0] : userRes.data;

                if (data) {
                    setUserData(data);
                    setEditRole(data.data.role);
                    // ✅ ให้เช็คค่าจากตัวแปร data โดยตรง ไม่เช็คจาก userData ในฟังก์ชันนี้
                    console.log("Real-time Data set to state:", data);
                }

                const receiptsRes = await api.get(`/receipts/user/${id}?limit=100`);
                setUserReceipts(receiptsRes.data.receipts || []);

            } catch (err) {
                console.error("Fetch detail failed", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserFullData();
    }, [id]);

    const handleUpdateRole = async () => {
        setIsSaving(true);
        try {
            await api.put(`/users/${id}`, { role: editRole });
            alert("อัปเดตสิทธิ์การใช้งานสำเร็จ");
        } catch (err) {
            alert("Update failed");
        } finally {
            setIsSaving(false);
        }
    };

    // 1. ตรวจสอบเงื่อนไข Loading ด้านบนสุดของ Component
    if (isLoading || !userData) {
        return <div className="p-20 text-center font-black text-blue-600 animate-pulse">LOADING PROFILE...</div>;
    }
    console.log("Rendering with userData:", editRole); // ✅ ตรวจสอบค่าที่ใช้ในการ render ว่าตรงกับที่คาดหวังหรือไม่
    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-6xl mx-auto">
                {/* --- Navigation & Actions --- */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-800 font-black transition-all group"
                    >
                        <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-gray-100"><ArrowLeft size={20} /></div>
                        BACK TO LIST
                    </button>
                    <button
                        onClick={handleUpdateRole}
                        disabled={isSaving}
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        <Save size={20} /> {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* --- Left Column: User Profile Card --- */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5"><UserIcon size={120} /></div>

                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-24 h-24 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-4xl shadow-inner mb-4">
                                    {/* ✅ ใช้ ?. เพื่อรอข้อมูลจริงมา */}
                                    {userData?.data?.name ? userData.data.name[0].toUpperCase() : '?'}
                                </div>
                                <h2 className="text-2xl font-black text-gray-800">
                                    {userData?.data?.name || 'Loading Name...'} {/* ✅ กันเหนียว */}
                                </h2>
                                <span className="px-4 py-1 bg-blue-50 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 border border-blue-100">
                                    {userData?.data?.role || 'Loading Role...'}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">User Identity</p>
                                    <p className="font-mono text-xs text-gray-600 flex items-center gap-2"><Fingerprint size={14} /> ID: #{userData.data?.user_id}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">LINE ID</p>
                                    <p className="text-sm font-bold text-gray-700 break-all">{userData.data?.line_user_id || 'Not Linked'}</p>
                                </div>
                                <div className="p-4 bg-white border-2 border-blue-100 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1"><ShieldCheck size={14} />Edit Access Role</p>
                                    <select
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                        className="w-full bg-transparent font-black text-gray-700 outline-none cursor-pointer"
                                    >
                                        <option value="User">Standard User</option>
                                        <option value="Admin">Administrator</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Right Column: Stats & Receipts --- */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Quick Stats Dashboard */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                                <div className="p-3 bg-amber-50 text-amber-500 w-fit rounded-2xl mb-3"><Clock size={20} /></div>
                                <p className="text-2xl font-black text-gray-800">{userReceipts.filter(r => r.approval === 'Pending').length}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
                            </div>
                            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                                <div className="p-3 bg-emerald-50 text-emerald-500 w-fit rounded-2xl mb-3"><CheckCircle size={20} /></div>
                                <p className="text-2xl font-black text-gray-800">{userReceipts.filter(r => r.approval === 'Approved').length}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Approved</p>
                            </div>
                            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                                <div className="p-3 bg-blue-50 text-blue-500 w-fit rounded-2xl mb-3"><Receipt size={20} /></div>
                                <p className="text-2xl font-black text-gray-800">{userReceipts.length}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Receipts</p>
                            </div>
                        </div>

                        {/* Recent Activity Table */}
                        <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm flex items-center gap-2">
                                    <Calendar size={18} className="text-blue-500" /> Recent Activity
                                </h3>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Last 100 Transactions</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">License Plate</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {userReceipts.map(receipt => (
                                            <tr key={receipt.receipt_id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-4 text-xs font-bold text-gray-500">
                                                    {new Date(receipt.bill_date).toLocaleDateString('th-TH')}
                                                </td>
                                                <td className="px-8 py-4 font-black text-gray-700">{receipt.license_plate_no}</td>
                                                <td className="px-8 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${receipt.approval === 'Approved' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                                        receipt.approval === 'Rejected' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                                                            'bg-amber-50 text-amber-500 border-amber-100'
                                                        }`}>
                                                        {receipt.approval}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetailPage;