import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Campaign } from '../types';
import { Plus, Sparkles, Filter, Loader2, Calendar, BarChart3, Image as ImageIcon, Video, X, ChevronRight, Check, Eye, MousePointer, Archive, Send, Edit3, DollarSign, RefreshCw, Wand2, Instagram, Facebook, Twitter, Linkedin, Youtube, Clock, Heart, MessageCircle, Share2, Zap } from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

type TabView = 'suggestions' | 'all' | 'draft' | 'posted' | 'archived' | 'analytics';

interface SuggestedCampaign {
    id: string;
    title: string;
    caption: string;
    imageUrl: string;
    platform: string;
    objective: string;
    hashtags: string[];
    bestTime: string;
    estimatedReach: string;
}

const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('suggestions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suggestedCampaigns, setSuggestedCampaigns] = useState<SuggestedCampaign[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState<SuggestedCampaign | null>(null);

  useEffect(() => {
    if (activeTab === 'suggestions') {
      generateSuggestions();
    } else {
      loadCampaigns();
    }
  }, [activeTab]);

  const generateSuggestions = async () => {
    setLoadingSuggestions(true);
    
    // Generate AI-powered campaign suggestions
    const suggestions: SuggestedCampaign[] = [
      {
        id: '1',
        title: 'Holiday Season Flash Sale',
        caption: "🎄 'Tis the season to save BIG! ✨ Get up to 50% OFF on our entire collection. Limited time only – don't let these deals slip away! 🛍️\n\nShop now and spread the holiday cheer! 🎁",
        imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=800&h=600&fit=crop',
        platform: 'Instagram',
        objective: 'Sales',
        hashtags: ['#HolidaySale', '#BlackFriday', '#ChristmasShopping', '#DealsOfTheDay'],
        bestTime: '6:00 PM',
        estimatedReach: '15K - 25K'
      },
      {
        id: '2',
        title: 'New Year New You Campaign',
        caption: "New year, new goals, new YOU! 💪🌟\n\nStart 2026 right with our exclusive wellness collection. Transform your routine and embrace the best version of yourself.\n\n👉 Link in bio to explore!",
        imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
        platform: 'Instagram',
        objective: 'Awareness',
        hashtags: ['#NewYear2026', '#NewYearNewMe', '#WellnessJourney', '#SelfCare'],
        bestTime: '9:00 AM',
        estimatedReach: '20K - 35K'
      },
      {
        id: '3',
        title: 'Behind The Scenes Series',
        caption: "Ever wondered what goes on behind the curtain? 🎬✨\n\nTake an exclusive look at how we create magic for YOU! From idea to reality – this is our story.\n\n💬 Drop a comment if you want to see more BTS content!",
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
        platform: 'TikTok',
        objective: 'Engagement',
        hashtags: ['#BTS', '#BehindTheScenes', '#ContentCreator', '#SmallBusiness'],
        bestTime: '12:00 PM',
        estimatedReach: '10K - 18K'
      },
      {
        id: '4',
        title: 'Customer Success Story',
        caption: "Meet Sarah, one of our amazing customers! 🌟\n\n\"I've never felt more confident! This product changed my morning routine completely.\" – Sarah, NYC\n\n📸 Share YOUR story and get featured! Tag us in your posts.",
        imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=600&fit=crop',
        platform: 'Facebook',
        objective: 'Trust',
        hashtags: ['#CustomerStory', '#Testimonial', '#RealResults', '#Community'],
        bestTime: '3:00 PM',
        estimatedReach: '8K - 12K'
      },
      {
        id: '5',
        title: 'Weekend Vibes Promo',
        caption: "Weekend mood: ACTIVATED ☀️🎉\n\nTreat yourself this weekend with our exclusive 24-hour flash deal! Use code WEEKEND25 for 25% off.\n\n⏰ Hurry, offer ends Sunday midnight!",
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
        platform: 'Twitter',
        objective: 'Sales',
        hashtags: ['#WeekendVibes', '#FlashSale', '#TreatYourself', '#LimitedOffer'],
        bestTime: '11:00 AM',
        estimatedReach: '12K - 20K'
      },
      {
        id: '6',
        title: 'Industry Tips & Tricks',
        caption: "🧠 PRO TIP: 3 ways to boost your productivity this week!\n\n1️⃣ Start with your hardest task\n2️⃣ Take regular breaks\n3️⃣ Use our productivity toolkit\n\n💡 Save this post for later! Which tip will you try first?",
        imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop',
        platform: 'LinkedIn',
        objective: 'Authority',
        hashtags: ['#ProductivityTips', '#WorkSmart', '#ProfessionalGrowth', '#CareerTips'],
        bestTime: '8:00 AM',
        estimatedReach: '5K - 10K'
      }
    ];
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    setSuggestedCampaigns(suggestions);
    setLoadingSuggestions(false);
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
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
    setActiveTab('draft');
  };

  const handleUseSuggestion = async (suggestion: SuggestedCampaign) => {
    try {
      const { campaign } = await apiService.createCampaign({
        name: suggestion.title,
        objective: suggestion.objective.toLowerCase() as any,
        platforms: [suggestion.platform.toLowerCase()],
        status: 'draft',
        creative: { 
          type: 'image', 
          textContent: suggestion.caption, 
          imageUrls: [suggestion.imageUrl],
          captions: suggestion.hashtags.join(' ')
        },
        scheduling: { 
          startDate: new Date().toISOString().split('T')[0], 
          postTime: suggestion.bestTime 
        }
      });
      setCampaigns([campaign, ...campaigns]);
      setActiveTab('draft');
    } catch (e) {
      console.error(e);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform.toLowerCase()) {
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'youtube': return <Youtube className="w-4 h-4" />;
      case 'tiktok': return <span className="text-xs font-bold">Tk</span>;
      default: return <Share2 className="w-4 h-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch(platform.toLowerCase()) {
      case 'instagram': return 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500';
      case 'facebook': return 'bg-[#1877F2]';
      case 'twitter': return 'bg-[#1DA1F2]';
      case 'linkedin': return 'bg-[#0A66C2]';
      case 'youtube': return 'bg-[#FF0000]';
      case 'tiktok': return 'bg-black';
      default: return 'bg-slate-500';
    }
  };

  const renderContent = () => {
    if (activeTab === 'suggestions') {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">AI-Generated Campaign Ideas</h2>
                <p className="text-sm text-slate-500">Tailored suggestions based on your industry and goals</p>
              </div>
            </div>
            <button 
              onClick={generateSuggestions}
              disabled={loadingSuggestions}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>

          {loadingSuggestions ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Sparkles className="w-12 h-12 text-indigo-600 animate-pulse" />
                <div className="absolute inset-0 w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
              <p className="mt-4 text-slate-600 font-medium">Generating personalized campaigns...</p>
              <p className="text-sm text-slate-400">Our AI is crafting the perfect content for you</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedCampaigns.map((suggestion) => (
                <div 
                  key={suggestion.id} 
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-lg hover:border-indigo-200 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={suggestion.imageUrl} 
                      alt={suggestion.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Overlay with actions on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 gap-3">
                      <button 
                        onClick={() => setEditingCampaign(suggestion)}
                        className="px-4 py-2 bg-white text-slate-900 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-lg"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button 
                        onClick={() => handleUseSuggestion(suggestion)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg"
                      >
                        <Send className="w-4 h-4" /> Use This
                      </button>
                    </div>
                    {/* Platform badge */}
                    <div className={`absolute top-3 left-3 ${getPlatformColor(suggestion.platform)} text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5`}>
                      {getPlatformIcon(suggestion.platform)}
                      {suggestion.platform}
                    </div>
                    {/* Objective badge */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-slate-700">
                      {suggestion.objective}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900 mb-2">{suggestion.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-3 mb-3 whitespace-pre-line">{suggestion.caption}</p>
                    
                    {/* Hashtags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {suggestion.hashtags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {suggestion.hashtags.length > 3 && (
                        <span className="text-xs text-slate-400">+{suggestion.hashtags.length - 3}</span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Best at {suggestion.bestTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{suggestion.estimatedReach}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

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
          <button onClick={() => setActiveTab('suggestions')} className="text-indigo-600 font-bold hover:underline">
            View AI Suggestions
          </button>
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
            { id: 'suggestions', label: 'AI Suggestions', icon: Sparkles },
            { id: 'all', label: 'All Campaigns', icon: null },
            { id: 'draft', label: 'Drafts', icon: null },
            { id: 'posted', label: 'Posted', icon: null },
            { id: 'archived', label: 'Archived', icon: null },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
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
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
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

      {editingCampaign && (
        <EditSuggestionModal
          suggestion={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSave={(updated) => {
            handleUseSuggestion(updated);
            setEditingCampaign(null);
          }}
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
};

// --- EDIT SUGGESTION MODAL ---
interface EditSuggestionModalProps {
    suggestion: {
        id: string;
        title: string;
        caption: string;
        imageUrl: string;
        platform: string;
        objective: string;
        hashtags: string[];
        bestTime: string;
        estimatedReach: string;
    };
    onClose: () => void;
    onSave: (updated: any) => void;
}

const EditSuggestionModal: React.FC<EditSuggestionModalProps> = ({ suggestion, onClose, onSave }) => {
    const [title, setTitle] = useState(suggestion.title);
    const [caption, setCaption] = useState(suggestion.caption);
    const [platform, setPlatform] = useState(suggestion.platform);
    const [bestTime, setBestTime] = useState(suggestion.bestTime);
    const [hashtags, setHashtags] = useState(suggestion.hashtags.join(' '));
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleRegenerateCaption = async () => {
        setIsRegenerating(true);
        try {
            // Call the chat API to regenerate caption
            const response = await fetch('http://localhost:5000/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Generate a fresh, engaging social media caption for a ${suggestion.objective} campaign about "${title}" for ${platform}. Include emojis and a call to action. Just provide the caption, no explanation.`
                })
            });
            const data = await response.json();
            if (data.success) {
                setCaption(data.response);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleSave = () => {
        onSave({
            ...suggestion,
            title,
            caption,
            platform,
            bestTime,
            hashtags: hashtags.split(' ').filter(h => h.startsWith('#'))
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Edit3 className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Edit Campaign</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                    {/* Preview Image */}
                    <div className="relative h-48 rounded-xl overflow-hidden">
                        <img 
                            src={suggestion.imageUrl} 
                            alt="Campaign preview" 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Campaign Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Platform & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Platform</label>
                            <select
                                value={platform}
                                onChange={e => setPlatform(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option>Instagram</option>
                                <option>Facebook</option>
                                <option>Twitter</option>
                                <option>LinkedIn</option>
                                <option>TikTok</option>
                                <option>YouTube</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Best Post Time</label>
                            <input
                                type="time"
                                value={bestTime.replace(' AM', '').replace(' PM', '')}
                                onChange={e => setBestTime(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Caption */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Caption</label>
                            <button 
                                onClick={handleRegenerateCaption}
                                disabled={isRegenerating}
                                className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-700 disabled:opacity-50"
                            >
                                {isRegenerating ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="w-3 h-3" /> Regenerate with AI</>
                                )}
                            </button>
                        </div>
                        <textarea
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            rows={5}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        />
                    </div>

                    {/* Hashtags */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Hashtags</label>
                        <input
                            type="text"
                            value={hashtags}
                            onChange={e => setHashtags(e.target.value)}
                            placeholder="#hashtag1 #hashtag2"
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" /> Save & Create Draft
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Campaigns;