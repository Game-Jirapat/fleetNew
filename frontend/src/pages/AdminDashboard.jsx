import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Clock, Receipt, Users } from 'lucide-react';

const AdminDashboard = () => {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // ✅ 2. ดึงข้อมูลแบบระบุ Limit เยอะๆ หากต้องการสถิติทั้งหมดในหน้า Dashboard
                // หรือถ้ามีข้อมูลหลักหมื่น แนะนำให้ทำ Endpoint สำหรับ Summary แยกต่างหากครับ
                const response = await api.get('/receipts?limit=1000');

                // ✅ 3. เลือกดึงเฉพาะ Array จาก property .receipts
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
            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button onClick={() => navigate('/admin/users')} className="flex items-center p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50 border border-gray-100">
                    <Users className="mr-3 text-blue-500" /> จัดการผู้ใช้งาน
                </button>
                <button onClick={() => navigate('/admin/receipts')} className="flex items-center p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50 border border-gray-100">
                    <Receipt className="mr-3 text-green-500" /> รายการใบเสร็จทั้งหมด
                </button>
            </div>
        </div>
    );
};

export default AdminDashboard;