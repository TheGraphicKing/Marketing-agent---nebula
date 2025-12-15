import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Loader2, Zap, Check, X as XIcon, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Password Guardrails
  const [pwdCriteria, setPwdCriteria] = useState({
      length: false,
      number: false,
      special: false,
      letter: false
  });

  useEffect(() => {
      setPwdCriteria({
          length: password.length >= 8,
          number: /\d/.test(password),
          special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
          letter: /[a-zA-Z]/.test(password)
      });
  }, [password]);

  const isPasswordValid = Object.values(pwdCriteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation Guardrails
    if (!isLogin && !isPasswordValid) {
        setError("Please ensure your password meets all security requirements.");
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        setError("Please enter a valid email address.");
        return;
    }

    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await apiService.login({ email, password });
      } else {
        response = await apiService.register({ 
            email, 
            password, 
            firstName, 
            companyName 
        });
      }

      if (response.token && response.user) {
        // Token is already saved by apiService
        onLoginSuccess(response.user);
        navigate('/dashboard');
      } else {
        setError("Authentication failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-4 text-white backdrop-blur-sm">
                <Zap className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Nebulaa AI</h1>
            <p className="text-indigo-100 text-sm mt-2">Marketing Agent & Growth Engine</p>
        </div>

        {/* Form */}
        <div className="p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
                {isLogin ? 'Welcome Back' : 'Create Secure Account'}
            </h2>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 flex items-start gap-2">
                    <XIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                            <input 
                                type="text"
                                required 
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Jane"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
                            <input 
                                type="text"
                                required 
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="Acme Inc."
                            />
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                    <input 
                        type="email"
                        required 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                    <input 
                        type="password"
                        required 
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${
                            !isLogin && !isPasswordValid && password.length > 0 ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>

                {/* Password Strength Meter (Only for Signup) */}
                {!isLogin && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs animate-in fade-in">
                        <p className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Password Requirements:
                        </p>
                        <ul className="space-y-1">
                            <CriteriaItem met={pwdCriteria.length} label="At least 8 characters" />
                            <CriteriaItem met={pwdCriteria.letter} label="Contains a letter" />
                            <CriteriaItem met={pwdCriteria.number} label="Contains a number" />
                            <CriteriaItem met={pwdCriteria.special} label="Contains a symbol (!@#$)" />
                        </ul>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading || (!isLogin && !isPasswordValid)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(null); setPassword(''); }}
                        className="text-indigo-600 font-semibold hover:underline focus:outline-none"
                    >
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

const CriteriaItem: React.FC<{ met: boolean; label: string }> = ({ met, label }) => (
    <li className={`flex items-center gap-2 ${met ? 'text-green-600' : 'text-slate-400'}`}>
        {met ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
        <span>{label}</span>
    </li>
);

export default Auth;