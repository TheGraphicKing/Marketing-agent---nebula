import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Competitors from './pages/Competitors';
import Influencers from './pages/Influencers';
import ConnectSocials from './pages/ConnectSocials';
import Settings from './pages/Settings';
import { apiService } from './services/api';
import { User } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const res = await apiService.getCurrentUser();
          setUser(res.user || null);
        } catch (error) {
          console.error("Auth check failed", error);
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const handleOnboardingComplete = (updatedUser: User) => {
      setUser(updatedUser);
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Auth onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />} 
        />
        
        {/* Onboarding Route - Protected but outside main Layout if needed, or redirect check */}
        <Route 
            path="/onboarding"
            element={
                user ? (
                    !user.onboardingCompleted ? (
                        <Onboarding onComplete={handleOnboardingComplete} />
                    ) : (
                        <Navigate to="/" replace />
                    )
                ) : (
                    <Navigate to="/login" replace />
                )
            }
        />

        {/* Protected Routes wrapped in Layout */}
        <Route
          path="*"
          element={
            user ? (
              user.onboardingCompleted ? (
                <Layout user={user} onLogout={handleLogout}>
                    <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/campaigns" element={<Campaigns />} />
                    <Route path="/competitors" element={<Competitors />} />
                    <Route path="/influencers" element={<Influencers />} />
                    <Route path="/connect-socials" element={<ConnectSocials />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
              ) : (
                  <Navigate to="/onboarding" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;