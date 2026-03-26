import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User, Bell, Menu, X, ChevronDown, LayoutDashboard, Upload, Users, ReceiptText } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  // ✅ ดึงข้อมูล User และตรวจสอบสิทธิ์
  const userData = JSON.parse(localStorage.getItem('user')) || { name: 'Guest', role: 'User' };
  const isAdmin = userData.role === 'Admin'; // ✅ เช็คว่าเป็น Admin หรือไม่

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* Logo Section */}
          <div className="flex items-center">
            <Link to={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-black text-gray-800 tracking-tight">
                EGAT <span className="text-blue-600">FleetCard</span>
              </span>
            </Link>
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-sm">
                  {userData.name ? userData.name[0].toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-800 leading-none">{userData.name}</p>
                  <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-1">{userData.role}</p>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${showMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-[24px] shadow-2xl border border-gray-100 py-3 animate-in fade-in slide-in-from-top-2 z-[60]">

                  <div className="px-4 py-2 mb-2 border-b border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Navigation Menu</p>
                  </div>

                  {/* ✅ ส่วนสำหรับ ADMIN เท่านั้น */}
                  {isAdmin && (
                    <>
                      <Link to="/admin/dashboard" className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center transition-all font-bold">
                        <LayoutDashboard size={18} className="mr-3 opacity-70" /> Admin Dashboard
                      </Link>
                      <Link to="/admin/receipts" className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center transition-all font-bold">
                        <ReceiptText size={18} className="mr-3 opacity-70" /> Manage Receipts
                      </Link>
                      <Link to="/admin/users" className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center transition-all font-bold">
                        <Users size={18} className="mr-3 opacity-70" /> Manage Users
                      </Link>
                    </>
                  )}

                  {/* ✅ ส่วนสำหรับ USER ทั่วไป (และ Admin ก็เข้าได้) */}
                  <Link to="/upload" className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center transition-all font-bold">
                    <Upload size={18} className="mr-3 opacity-70" /> Upload Receipt
                  </Link>

                  <hr className="my-2 border-gray-50" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center font-black transition-colors"
                  >
                    <LogOut size={18} className="mr-3" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-gray-50 rounded-xl text-gray-600">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Optimized for Roles) */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top duration-300">
          {isAdmin && (
            <>
              <Link to="/admin/dashboard" className="block px-4 py-3 text-base font-black text-gray-700 hover:bg-gray-50 rounded-2xl transition-all">
                Admin Dashboard
              </Link>
              <Link to="/admin/receipts" className="block px-4 py-3 text-base font-black text-gray-700 hover:bg-gray-50 rounded-2xl transition-all">
                Manage Receipts
              </Link>
              <Link to="/admin/users" className="block px-4 py-3 text-base font-black text-gray-700 hover:bg-gray-50 rounded-2xl transition-all">
                Manage Users
              </Link>
            </>
          )}
          <Link to="/upload" className="block px-4 py-3 text-base font-black text-gray-700 hover:bg-gray-50 rounded-2xl transition-all">
            Upload Receipt
          </Link>

          <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-base font-black text-rose-600 bg-rose-50 rounded-2xl mt-4 flex items-center gap-2">
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;