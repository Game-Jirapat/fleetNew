import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import Pages & Components
import Login from './pages/LoginPage';
import MagicLogin from './pages/MagicLogin';
import Dashboard from './pages/AdminDashboard';
import UploadReceipt from './pages/UploadReceipt';
import ManageUser from './pages/ManageUsersPage';
import ManageReceipts from './pages/ManageReceipts';
import ReceiptDetail from './pages/ReceiptDetail';
import Navbar from './assets/Navbar';

/**
 * ProtectedRoute: ส่วนหุ้มสำหรับเส้นทางที่ต้องใช้การยืนยันตัวตน
 * หากไม่มี Token ใน LocalStorage จะถูกดีดกลับไปหน้า Login ทันที
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/login" element={<Login />} />

          {/* Magic Login: รองรับ Token ที่ส่งมาจาก LINE Webhook  */}
          <Route path="/magic-login" element={<MagicLogin />} />

          {/* --- Protected Routes (ต้อง Login ก่อนเข้าถึง) --- */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <Navbar />
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <Navbar />
                <ManageUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/receipts/:id"
            element={
              <ProtectedRoute>
                <Navbar />
                <ReceiptDetail />
              </ProtectedRoute>
            } />
          <Route
            path="/admin/receipts"
            element={
              <ProtectedRoute>
                <Navbar />
                <ManageReceipts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Navbar />
                <UploadReceipt />
              </ProtectedRoute>
            }
          />

          {/* Fallback: ถ้าเข้า Path มั่ว ให้ส่งไปหน้า Login */}
          <Route path="/*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;