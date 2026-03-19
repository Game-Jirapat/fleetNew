import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, CheckCircle, Receipt, Users, LayoutDashboard } from 'lucide-react';

const AdminDashboard = () => {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/receipts');
                setReceipts(response.data);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // สรุปสถิติ (อิงตามฟิลด์ 'approval' ในตาราง Receipts)
    const stats = useMemo(() => ({
        pending: receipts.filter(r => r.approval === 'Pending').length,
        approved: receipts.filter(r => r.approval === 'Approved').length,
        total: receipts.length
    }), [receipts]);

    /* เตรียมข้อมูลกราฟ
    const chartData = useMemo(() => {
        const monthly = {};
        receipts.forEach(r => {
            const month = new Date(r.bill_date).toISOString().substring(0, 7);
            if (!monthly[month]) monthly[month] = { month, amount: 0, count: 0 };
            monthly[month].amount += parseFloat(r.amount || 0);
            monthly[month].count += 1;
        });
        return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
    }, [receipts]);

    if (loading) return <div className="p-10 text-center">กำลังโหลดสถิติ...</div>;
*/
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div onClick={() => navigate('/admin/approvals')} className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-400 cursor-pointer hover:shadow-md transition">
                    <div className="flex items-center space-x-4">
                        <Clock className="text-yellow-500 w-10 h-10" />
                        <div>
                            <p className="text-gray-500 text-sm">รออนุมัติ</p>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                        </div>
                    </div>
                </div>
                {/* เพิ่ม Stat Card อื่นๆ ตาม Pattern เดียวกัน */}
            </div>
{/* เพิ่ม Stat Card อื่นๆ ตาม Pattern เดียวกัน 
            <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
                <h2 className="text-lg font-bold mb-4">ภาพรวมค่าใช้จ่ายรายเดือน</h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="ยอดเงินรวม" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
*/}
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