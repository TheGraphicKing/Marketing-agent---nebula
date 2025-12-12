import React, { useState } from 'react';
import { apiService } from '../services/api';
import { User, BusinessProfile } from '../types';
import { ChevronRight, Check, Users, Megaphone, Sparkles, Loader2, Building, AlertCircle } from 'lucide-react';

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
        targetAudience: '',
        brandVoice: 'Professional',
        marketingGoals: [],
        description: ''
    });

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
        }
        if (currentStep === 2) {
            if (!formData.targetAudience) return "Please describe your target audience.";
        }
        if (currentStep === 3) {
            if (formData.marketingGoals.length === 0) return "Please select at least one marketing goal.";
        }
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

    const handleSubmit = async () => {
        const validationError = validateStep(step);
        if (validationError) {
            setError(validationError);
            return;
        }

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
        { num: 3, title: "Strategy", icon: Megaphone }
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
                    </div>

                    <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end">
                        <button 
                            onClick={step === 3 ? handleSubmit : handleNext}
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Finalizing...
                                </>
                            ) : (
                                <>
                                    {step === 3 ? 'Finish Setup' : 'Continue'} <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;