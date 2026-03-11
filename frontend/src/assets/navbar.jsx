import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User, Bell, Menu, X, ChevronDown } from 'lucide-react';
import { LayoutDashboard, Upload, Users, ReceiptText } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  // ดึงข้อมูล User จาก localStorage (ที่เก็บไว้ตอน Login)
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'Admin', role: 'Staff' };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/admin/dashboard" className="flex-shrink-0 flex items-center">
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
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {user.name[0]}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-800 leading-none">{user.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role}</p>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2">

                  {/* 1. Dashboard */}
                  <Link to="/admin/dashboard" className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                    <LayoutDashboard size={18} className="mr-3 text-gray-400" /> Dashboard
                  </Link>

                  {/* 2. Upload Receipt */}
                  <Link to="/upload" className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                    <Upload size={18} className="mr-3 text-gray-400" /> Upload Receipt
                  </Link>

                  {/* 3. Manage Receipts */}
                  <Link to="/admin/receipts" className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                    <ReceiptText size={18} className="mr-3 text-gray-400" /> Manage Receipts
                  </Link>

                  {/* 4. Manage Users */}
                  <Link to="/admin/users" className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                    <Users size={18} className="mr-3 text-gray-400" /> Manage Users
                  </Link>

                  <hr className="my-2 border-gray-50" />

                  {/* 5. Sign Out */}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center font-bold transition-colors"
                  >
                    <LogOut size={18} className="mr-3" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-6 space-y-1">
          <Link to="/admin/dashboard" className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-xl">Dashboard</Link>
          <Link to="/admin/receipts" className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-xl">Receipts</Link>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-base font-medium text-red-600">Sign Out</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;