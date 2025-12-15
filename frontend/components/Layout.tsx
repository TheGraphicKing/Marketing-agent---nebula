import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Link2
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Home', icon: LayoutDashboard },
    { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
    { path: '/competitors', label: 'Competitors', icon: Users }, // Icon changed to Users based on screenshot similarity, though usually Competitors might be Target/Trending
    { path: '/influencers', label: 'Influencers', icon: Users },
    { path: '/connect-socials', label: 'Connect Socials', icon: Link2 },
  ];

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
            <div className="p-6">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900 mb-8">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
                    <span>Nebulaa AI</span>
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                            isActive 
                            ? 'bg-indigo-50 text-indigo-600' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                        >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                        </Link>
                    );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-6 border-t border-slate-100">
                <nav className="space-y-1 mb-4">
                    <Link
                        to="/settings"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                            location.pathname === '/settings'
                            ? 'bg-indigo-50 text-indigo-600' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <Settings className={`w-5 h-5 ${location.pathname === '/settings' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span>Settings</span>
                    </Link>
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 w-full"
                    >
                        <LogOut className="w-5 h-5 text-slate-400" />
                        <span>Logout</span>
                    </button>
                </nav>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-slate-900">NEBULAA</span>
          <div className="w-6" /> {/* Spacer */}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;