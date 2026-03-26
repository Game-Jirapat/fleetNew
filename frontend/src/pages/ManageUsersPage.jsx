import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Trash2, UserCog, Search, ShieldCheck, User as UserIcon, Fingerprint, Eye } from 'lucide-react';
// ✅ นำเข้า Modal จาก assets
import ConfirmDeleteModal from '../assets/ConfirmDeleteModal';

function ManageUsersPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [filterName, setFilterName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // --- State สำหรับ Modal ลบผู้ใช้ ---
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState({ id: null, name: '' });

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data.data || response.data);
        } catch (err) {
            console.error("Fetch users failed", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // ✅ เปลี่ยนจาก window.confirm เป็นการเปิด Modal แทน
    const openDeleteModal = (id, name) => {
        setUserToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        try {
            await api.delete(`/users/${userToDelete.id}`);
            setIsDeleteModalOpen(false);
            fetchUsers();
        } catch (err) {
            alert("Delete failed");
        }
    };

    const filteredUsers = useMemo(() =>
        users.filter(u => u.name?.toLowerCase().includes(filterName.toLowerCase()))
        , [users, filterName]);

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header & Search (เหมือนเดิม) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center gap-3">
                            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                                <UserCog size={28} />
                            </div>
                            Manage Users
                        </h1>
                        <p className="text-gray-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mt-2 ml-16">
                            จัดการสิทธิ์และข้อมูลผู้ใช้งานในระบบ
                        </p>
                    </div>

                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อผู้ใช้งาน..."
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent rounded-2xl shadow-sm outline-none focus:border-blue-500 transition-all font-bold text-gray-700"
                            onChange={(e) => setFilterName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">User ID</th>
                                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</th>
                                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Role</th>
                                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map(user => (
                                    <tr key={user.user_id} className="group hover:bg-blue-50/30 transition-all duration-300">
                                        <td className="p-6 text-sm font-mono text-gray-400">#{user.user_id}</td>
                                        <td className="p-6 font-black text-gray-700">{user.name}</td>
                                        <td className="p-6">
                                            {user.role === 'Admin' ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                                    <ShieldCheck size={16} />
                                                    Admin
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                                                    <UserIcon size={16} />
                                                    User
                                                </div>
                                            )}
                                        </td>
                                        {/* --- Actions Column --- */}
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* ✅ ปุ่ม Eye สำหรับไปหน้า Detail */}
                                                <button
                                                    onClick={() => navigate(`/admin/users/${user.user_id}`)}
                                                    className="p-3 text-blue-400 hover:text-white hover:bg-blue-500 rounded-2xl transition-all active:scale-90 shadow-sm hover:shadow-blue-100"
                                                    title="View Details"
                                                >
                                                    <Eye size={20} />
                                                </button>

                                                {/* ปุ่ม Delete เดิม */}
                                                <button
                                                    onClick={() => openDeleteModal(user.user_id, user.name)}
                                                    className="p-3 text-rose-400 hover:text-white hover:bg-rose-500 rounded-2xl transition-all active:scale-90 shadow-sm hover:shadow-rose-100"
                                                    title="Delete User"
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

                {/* ✅ ใช้งาน ConfirmDeleteModal ที่ท้ายไฟล์ */}
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={executeDelete}
                    title="ลบผู้ใช้งาน"
                    itemName={userToDelete.name}
                    message="คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งานรายนี้? ข้อมูลทั้งหมดของผู้ใช้จะถูกลบออกถาวร"
                />
            </div>
        </div>
    );
}

export default ManageUsersPage;