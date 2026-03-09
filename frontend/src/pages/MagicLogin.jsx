import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios'; // ใช้ axios instance ที่เราเซ็ตไว้
import { jwtDecode } from 'jwt-decode';

const MagicLogin = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('กำลังตรวจสอบสิทธิ์ผ่าน LINE...');

    useEffect(() => {
        const verifyToken = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setStatus('error');
                setMessage('ไม่พบโทเค็น (Token not found)');
                return;
            }

            try {
                // ส่งไปตรวจสอบที่ Backend (เลียนแบบอันเก่า)
                // หมายเหตุ: ต้องมั่นใจว่า Backend มี Route: POST /users/magic-login รองรับ
                const response = await api.post('/users/magic-login', { token });

                if (response.data.success || response.status === 200) {
                    const authToken = response.data.token;
                    
                    // เก็บ Token ลง LocalStorage
                    localStorage.setItem('token', authToken);
                    
                    // ถอดรหัสข้อมูล User (ถ้ามี)
                    try {
                        const decoded = jwtDecode(authToken);
                        localStorage.setItem('user', JSON.stringify(decoded));
                    } catch (e) {
                        console.error("Decode error", e);
                    }

                    setStatus('success');
                    setMessage('เข้าสู่ระบบสำเร็จ! กำลังพาคุณไปยังหน้าหลัก...');
                    
                    setTimeout(() => {
                        navigate('/dashboard', { replace: true });
                    }, 1500);
                }
            } catch (error) {
                console.error('Magic login error:', error);
                setStatus('error');
                setMessage(error.response?.data?.message || 'ลิงก์หมดอายุหรือไม่ถูกต้อง');
            }
        };

        verifyToken();
    }, [searchParams, navigate]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
                {status === 'verifying' && (
                    <div className="space-y-4">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-600 font-medium">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="text-5xl">✅</div>
                        <h2 className="text-xl font-bold text-green-600">สำเร็จ</h2>
                        <p className="text-gray-500">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="text-5xl">❌</div>
                        <h2 className="text-xl font-bold text-red-600">เกิดข้อผิดพลาด</h2>
                        <p className="text-gray-500">{message}</p>
                        <button 
                            onClick={() => navigate('/login')}
                            className="mt-4 text-blue-600 font-medium underline"
                        >
                            กลับไปหน้า Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MagicLogin;