import React, { useState } from 'react';
import { apiService } from '../services/api';
import { User, BusinessProfile, SocialConnection } from '../types';
import { ChevronRight, Check, Users, Megaphone, Sparkles, Loader2, Building, AlertCircle, Share2, Instagram, Facebook, Twitter, Linkedin, Youtube, Ghost, Pin, MessageCircle, SkipForward } from 'lucide-react';

interface OnboardingProps {
    onComplete: (user: User) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<BusinessProfile>({
        name: '',
        website: '',
        industry: '',
        niche: '',
        businessType: '',
        targetAudience: '',
        brandVoice: 'Professional',
        marketingGoals: [],
        description: ''
    });

    // Social connections state
    const [socialConnections, setSocialConnections] = useState<{platform: string; connected: boolean; username?: string}[]>([
        { platform: 'Instagram', connected: false },
        { platform: 'Facebook', connected: false },
        { platform: 'Twitter', connected: false },
        { platform: 'LinkedIn', connected: false },
        { platform: 'YouTube', connected: false },
        { platform: 'TikTok', connected: false },
    ]);
    const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authStep, setAuthStep] = useState(0);
    const [usernameInput, setUsernameInput] = useState('');

    const handleChange = (field: keyof BusinessProfile, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const toggleGoal = (goal: string) => {
        const current = formData.marketingGoals;
        if (current.includes(goal)) {
            handleChange('marketingGoals', current.filter(g => g !== goal));
        } else {
            handleChange('marketingGoals', [...current, goal]);
        }
    };

    const validateStep = (currentStep: number) => {
        if (currentStep === 1) {
            if (!formData.name || !formData.industry) return "Company Name and Industry are required.";
            if (!formData.businessType) return "Please select your business type (B2B, B2C, or Both).";
        }
        if (currentStep === 2) {
            if (!formData.targetAudience) return "Please describe your target audience.";
        }
        if (currentStep === 3) {
            if (formData.marketingGoals.length === 0) return "Please select at least one marketing goal.";
        }
        // Step 4 (socials) is optional - no validation needed
        return null;
    };

    const handleNext = () => {
        const validationError = validateStep(step);
        if (validationError) {
            setError(validationError);
            return;
        }
        setStep(prev => prev + 1);
    };

    // Social connection helpers
    const initiateConnection = (platform: string) => {
        setConnectingPlatform(platform);
        setShowAuthModal(true);
        setAuthStep(0);
        setUsernameInput('');
        setTimeout(() => setAuthStep(1), 1200);
    };

    const confirmAuth = async () => {
        if (!usernameInput && authStep === 1) return;
        setAuthStep(2);
        await new Promise(r => setTimeout(r, 1500));
        
        const newUsername = usernameInput.startsWith('@') ? usernameInput : `@${usernameInput}`;
        setSocialConnections(socialConnections.map(s => 
            s.platform === connectingPlatform 
            ? { ...s, connected: true, username: newUsername } 
            : s
        ));
        
        setTimeout(() => {
            setShowAuthModal(false);
            setConnectingPlatform(null);
        }, 800);
    };

    const disconnectPlatform = (platform: string) => {
        setSocialConnections(socialConnections.map(s => 
            s.platform === platform ? { ...s, connected: false, username: undefined } : s
        ));
    };

    const getIcon = (platform: string) => {
        switch(platform) {
            case 'Instagram': return <Instagram className="w-5 h-5" />;
            case 'Facebook': return <Facebook className="w-5 h-5" />;
            case 'Twitter': return <Twitter className="w-5 h-5" />;
            case 'LinkedIn': return <Linkedin className="w-5 h-5" />;
            case 'YouTube': return <Youtube className="w-5 h-5" />;
            case 'TikTok': return <span className="font-bold text-sm">Tk</span>;
            default: return <Share2 className="w-5 h-5" />;
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
            default: return 'bg-slate-500';
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Get connected socials to save
            const connectedSocials = socialConnections
                .filter(s => s.connected)
                .map(s => ({ platform: s.platform, username: s.username }));
            
            // Complete onboarding with business profile and connected socials
            const response = await apiService.completeOnboarding(formData, connectedSocials);
            if (response.success && response.user) {
                onComplete(response.user);
            }
        } catch (error) {
            console.error("Onboarding failed", error);
            setError("Failed to save data. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkipSocials = async () => {
        // Skip socials and just complete onboarding
        setSubmitting(true);
        try {
            const response = await apiService.completeOnboarding(formData);
            if (response.success && response.user) {
                onComplete(response.user);
            }
        } catch (error) {
            console.error("Onboarding failed", error);
            setError("Failed to save data. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        { num: 1, title: "Identity", icon: Building },
        { num: 2, title: "Audience", icon: Users },
        { num: 3, title: "Strategy", icon: Megaphone },
        { num: 4, title: "Connect", icon: Share2 }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                
                {/* Sidebar */}
                <div className="bg-indigo-600 p-8 text-white md:w-1/3 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 font-bold text-xl mb-8">
                            <Sparkles className="w-6 h-6" /> Nebulaa AI
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Let's build your agent.</h2>
                        <p className="text-indigo-200 text-sm">We need to understand your business to generate high-quality content.</p>
                    </div>

                    <div className="space-y-6 mt-8">
                        {steps.map((s) => (
                            <div key={s.num} className="flex items-center gap-3 opacity-90">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                                    step >= s.num ? 'bg-white text-indigo-600 border-white' : 'border-indigo-400 text-indigo-200'
                                }`}>
                                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                                </div>
                                <span className={`font-medium ${step === s.num ? 'text-white' : 'text-indigo-300'}`}>{s.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form Area */}
                <div className="p-8 md:w-2/3 flex flex-col">
                    <div className="flex-1">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 animate-in fade-in">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                                <h3 className="text-xl font-bold text-slate-900">Business Essentials</h3>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. Nebulaa Corp"
                                        value={formData.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Website</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. https://nebulaa.ai"
                                        value={formData.website}
                                        onChange={e => handleChange('website', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Industry <span className="text-red-500">*</span></label>
                                        <select 
                                            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                            value={formData.industry}
                                            onChange={e => handleChange('industry', e.target.value)}
                                        >
                                            <option value="">Select...</option>
                                            <option value="Ecommerce">E-commerce</option>
                                            <option value="SaaS">SaaS / Tech</option>
                                            <option value="Service">Service Business</option>
                                            <option value="Content">Content Creator</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Niche</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="e.g. Sustainable Fashion"
                                            value={formData.niche}
                                            onChange={e => handleChange('niche', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Business Type <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: 'B2B', label: 'B2B', desc: 'Business to Business' },
                                            { value: 'B2C', label: 'B2C', desc: 'Business to Consumer' },
                                            { value: 'Both', label: 'Both', desc: 'B2B & B2C' }
                                        ].map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => handleChange('businessType', option.value)}
                                                className={`p-3 rounded-lg border text-center transition-all ${
                                                    formData.businessType === option.value
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                    : 'border-slate-200 hover:border-indigo-300 text-slate-600'
                                                }`}
                                            >
                                                <div className="font-bold text-sm">{option.label}</div>
                                                <div className="text-xs opacity-70">{option.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Short Description</label>
                                    <textarea 
                                        className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                                        placeholder="What do you do?"
                                        value={formData.description}
                                        onChange={e => handleChange('description', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                                <h3 className="text-xl font-bold text-slate-900">Target Audience</h3>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Describe your ideal customer <span className="text-red-500">*</span></label>
                                    <textarea 
                                        className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
                                        placeholder="e.g. Females aged 25-34 interested in eco-friendly living, yoga, and sustainable fashion. They value transparency and organic materials."
                                        value={formData.targetAudience}
                                        onChange={e => handleChange('targetAudience', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Brand Voice</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Professional', 'Friendly', 'Witty', 'Empathetic', 'Bold', 'Educational'].map(voice => (
                                            <button
                                                key={voice}
                                                onClick={() => handleChange('brandVoice', voice)}
                                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                                    formData.brandVoice === voice 
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                                    : 'border-slate-200 hover:border-indigo-300 text-slate-600'
                                                }`}
                                            >
                                                {voice}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                                <h3 className="text-xl font-bold text-slate-900">Marketing Goals</h3>
                                <p className="text-sm text-slate-500">Select all that apply. This helps us prioritize actions. <span className="text-red-500">*</span></p>
                                
                                <div className="space-y-3">
                                    {[
                                        'Brand Awareness', 
                                        'Lead Generation', 
                                        'Direct Sales', 
                                        'Community Engagement', 
                                        'Website Traffic'
                                    ].map(goal => (
                                        <div 
                                            key={goal}
                                            onClick={() => toggleGoal(goal)}
                                            className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                                formData.marketingGoals.includes(goal)
                                                ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                                     formData.marketingGoals.includes(goal) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                                                }`}>
                                                    {formData.marketingGoals.includes(goal) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className={`font-medium ${formData.marketingGoals.includes(goal) ? 'text-indigo-900' : 'text-slate-700'}`}>{goal}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                                <h3 className="text-xl font-bold text-slate-900">Connect Your Accounts</h3>
                                <p className="text-sm text-slate-500">
                                    Link your social media accounts to enable seamless publishing and analytics. 
                                    <span className="text-indigo-600 font-medium"> This step is optional.</span>
                                </p>
                                
                                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                                    {socialConnections.map((social) => (
                                        <div 
                                            key={social.platform}
                                            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                                                social.connected
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getBgColor(social.platform)}`}>
                                                    {getIcon(social.platform)}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-slate-900">{social.platform}</span>
                                                    {social.connected && social.username && (
                                                        <p className="text-xs text-green-600">{social.username}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {social.connected ? (
                                                <button
                                                    onClick={() => disconnectPlatform(social.platform)}
                                                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    Disconnect
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => initiateConnection(social.platform)}
                                                    className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                                >
                                                    Connect
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {socialConnections.some(s => s.connected) && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
                                        <Check className="w-4 h-4" />
                                        {socialConnections.filter(s => s.connected).length} account(s) connected
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-6 mt-4 border-t border-slate-100 flex justify-between items-center">
                        {step === 4 ? (
                            <>
                                <button 
                                    onClick={handleSkipSocials}
                                    disabled={submitting}
                                    className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <SkipForward className="w-4 h-4" /> Skip for now
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" /> Finalizing...
                                        </>
                                    ) : (
                                        <>
                                            Finish Setup <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <div></div>
                                <button 
                                    onClick={handleNext}
                                    disabled={submitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70"
                                >
                                    Continue <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Auth Modal for Social Connection */}
                {showAuthModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4 animate-in zoom-in-95">
                            <div className="text-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 ${getBgColor(connectingPlatform || '')}`}>
                                    {getIcon(connectingPlatform || '')}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Connect {connectingPlatform}</h3>
                                
                                {authStep === 0 && (
                                    <div className="py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                                        <p className="text-slate-500 mt-3">Connecting to {connectingPlatform}...</p>
                                    </div>
                                )}

                                {authStep === 1 && (
                                    <div className="py-4 space-y-4">
                                        <p className="text-slate-500 text-sm">Enter your {connectingPlatform} username to connect</p>
                                        <input
                                            type="text"
                                            placeholder={`@your${connectingPlatform?.toLowerCase()}handle`}
                                            value={usernameInput}
                                            onChange={(e) => setUsernameInput(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setShowAuthModal(false); setConnectingPlatform(null); }}
                                                className="flex-1 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmAuth}
                                                disabled={!usernameInput}
                                                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Authorize
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {authStep === 2 && (
                                    <div className="py-8">
                                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                            <Check className="w-8 h-8 text-green-600" />
                                        </div>
                                        <p className="text-green-600 font-medium">Connected successfully!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;