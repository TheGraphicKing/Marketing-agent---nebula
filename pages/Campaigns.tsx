import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Campaign } from '../types';
import { Plus, Sparkles, Filter, Loader2, Calendar, BarChart3, Image as ImageIcon, Video, X, ChevronRight, Check, Eye, MousePointer, Archive, Send, Edit3, DollarSign } from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

type TabView = 'all' | 'draft' | 'posted' | 'archived' | 'analytics';

const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, [activeTab]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      // If analytic, we still fetch all to aggregate data
      const queryStatus = activeTab === 'all' || activeTab === 'analytics' ? undefined : activeTab;
      const response = await apiService.getCampaigns(queryStatus);
      setCampaigns(response.campaigns || []);
    } catch (error) {
      console.error("Failed to fetch campaigns", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignCreated = (newCampaign: Campaign) => {
    setCampaigns([newCampaign, ...campaigns]);
    setIsModalOpen(false);
    setActiveTab('draft'); // Switch to draft view to see new campaign
  };

  const renderContent = () => {
      if (activeTab === 'analytics') {
          return <CampaignAnalytics campaigns={campaigns} />;
      }

      if (loading) {
          return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
          );
      }

      if (campaigns.length === 0) {
          return (
              <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Filter className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No campaigns found</h3>
                  <p className="text-slate-500 mb-6">There are no campaigns in this view.</p>
                  <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-bold hover:underline">Create one now</button>
              </div>
          );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
                <CampaignCard key={campaign._id} campaign={campaign} />
            ))}
        </div>
      );
  };

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Campaign Manager</h1>
            <p className="text-slate-500">Plan, execute, and analyze your marketing efforts.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
            <Plus className="w-5 h-5" />
            New Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-8 overflow-x-auto">
        <div className="flex space-x-6 min-w-max">
            {[
                { id: 'all', label: 'All Campaigns' },
                { id: 'draft', label: 'Drafts' },
                { id: 'posted', label: 'Posted' },
                { id: 'archived', label: 'Archived' },
                { id: 'analytics', label: 'Analytics' }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabView)}
                    className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === tab.id 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    {tab.id === 'analytics' && <BarChart3 className="w-4 h-4" />}
                    {tab.label}
                    {tab.id !== 'analytics' && tab.id !== 'all' && (
                        <span className="ml-1 bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">
                            {/* In a real app we'd fetch counts, here we just show dots if loaded */}
                           {activeTab === tab.id && campaigns.length}
                        </span>
                    )}
                </button>
            ))}
        </div>
      </div>

      {renderContent()}

      {isModalOpen && (
          <CreateCampaignModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={handleCampaignCreated}
          />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const CampaignAnalytics: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
    // Aggregate Data
    const totalImpressions = campaigns.reduce((acc, c) => acc + (c.performance?.impressions || 0), 0);
    const totalSpend = campaigns.reduce((acc, c) => acc + (c.performance?.spend || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.performance?.clicks || 0), 0);
    
    // Mock time-series data
    const chartData = [
        { name: 'Mon', impressions: 4000, spend: 120 },
        { name: 'Tue', impressions: 3000, spend: 100 },
        { name: 'Wed', impressions: 2000, spend: 80 },
        { name: 'Thu', impressions: 2780, spend: 90 },
        { name: 'Fri', impressions: 1890, spend: 50 },
        { name: 'Sat', impressions: 2390, spend: 110 },
        { name: 'Sun', impressions: 3490, spend: 130 },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2"><Eye className="w-4 h-4" /> Total Impressions</p>
                    <p className="text-3xl font-bold text-slate-900">{totalImpressions.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Total Spend</p>
                    <p className="text-3xl font-bold text-slate-900">${totalSpend.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2"><MousePointer className="w-4 h-4" /> Total Clicks</p>
                    <p className="text-3xl font-bold text-slate-900">{totalClicks.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6">Performance Over Time</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                            <YAxis axisLine={false} tickLine={false} />
                            <RechartsTooltip />
                            <Area type="monotone" dataKey="impressions" stroke="#6366f1" fillOpacity={1} fill="url(#colorImp)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const CampaignCard: React.FC<{ campaign: Campaign }> = ({ campaign }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
        <div className="p-5 border-b border-slate-100">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900 text-sm">{campaign.name}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                    campaign.status === 'posted' ? 'bg-blue-100 text-blue-700' :
                    campaign.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                }`}>
                    {campaign.status}
                </span>
            </div>
            <div className="flex flex-col gap-1 text-xs text-slate-500">
                <p>Platform: <span className="text-slate-700 font-medium capitalize">{campaign.platforms[0]}</span></p>
                <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{campaign.scheduling.startDate} at {campaign.scheduling.postTime}</span>
                </div>
            </div>
        </div>

        {/* Content Preview */}
        <div className="p-5 flex-1">
            <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100 h-24 overflow-hidden relative group">
                 {campaign.creative.imageUrls?.[0] ? (
                    <div className="flex gap-4 h-full">
                        <img 
                            src={campaign.creative.imageUrls[0]} 
                            alt="Campaign Creative" 
                            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                        />
                        <p className="text-xs text-slate-600 line-clamp-3 italic">"{campaign.creative.textContent}"</p>
                    </div>
                ) : (
                    <p className="text-xs text-slate-600 italic">"{campaign.creative.textContent}"</p>
                )}
            </div>

            {/* Metrics */}
            {campaign.performance && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">IMPRESSIONS</p>
                        <p className="text-sm font-bold text-slate-900">{campaign.performance.impressions.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">ENGAGEMENT</p>
                        <p className="text-sm font-bold text-slate-900">{campaign.performance.engagement.toLocaleString()}</p>
                    </div>
                </div>
            )}
            {!campaign.performance && (
                <div className="text-center py-2 text-xs text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
                    No analytics yet
                </div>
            )}
        </div>

        {/* Action Footer */}
        <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end gap-2">
            {campaign.status === 'draft' && (
                <button className="text-xs font-bold text-indigo-600 px-3 py-1.5 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-200 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Edit
                </button>
            )}
             {campaign.status === 'draft' && (
                <button className="text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded hover:bg-indigo-700 flex items-center gap-1">
                    <Send className="w-3 h-3" /> Post
                </button>
            )}
            {campaign.status === 'posted' && (
                <button className="text-xs font-bold text-slate-500 px-3 py-1.5 hover:bg-slate-200 rounded flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Archive
                </button>
            )}
        </div>
    </div>
);

// --- MODAL (Kept concise for length) ---
const CreateCampaignModal: React.FC<{ onClose: () => void; onSuccess: (c: Campaign) => void }> = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    
    // Form State (Simplified for this file size)
    const [name, setName] = useState('');
    const [objective, setObjective] = useState<'awareness' | 'traffic' | 'sales'>('awareness');
    const [platform, setPlatform] = useState('Instagram');
    const [startDate, setStartDate] = useState('');
    const [postTime, setPostTime] = useState('');
    const [creativeType, setCreativeType] = useState<'image' | 'video'>('image');
    const [caption, setCaption] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        try {
            const res = await apiService.generateCaption(name || 'Campaign Idea');
            setCaption(res.caption);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const { campaign } = await apiService.createCampaign({
                name,
                objective: objective as any,
                platforms: [platform.toLowerCase()],
                status: 'draft',
                creative: { type: creativeType, textContent: caption, imageUrls: [] },
                scheduling: { startDate: startDate || new Date().toISOString(), postTime: postTime }
            });
            onSuccess(campaign);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[600px] flex overflow-hidden">
                <div className="w-64 bg-slate-50 border-r border-slate-200 p-8 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-900 mb-8">Create Campaign</h2>
                    <div className="space-y-6">
                         {[1, 2, 3].map(s => (
                             <div key={s} className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === s ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>{s}</div>
                                 <span className={step === s ? 'text-indigo-600 font-bold' : 'text-slate-500'}>Step {s}</span>
                             </div>
                         ))}
                    </div>
                </div>
                <div className="flex-1 p-8 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        {step === 1 && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold">Details</h3>
                                <input className="w-full p-3 border rounded-lg" placeholder="Campaign Name" value={name} onChange={e => setName(e.target.value)} />
                                <div className="grid grid-cols-3 gap-2">{['Awareness', 'Traffic', 'Sales'].map(o => <button key={o} onClick={() => setObjective(o.toLowerCase() as any)} className={`p-2 border rounded ${objective === o.toLowerCase() ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : ''}`}>{o}</button>)}</div>
                            </div>
                        )}
                        {step === 2 && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold">Schedule</h3>
                                <input type="date" className="w-full p-3 border rounded-lg" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <input type="time" className="w-full p-3 border rounded-lg" value={postTime} onChange={e => setPostTime(e.target.value)} />
                            </div>
                        )}
                        {step === 3 && (
                             <div className="space-y-4">
                                 <h3 className="text-xl font-bold">Creative</h3>
                                 <div className="flex justify-between"><label>Caption</label><button onClick={handleGenerateAI} className="text-indigo-600 font-bold flex gap-1"><Sparkles className="w-4 h-4"/> Generate AI</button></div>
                                 <textarea className="w-full h-32 p-3 border rounded-lg" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Ad copy..." />
                             </div>
                        )}
                    </div>
                    <div className="flex justify-between pt-4 border-t">
                        <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)} className="px-4 py-2 text-slate-600">Back</button>
                        <button onClick={step === 3 ? handleSubmit : () => setStep(s => s + 1)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Campaigns;