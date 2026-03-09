import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios'; // เปลี่ยนมาใช้ Axios
import { Trash2, UserCog, Search } from 'lucide-react';

function ManageUsersPage() {
    const [users, setUsers] = useState([]);
    const [filterName, setFilterName] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data.data || response.data); // รองรับโครงสร้าง { success, data }
        } catch (err) {
            console.error("Fetch users failed", err);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleRoleUpdate = async (id, newRole) => {
        try {
            await api.put(`/users/${id}`, { role: newRole }); // เปลี่ยนจาก roles -> role
            fetchUsers();
        } catch (err) { alert("Update failed"); }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`ลบผู้ใช้ ${name}?`)) {
            try {
                await api.delete(`/users/${id}`);
                fetchUsers();
            } catch (err) { alert("Delete failed"); }
        }
    };

    const filteredUsers = useMemo(() =>
        users.filter(u => u.name?.toLowerCase().includes(filterName.toLowerCase()))
        , [users, filterName]);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center"><UserCog className="mr-2" /> จัดการผู้ใช้งาน</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อ..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        onChange={(e) => setFilterName(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">ID</th>
                            <th className="p-4 font-semibold text-gray-600">ชื่อ</th>
                            <th className="p-4 font-semibold text-gray-600">LINE ID</th>
                            <th className="p-4 font-semibold text-gray-600">สิทธิ์ใช้งาน</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.user_id} className="border-b hover:bg-gray-50 transition">
                                <td className="p-4 text-sm text-gray-500">{user.user_id}</td>
                                <td className="p-4 font-medium">{user.name}</td>
                                <td className="p-4 text-xs font-mono text-gray-400">{user.line_id || '-'}</td>
                                <td className="p-4">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleUpdate(user.user_id, e.target.value)}
                                        className="border rounded px-2 py-1 text-sm bg-transparent"
                                    >
                                        <option value="User">User</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleDelete(user.user_id, user.name)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ManageUsersPage;