import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { SocialConnection } from '../types';
import { Loader2, RefreshCw, Check, X, Instagram, Facebook, Twitter, Linkedin, Youtube, Video, AlertCircle, ShieldCheck, Ghost, MessageCircle, Pin } from 'lucide-react';

const ConnectSocials: React.FC = () => {
  const [socials, setSocials] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Simulation State
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [showFakeAuthWindow, setShowFakeAuthWindow] = useState(false);
  const [authStep, setAuthStep] = useState(0); // 0: loading, 1: consent, 2: success
  const [usernameInput, setUsernameInput] = useState('');

  useEffect(() => {
    loadSocials();
  }, []);

  const loadSocials = async () => {
    try {
      const res = await apiService.getSocials();
      setSocials(res.connections || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const initiateConnection = (platform: string) => {
      setConnectingPlatform(platform);
      setShowFakeAuthWindow(true);
      setAuthStep(0);
      setUsernameInput('');
      
      // Simulate redirection delay
      setTimeout(() => setAuthStep(1), 1200);
  };

  const confirmFakeAuth = async () => {
      if (!usernameInput && authStep === 1) return; // Require input simulation
      
      setAuthStep(2); // Connecting state inside modal
      
      // Simulate API call to backend exchange token
      await new Promise(r => setTimeout(r, 1500));
      
      const newUsername = usernameInput.startsWith('@') ? usernameInput : `@${usernameInput}`;
      
      setSocials(socials.map(s => 
        s.platform === connectingPlatform 
        ? { ...s, connected: true, username: newUsername, status: 'active' } 
        : s
      ));
      
      setTimeout(() => {
          setShowFakeAuthWindow(false);
          setConnectingPlatform(null);
      }, 1000);
  };

  const handleDisconnect = async (platform: string) => {
      setSocials(socials.map(s => s.platform === platform ? { ...s, connected: false } : s));
  };

  const getIcon = (platform: string) => {
      switch(platform) {
          case 'Instagram': return <Instagram className="w-6 h-6 text-white" />;
          case 'Facebook': return <Facebook className="w-6 h-6 text-white" />;
          case 'Twitter': return <Twitter className="w-6 h-6 text-white" />;
          case 'LinkedIn': return <Linkedin className="w-6 h-6 text-white" />;
          case 'YouTube': return <Youtube className="w-6 h-6 text-white" />;
          case 'TikTok': return <span className="text-white font-bold text-xl" style={{ fontFamily: 'sans-serif' }}>Tk</span>;
          case 'Snapchat': return <Ghost className="w-6 h-6 text-white" />;
          case 'Pinterest': return <Pin className="w-6 h-6 text-white" />;
          case 'Reddit': return <MessageCircle className="w-6 h-6 text-white" />;
          default: return <Video className="w-6 h-6 text-white" />;
      }
  };

  const getBgColor = (platform: string) => {
    switch(platform) {
        case 'Instagram': return 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500';
        case 'Facebook': return 'bg-[#1877F2]';
        case 'Twitter': return 'bg-[#1DA1F2]';
        case 'LinkedIn': return 'bg-[#0A66C2]';
        case 'YouTube': return 'bg-[#FF0000]';
        case 'TikTok': return 'bg-black';
        case 'Snapchat': return 'bg-[#FFFC00] text-black'; // Snapchat yellow
        case 'Pinterest': return 'bg-[#BD081C]';
        case 'Reddit': return 'bg-[#FF4500]';
        default: return 'bg-slate-500';
    }
  };

  // Helper for text color on bright backgrounds (Snapchat)
  const getIconColorClass = (platform: string) => {
      return platform === 'Snapchat' ? 'text-black' : 'text-white';
  };

  const getCustomIcon = (platform: string) => {
       if (platform === 'Snapchat') return <Ghost className="w-6 h-6 text-black" />;
       return getIcon(platform);
  };

  return (
    <div className="max-w-5xl mx-auto relative">
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Connect Socials</h1>
            <p className="text-slate-500">Securely connect your platforms to enable auto-posting and analytics.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-bold text-blue-700">
            <ShieldCheck className="w-4 h-4" /> Secure OAuth 2.0 Connection
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {socials.map((social) => (
              <div key={social.platform} className={`bg-white rounded-xl p-5 shadow-sm border transition-all duration-200 relative overflow-hidden group ${social.connected ? 'border-green-200 ring-1 ring-green-100' : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}>
                  {social.connected && (
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                          CONNECTED
                      </div>
                  )}
                  
                  <div className="flex items-start gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${getBgColor(social.platform)}`}>
                          {getCustomIcon(social.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-base">{social.platform}</h3>
                          {social.connected ? (
                              <p className="text-xs text-slate-500 font-medium truncate">{social.username}</p>
                          ) : (
                              <p className="text-xs text-slate-400">Not connected</p>
                          )}
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-auto">
                      {social.connected ? (
                           <>
                             <button className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                <RefreshCw className="w-3 h-3" /> Sync
                             </button>
                             <button 
                                onClick={() => handleDisconnect(social.platform)}
                                className="px-3 py-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 text-xs font-bold rounded-lg transition-colors"
                             >
                                Unlink
                             </button>
                           </>
                      ) : (
                          <button 
                            onClick={() => initiateConnection(social.platform)}
                            className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                             Connect {social.platform}
                          </button>
                      )}
                  </div>
              </div>
          ))}
      </div>

      {/* Simulated OAuth Popup Modal */}
      {showFakeAuthWindow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                  {/* Fake Browser Header */}
                  <div className="bg-slate-100 border-b border-slate-200 p-3 flex items-center gap-2 flex-shrink-0">
                      <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="flex-1 bg-white border border-slate-200 rounded text-[10px] text-slate-500 px-2 py-1 text-center truncate mx-4 flex items-center justify-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          https://api.{connectingPlatform?.toLowerCase()}.com/oauth/v2/authorize
                      </div>
                  </div>

                  <div className="p-8 text-center flex-1 flex flex-col items-center justify-center overflow-y-auto">
                      {authStep === 0 && (
                          <div className="space-y-4">
                              <div className="relative">
                                  <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center opacity-50 ${getBgColor(connectingPlatform || '')}`}>
                                      {getCustomIcon(connectingPlatform || '')}
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-md" />
                                  </div>
                              </div>
                              <p className="text-slate-600 font-medium animate-pulse">Contacting {connectingPlatform}...</p>
                          </div>
                      )}

                      {authStep === 1 && (
                          <div className="space-y-6 w-full animate-in slide-in-from-bottom-4 duration-300">
                              <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg ${getBgColor(connectingPlatform || '')}`}>
                                  {getCustomIcon(connectingPlatform || '')}
                              </div>
                              <div>
                                  <h3 className="text-xl font-bold text-slate-900">Authorize Nebulaa AI</h3>
                                  <p className="text-sm text-slate-500 mt-2">
                                      Nebulaa is requesting access to your {connectingPlatform} account to publish posts and view analytics.
                                  </p>
                              </div>

                              <div className="text-left bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Enter {connectingPlatform} Username</label>
                                  <input 
                                    type="text" 
                                    autoFocus
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    placeholder="e.g. nebulaa_official"
                                    value={usernameInput}
                                    onChange={(e) => setUsernameInput(e.target.value)}
                                  />
                              </div>

                              <div className="flex flex-col gap-3 w-full">
                                  <button 
                                    onClick={confirmFakeAuth}
                                    disabled={!usernameInput}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-md transition-colors"
                                  >
                                      Authorize App
                                  </button>
                                  <button 
                                    onClick={() => setShowFakeAuthWindow(false)}
                                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-lg transition-colors"
                                  >
                                      Cancel
                                  </button>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                  By authorizing, you agree to our Terms of Service.
                              </p>
                          </div>
                      )}

                      {authStep === 2 && (
                          <div className="space-y-6 animate-in zoom-in duration-300">
                              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-sm">
                                  <Check className="w-10 h-10" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-slate-900">Successfully Connected!</h3>
                                <p className="text-slate-500 mt-1">Redirecting you back to the dashboard...</p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ConnectSocials;