import React, { useState } from 'react';
import { Save, AlertCircle, Check } from 'lucide-react';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Profile');
  const [emailNotifications, setEmailNotifications] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({
      companyName: 'Nebulaa Corp',
      industry: 'E-commerce',
      email: 'admin@nebulaa.ai'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
      }
      setSaveStatus('idle');
  };

  const validate = () => {
      const newErrors: Record<string, string> = {};
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.industry.trim()) newErrors.industry = 'Industry is required';
      if (!formData.email.includes('@') || !formData.email.includes('.')) newErrors.email = 'Please enter a valid email';
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
      if (!validate()) return;
      
      setSaveStatus('saving');
      setTimeout(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 flex-shrink-0">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 space-y-1">
                {['Profile', 'Notifications', 'Security', 'Billing'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tab 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
             </div>
          </div>

          {/* Content */}
          <div className="flex-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                  {activeTab === 'Profile' && (
                      <div className="animate-in fade-in duration-300">
                          <h2 className="text-lg font-bold text-slate-900 mb-6">Profile Settings</h2>
                          
                          <div className="space-y-6 mb-8">
                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Company Name</label>
                                      <input 
                                        type="text" 
                                        value={formData.companyName}
                                        onChange={e => handleChange('companyName', e.target.value)}
                                        className={`w-full p-3 border rounded-lg text-slate-900 outline-none focus:ring-2 transition-all ${errors.companyName ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-500'}`}
                                      />
                                      {errors.companyName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.companyName}</p>}
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Industry</label>
                                      <input 
                                        type="text" 
                                        value={formData.industry}
                                        onChange={e => handleChange('industry', e.target.value)}
                                        className={`w-full p-3 border rounded-lg text-slate-900 outline-none focus:ring-2 transition-all ${errors.industry ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-500'}`}
                                      />
                                      {errors.industry && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.industry}</p>}
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Email Address</label>
                                  <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={e => handleChange('email', e.target.value)}
                                    className={`w-full p-3 border rounded-lg text-slate-900 outline-none focus:ring-2 transition-all ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-500'}`}
                                  />
                                  {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
                              </div>
                          </div>

                          <div className="border-t border-slate-100 pt-8 mb-8">
                              <h3 className="text-lg font-bold text-slate-900 mb-6">Preferences</h3>
                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                  <div>
                                      <p className="font-bold text-slate-900">Email Notifications</p>
                                      <p className="text-sm text-slate-500">Receive weekly digests and campaign alerts.</p>
                                  </div>
                                  <button 
                                    onClick={() => setEmailNotifications(!emailNotifications)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${emailNotifications ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                  >
                                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${emailNotifications ? 'left-7' : 'left-1'}`}></div>
                                  </button>
                              </div>
                          </div>

                          <button 
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className={`px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm ${
                                saveStatus === 'saved' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                              {saveStatus === 'saving' ? (
                                  <>Saving...</>
                              ) : saveStatus === 'saved' ? (
                                  <><Check className="w-4 h-4" /> Saved Successfully</>
                              ) : (
                                  <><Save className="w-4 h-4" /> Save Changes</>
                              )}
                          </button>
                      </div>
                  )}

                  {activeTab !== 'Profile' && (
                      <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                          <p>Advanced settings for {activeTab} coming soon.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;