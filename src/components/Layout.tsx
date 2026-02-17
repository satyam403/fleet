import { Outlet, NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  FileText, 
  Package, 
  Settings,
  Menu,
  X,
  LogOut,
  User
} from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useState } from 'react';
import path from 'path';

export function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { path: '/inspection', label: t('nav.inspection'), icon: ClipboardCheck },
     {path:'/Inspectionself',label:t('nav.Inspectionself'),icon:ClipboardCheck},
    { path: '/work-orders', label: t('nav.workOrders'), icon: FileText },
    { path: '/inventory', label: t('nav.inventory'), icon: Package },
    { path: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{t('app.name')}</h1>
            <p className="text-sm text-slate-400">{t('app.tagline')}</p>
          </div>
          <button 
            className="lg:hidden text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout Button */}
        {user && (
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            © 2026 FleetOps
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <button 
            className="lg:hidden text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1" />
          
          <LanguageSwitcher />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}