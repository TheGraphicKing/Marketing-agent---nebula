import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Link2,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
    { path: '/competitors', label: 'Competitors', icon: Users },
    { path: '/influencers', label: 'Influencers', icon: Sparkles },
    { path: '/connect-socials', label: 'Connect Socials', icon: Link2 },
  ];

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className={`flex h-screen font-sans ${isDarkMode ? 'bg-[#070A12] text-[#ededed]' : 'bg-[#ededed] text-[#070A12]'}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 ${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-[#ffcc29]'} border-r transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
            <div className="p-6">
                <div className={`flex items-center gap-2 font-bold text-xl tracking-tight mb-2 ${isDarkMode ? 'text-[#ededed]' : 'text-[#070A12]'}`}>
                    <img src="/assets/logo.png" alt="Nebulaa Gravity" className="w-8 h-8" />
                    <span>Nebulaa Gravity</span>
                </div>
                {/* Show user's business name if available */}
                {user?.businessProfile?.name && (
                  <p className={`text-xs mb-6 pl-10 truncate ${isDarkMode ? 'text-[#ededed]/60' : 'text-[#070A12]/70'}`} title={user.businessProfile.name}>
                    for {user.businessProfile.name}
                  </p>
                )}
                {!user?.businessProfile?.name && <div className="mb-6"></div>}

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
                            ? isDarkMode 
                              ? 'bg-[#ffcc29]/20 text-[#ffcc29]' 
                              : 'bg-[#070A12] text-white'
                            : isDarkMode
                              ? 'text-[#ededed]/70 hover:bg-[#ffcc29]/10 hover:text-[#ffcc29]'
                              : 'text-[#070A12]/80 hover:bg-[#070A12]/10 hover:text-[#070A12]'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                        >
                        <Icon className={`w-5 h-5 ${isActive ? (isDarkMode ? 'text-[#ffcc29]' : 'text-white') : (isDarkMode ? 'text-[#ededed]/50' : 'text-[#070A12]/60')}`} />
                        <span>{item.label}</span>
                        </Link>
                    );
                    })}
                </nav>
            </div>

            <div className={`mt-auto p-6 border-t ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-[#070A12]/20'}`}>
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium w-full mb-2 ${
                    isDarkMode 
                      ? 'text-[#ededed]/70 hover:bg-[#ffcc29]/10 hover:text-[#ffcc29]' 
                      : 'text-[#070A12]/80 hover:bg-[#070A12]/10 hover:text-[#070A12]'
                  }`}
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                
                <nav className="space-y-1 mb-4">
                    <Link
                        to="/settings"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                            location.pathname === '/settings'
                            ? isDarkMode 
                              ? 'bg-[#ffcc29]/20 text-[#ffcc29]' 
                              : 'bg-[#070A12] text-white'
                            : isDarkMode
                              ? 'text-[#ededed]/70 hover:bg-[#ffcc29]/10 hover:text-[#ffcc29]'
                              : 'text-[#070A12]/80 hover:bg-[#070A12]/10 hover:text-[#070A12]'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <Settings className={`w-5 h-5 ${location.pathname === '/settings' ? (isDarkMode ? 'text-[#ffcc29]' : 'text-white') : (isDarkMode ? 'text-[#ededed]/50' : 'text-[#070A12]/60')}`} />
                        <span>Settings</span>
                    </Link>
                    <button 
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium w-full ${
                          isDarkMode 
                            ? 'text-[#ededed]/70 hover:bg-[#ffcc29]/10 hover:text-[#ffcc29]' 
                            : 'text-[#070A12]/80 hover:bg-[#070A12]/10 hover:text-[#070A12]'
                        }`}
                    >
                        <LogOut className={`w-5 h-5 ${isDarkMode ? 'text-[#ededed]/50' : 'text-[#070A12]/60'}`} />
                        <span>Logout</span>
                    </button>
                </nav>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isDarkMode ? 'bg-[#070A12]' : 'bg-gray-100'}`}>
        {/* Mobile Header */}
        <header className={`md:hidden ${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-[#ffcc29]'} border-b p-4 flex items-center justify-between sticky top-0 z-10`}>
          <button 
            onClick={() => setSidebarOpen(true)}
            className={isDarkMode ? 'text-[#ededed] hover:text-[#ffcc29]' : 'text-[#070A12]'}
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className={`font-bold ${isDarkMode ? 'text-[#ffcc29]' : 'text-[#070A12]'}`}>GRAVITY</span>
          <button onClick={toggleTheme} className={isDarkMode ? 'text-[#ededed]' : 'text-[#070A12]'}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;