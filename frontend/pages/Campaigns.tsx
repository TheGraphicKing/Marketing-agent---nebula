import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Campaign } from '../types';
import { Plus, Sparkles, Filter, Loader2, Calendar, BarChart3, Image as ImageIcon, Video, X, ChevronRight, Check, Eye, MousePointer, Archive, Send, Edit3, DollarSign, RefreshCw, Wand2, Instagram, Facebook, Twitter, Linkedin, Youtube, Clock, Heart, MessageCircle, Share2, Zap } from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { useTheme, getThemeClasses } from '../context/ThemeContext';

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
  const { isDarkMode } = useTheme();
  const theme = getThemeClasses(isDarkMode);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('suggestions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suggestedCampaigns, setSuggestedCampaigns] = useState<SuggestedCampaign[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState<SuggestedCampaign | null>(null);
  const [regenerationCount, setRegenerationCount] = useState(0);

  useEffect(() => {
    if (activeTab === 'suggestions') {
      generateSuggestions();
    } else {
      loadCampaigns();
    }
  }, [activeTab]);

  // Generate personalized fallback suggestions based on business profile
  const generatePersonalizedFallback = (profile: any, seed: number = 0): SuggestedCampaign[] => {
    const {
      name = 'Your Brand',
      industry = 'Business',
      niche = '',
      businessType = 'B2C',
      targetAudience = 'customers',
      brandVoice = 'Professional',
      marketingGoals = ['Awareness']
    } = profile || {};
    
    const industryImages: Record<string, string[]> = {
      'Ecommerce': [
        'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=600&fit=crop'
      ],
      'SaaS': [
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop'
      ],
      'Service': [
        'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop'
      ],
      'Technology': [
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1488229297570-58520851e868?w=800&h=600&fit=crop'
      ],
      'default': [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop'
      ]
    };
    
    const images = industryImages[industry] || industryImages['default'];
    
    const voiceTones: Record<string, { emoji: string; style: string }> = {
      'Professional': { emoji: '📈', style: 'formal and trustworthy' },
      'Witty': { emoji: '😎', style: 'fun and clever' },
      'Empathetic': { emoji: '💫', style: 'warm and caring' },
      'Bold': { emoji: '🔥', style: 'confident and direct' },
      'Educational': { emoji: '💡', style: 'informative and helpful' }
    };
    
    const voice = voiceTones[brandVoice] || voiceTones['Professional'];
    const isB2B = businessType === 'B2B';
    
    // Create a large pool of campaign templates
    const allCampaigns: SuggestedCampaign[] = [
      {
        id: 'fb-1',
        title: `${name} Brand Story`,
        caption: `${voice.emoji} What makes ${name} different?\n\nWe're not just another ${industry.toLowerCase()} company. We're here to ${niche ? `help with ${niche}` : 'make a real difference for ' + targetAudience}.\n\n💬 Tell us what brought you here!`,
        imageUrl: images[0],
        platform: 'Instagram',
        objective: 'Awareness',
        hashtags: [`#${name.replace(/\s+/g, '')}`, `#${industry}`, '#BrandStory', '#AboutUs'],
        bestTime: '10:00 AM',
        estimatedReach: '10K - 20K'
      },
      {
        id: 'fb-2',
        title: `Value for ${targetAudience}`,
        caption: isB2B 
          ? `🎯 3 ways ${name} helps businesses grow:\n\n1️⃣ Streamlined operations\n2️⃣ Data-driven insights\n3️⃣ Expert support\n\n📊 See real results – link in bio!`
          : `✨ Why ${targetAudience || 'our customers'} love ${name}:\n\n💜 Quality you can trust\n💜 Service that cares\n💜 Results that show\n\n👇 Share your experience!`,
        imageUrl: images[1],
        platform: isB2B ? 'LinkedIn' : 'Instagram',
        objective: marketingGoals.includes('Sales') ? 'Sales' : 'Engagement',
        hashtags: isB2B ? ['#B2B', '#BusinessGrowth', '#Success', '#Enterprise'] : ['#CustomerLove', '#Reviews', '#Community', '#Testimonial'],
        bestTime: isB2B ? '9:00 AM' : '7:00 PM',
        estimatedReach: isB2B ? '5K - 12K' : '12K - 25K'
      },
      {
        id: 'fb-3',
        title: `Behind the Scenes at ${name}`,
        caption: `🎬 Ever wonder what happens behind the scenes?\n\nHere's a sneak peek into how we ${niche || 'create value for you'}!\n\n${voice.emoji} Our team works hard to bring you the best in ${industry.toLowerCase()}.\n\n💬 Drop a comment if you want to see more!`,
        imageUrl: images[2] || images[0],
        platform: 'TikTok',
        objective: 'Engagement',
        hashtags: ['#BehindTheScenes', '#BTS', `#${industry}Life`, '#TeamWork'],
        bestTime: '12:00 PM',
        estimatedReach: '15K - 30K'
      },
      {
        id: 'fb-4',
        title: `${industry} Tips & Insights`,
        caption: `💡 PRO TIP: 3 things every ${targetAudience || 'person'} should know about ${industry.toLowerCase()}:\n\n1️⃣ Quality matters more than price\n2️⃣ Research before you commit\n3️⃣ Trust proven expertise (like ${name}!)\n\n📌 Save this for later!`,
        imageUrl: industryImages['default'][2],
        platform: isB2B ? 'LinkedIn' : 'Twitter',
        objective: 'Authority',
        hashtags: [`#${industry}Tips`, '#ProTip', '#ExpertAdvice', '#KnowledgeIsPower'],
        bestTime: '8:00 AM',
        estimatedReach: '8K - 15K'
      },
      {
        id: 'fb-5',
        title: `Limited Time Offer`,
        caption: `🔥 SPECIAL OFFER for our amazing ${targetAudience || 'followers'}!\n\n${voice.emoji} For a limited time, get exclusive access to our best ${industry.toLowerCase()} solutions.\n\n⏰ Don't wait – this won't last long!\n\n👆 Link in bio`,
        imageUrl: 'https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=800&h=600&fit=crop',
        platform: 'Instagram',
        objective: 'Sales',
        hashtags: ['#LimitedOffer', '#SpecialDeal', '#DontMissOut', `#${name.replace(/\s+/g, '')}`],
        bestTime: '6:00 PM',
        estimatedReach: '20K - 35K'
      },
      {
        id: 'fb-6',
        title: `Community Question`,
        caption: `🤔 We want to hear from YOU!\n\nWhat's your biggest challenge when it comes to ${niche || industry.toLowerCase()}?\n\nA) Finding the right solution\nB) Budget constraints\nC) Time management\nD) Something else (tell us!)\n\n👇 Vote below!`,
        imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop',
        platform: 'Twitter',
        objective: 'Engagement',
        hashtags: ['#Poll', '#Community', '#WeWantToKnow', `#${industry}`],
        bestTime: '3:00 PM',
        estimatedReach: '10K - 18K'
      },
      {
        id: 'fb-7',
        title: `Meet the Team`,
        caption: `👋 Meet the faces behind ${name}!\n\nOur passionate team is dedicated to delivering the best ${industry.toLowerCase()} experience for ${targetAudience}.\n\n🌟 Every success starts with great people.\n\n💬 Who would you like to know more about?`,
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
        platform: 'LinkedIn',
        objective: 'Trust',
        hashtags: ['#MeetTheTeam', '#TeamSpotlight', `#${name.replace(/\s+/g, '')}Team`, '#WeAreFamily'],
        bestTime: '11:00 AM',
        estimatedReach: '12K - 22K'
      },
      {
        id: 'fb-8',
        title: `${name} Milestone`,
        caption: `🎉 Big news! ${name} has just hit an amazing milestone!\n\n${voice.emoji} Thank you to everyone who made this possible – our incredible ${targetAudience} and our dedicated team.\n\nHere's to even bigger things ahead! 🚀\n\n#Grateful`,
        imageUrl: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&h=600&fit=crop',
        platform: 'Instagram',
        objective: 'Engagement',
        hashtags: ['#Milestone', '#Celebration', `#${name.replace(/\s+/g, '')}`, '#ThankYou'],
        bestTime: '2:00 PM',
        estimatedReach: '18K - 30K'
      },
      {
        id: 'fb-9',
        title: `How It Works`,
        caption: `🔍 Ever wondered how ${name} works?\n\nStep 1️⃣: ${isB2B ? 'Contact us' : 'Browse our offerings'}\nStep 2️⃣: ${isB2B ? 'Get a custom solution' : 'Choose what fits you'}\nStep 3️⃣: ${isB2B ? 'See measurable results' : 'Enjoy the experience!'}\n\n👆 Ready to start? Link in bio!`,
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
        platform: isB2B ? 'LinkedIn' : 'Instagram',
        objective: 'Traffic',
        hashtags: ['#HowItWorks', '#Tutorial', `#${industry}`, '#GetStarted'],
        bestTime: '10:00 AM',
        estimatedReach: '14K - 25K'
      },
      {
        id: 'fb-10',
        title: `Weekend Special`,
        caption: `☀️ Weekend vibes + Special deals = Perfect combo!\n\nTreat yourself this weekend with exclusive offers from ${name}.\n\n🏷️ Use code WEEKEND${new Date().getDate()} for a special surprise!\n\n⏰ Valid through Sunday!`,
        imageUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800&h=600&fit=crop',
        platform: 'Instagram',
        objective: 'Sales',
        hashtags: ['#WeekendDeal', '#WeekendVibes', '#TreatYourself', `#${name.replace(/\s+/g, '')}`],
        bestTime: '5:00 PM',
        estimatedReach: '25K - 40K'
      },
      {
        id: 'fb-11',
        title: `Customer Spotlight`,
        caption: `🌟 CUSTOMER SPOTLIGHT 🌟\n\n"${name} has completely transformed how I approach ${niche || industry.toLowerCase()}!" - Happy Customer\n\n📸 Want to be featured? Share your story with us!\n\n#CustomerSuccess`,
        imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=600&fit=crop',
        platform: 'Facebook',
        objective: 'Trust',
        hashtags: ['#CustomerSpotlight', '#Testimonial', '#RealStories', `#${name.replace(/\s+/g, '')}Love`],
        bestTime: '1:00 PM',
        estimatedReach: '9K - 16K'
      },
      {
        id: 'fb-12',
        title: `Did You Know?`,
        caption: `🧠 Did you know?\n\n${industry === 'Technology' ? 'The average person checks their phone 96 times a day!' : industry === 'Ecommerce' ? '70% of shopping carts are abandoned before checkout!' : `Most ${targetAudience} make decisions in under 7 seconds!`}\n\nThat's why ${name} focuses on ${niche || 'making things simple for you'}.\n\n💬 Drop a 🤯 if this surprised you!`,
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop',
        platform: 'Twitter',
        objective: 'Engagement',
        hashtags: ['#DidYouKnow', '#FunFact', `#${industry}Facts`, '#LearnSomethingNew'],
        bestTime: '4:00 PM',
        estimatedReach: '11K - 19K'
      }
    ];
    
    // Shuffle based on seed for variety on regenerate
    const shuffled = [...allCampaigns].sort(() => {
      const rand = Math.sin(seed * 9999) * 10000;
      return rand - Math.floor(rand);
    });
    
    // Add unique ids based on seed to force re-render
    return shuffled.slice(0, 6).map((camp, idx) => ({
      ...camp,
      id: `${camp.id}-${seed}-${idx}`
    }));
  };

  const generateSuggestions = async () => {
    setLoadingSuggestions(true);
    
    // Get user profile for personalized fallback
    let userProfile: any = null;
    try {
      const { user } = await apiService.getCurrentUser();
      userProfile = user?.businessProfile;
    } catch (err) {
      console.log('Could not fetch user profile for personalization');
    }
    
    try {
      // Try to get AI-generated suggestions from backend based on user's business profile
      const response = await apiService.getCampaignSuggestions(6);
      
      if (response.campaigns && response.campaigns.length > 0) {
        // Transform backend response to match our SuggestedCampaign interface
        const aiSuggestions: SuggestedCampaign[] = response.campaigns.map((camp: any, index: number) => ({
          id: camp.id || `ai-${index}-${regenerationCount}`,
          title: camp.name || camp.title || 'Campaign Idea',
          caption: camp.caption || camp.description || camp.contentIdeas?.join('\n\n') || 'AI-generated campaign content',
          imageUrl: camp.imageUrl || getImageForObjective(camp.objective || 'awareness'),
          platform: capitalizeFirst(camp.platforms?.[0] || 'Instagram'),
          objective: capitalizeFirst(camp.objective || 'Awareness'),
          hashtags: camp.hashtags || camp.keyMessages?.map((m: string) => `#${m.replace(/\s+/g, '')}`) || ['#Marketing', '#Growth'],
          bestTime: camp.bestPostTime || (camp.duration === '1 week' ? '10:00 AM' : camp.duration === '2 weeks' ? '2:00 PM' : '12:00 PM'),
          estimatedReach: camp.expectedReach || camp.expectedResults || '10K - 25K'
        }));
        setSuggestedCampaigns(aiSuggestions);
        setLoadingSuggestions(false);
        return;
      }
    } catch (error) {
      console.log('AI suggestions not available, using personalized fallback:', error);
    }
    
    // Use personalized fallback suggestions based on user's business profile
    // Pass regenerationCount as seed for variety
    const suggestions = generatePersonalizedFallback(userProfile, regenerationCount);
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1000));
    setSuggestedCampaigns(suggestions);
    setLoadingSuggestions(false);
  };
  
  // Handle regenerate with incrementing seed
  const handleRegenerate = () => {
    setRegenerationCount(prev => prev + 1);
    generateSuggestions();
  };

  // Helper function to get image based on objective
  const getImageForObjective = (objective: string): string => {
    const images: Record<string, string> = {
      awareness: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop',
      engagement: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
      traffic: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
      sales: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
      conversion: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop'
    };
    return images[objective.toLowerCase()] || images.awareness;
  };

  // Helper to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
      case 'instagram': return 'bg-gradient-to-tr from-yellow-400 via-red-500 to-#ffcc29';
      case 'facebook': return 'bg-[#1877F2]';
      case 'twitter': return 'bg-[#1DA1F2]';
      case 'linkedin': return 'bg-[#0A66C2]';
      case 'youtube': return 'bg-[#FF0000]';
      case 'tiktok': return 'bg-black';
      default: return 'bg-#f5f5f50';
    }
  };

  const renderContent = () => {
    if (activeTab === 'suggestions') {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#ffcc29] to-[#ffcc29]/80 rounded-xl text-black">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${theme.text}`}>AI-Generated Campaign Ideas</h2>
                <p className={`text-sm ${theme.textSecondary}`}>Tailored suggestions based on your industry and goals</p>
              </div>
            </div>
            <button 
              onClick={handleRegenerate}
              disabled={loadingSuggestions}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                isDarkMode 
                  ? 'bg-[#0f1419] hover:bg-[#ffcc29]/10 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>

          {loadingSuggestions ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Sparkles className="w-12 h-12 text-[#ffcc29] animate-pulse" />
                <div className="absolute inset-0 w-12 h-12 border-4 border-[#ffcc29]/30 border-t-[#ffcc29] rounded-full animate-spin"></div>
              </div>
              <p className={`mt-4 font-medium ${theme.text}`}>Generating personalized campaigns...</p>
              <p className={`text-sm ${theme.textSecondary}`}>Our AI is crafting the perfect content for you</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedCampaigns.map((suggestion) => (
                <div 
                  key={suggestion.id} 
                  className={`rounded-xl shadow-sm border overflow-hidden group hover:shadow-lg transition-all duration-300 ${theme.bgCard} ${
                    isDarkMode ? 'border-[#ffcc29]/20 hover:border-[#ffcc29]/40' : 'border-slate-200 hover:border-[#ffcc29]/30'
                  }`}
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
                        className="px-4 py-2 bg-white text-#070A12 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-#ededed transition-colors shadow-lg"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button 
                        onClick={() => handleUseSuggestion(suggestion)}
                        className="px-4 py-2 bg-#ffcc29 text-white rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg"
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
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-#0f1526">
                      {suggestion.objective}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className={`font-bold mb-2 ${theme.text}`}>{suggestion.title}</h3>
                    <p className={`text-sm line-clamp-3 mb-3 whitespace-pre-line ${theme.textSecondary}`}>{suggestion.caption}</p>
                    
                    {/* Hashtags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {suggestion.hashtags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs bg-[#ffcc29]/20 text-[#ffcc29] px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {suggestion.hashtags.length > 3 && (
                        <span className={`text-xs ${theme.textSecondary}`}>+{suggestion.hashtags.length - 3}</span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className={`flex items-center justify-between text-xs pt-3 border-t ${theme.textSecondary} ${
                      isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'
                    }`}>
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
      return <CampaignAnalytics campaigns={campaigns} isDarkMode={isDarkMode} theme={theme} />;
    }

    if (loading) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#ffcc29] animate-spin" />
        </div>
      );
    }

    if (campaigns.length === 0) {
      return (
        <div className={`text-center py-20 rounded-xl border border-dashed ${theme.bgCard} ${
          isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-300'
        }`}>
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            <Filter className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className={`text-lg font-bold ${theme.text}`}>No campaigns found</h3>
          <p className={`${theme.textSecondary} mb-6`}>There are no campaigns in this view.</p>
          <button onClick={() => setActiveTab('suggestions')} className="text-[#ffcc29] font-bold hover:underline">
            View AI Suggestions
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign._id} campaign={campaign} isDarkMode={isDarkMode} theme={theme} />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${theme.text}`}>Campaign Manager</h1>
          <p className={theme.textSecondary}>Plan, execute, and analyze your marketing efforts.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#ffcc29] hover:bg-[#ffcc29]/80 text-black px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className={`border-b mb-8 overflow-x-auto ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'}`}>
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
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : `border-transparent ${theme.textSecondary} hover:text-[#ffcc29] hover:border-[#ffcc29]/30`
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
          isDarkMode={isDarkMode}
          theme={theme}
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
          isDarkMode={isDarkMode}
          theme={theme}
        />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const CampaignAnalytics: React.FC<{ campaigns: Campaign[]; isDarkMode: boolean; theme: ReturnType<typeof getThemeClasses> }> = ({ campaigns, isDarkMode, theme }) => {
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
                <div className={`p-6 rounded-xl border shadow-sm ${theme.bgCard} ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'}`}>
                    <p className={`text-sm font-medium mb-2 flex items-center gap-2 ${theme.textSecondary}`}><Eye className="w-4 h-4" /> Total Impressions</p>
                    <p className={`text-3xl font-bold ${theme.text}`}>{totalImpressions.toLocaleString()}</p>
                </div>
                <div className={`p-6 rounded-xl border shadow-sm ${theme.bgCard} ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'}`}>
                    <p className={`text-sm font-medium mb-2 flex items-center gap-2 ${theme.textSecondary}`}><DollarSign className="w-4 h-4" /> Total Spend</p>
                    <p className={`text-3xl font-bold ${theme.text}`}>${totalSpend.toLocaleString()}</p>
                </div>
                <div className={`p-6 rounded-xl border shadow-sm ${theme.bgCard} ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'}`}>
                    <p className={`text-sm font-medium mb-2 flex items-center gap-2 ${theme.textSecondary}`}><MousePointer className="w-4 h-4" /> Total Clicks</p>
                    <p className={`text-3xl font-bold ${theme.text}`}>{totalClicks.toLocaleString()}</p>
                </div>
            </div>

            <div className={`p-6 rounded-xl border shadow-sm ${theme.bgCard} ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'}`}>
                <h3 className={`font-bold mb-6 ${theme.text}`}>Performance Over Time</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ffcc29" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ffcc29" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#e5e7eb'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }} />
                            <RechartsTooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f1419' : '#fff', borderColor: isDarkMode ? '#ffcc29' : '#e5e7eb' }} />
                            <Area type="monotone" dataKey="impressions" stroke="#ffcc29" fillOpacity={1} fill="url(#colorImp)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const CampaignCard: React.FC<{ campaign: Campaign; isDarkMode: boolean; theme: ReturnType<typeof getThemeClasses> }> = ({ campaign, isDarkMode, theme }) => (
    <div className={`rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full ${theme.bgCard} ${
      isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'
    }`}>
        <div className={`p-5 border-b ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold text-sm ${theme.text}`}>{campaign.name}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    campaign.status === 'active' ? 'bg-green-500/20 text-green-500' :
                    campaign.status === 'posted' ? 'bg-blue-500/20 text-blue-500' :
                    campaign.status === 'draft' ? 'bg-amber-500/20 text-amber-500' :
                    isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}>
                    {campaign.status}
                </span>
            </div>
            <div className={`flex flex-col gap-1 text-xs ${theme.textSecondary}`}>
                <p>Platform: <span className={`font-medium capitalize ${theme.text}`}>{campaign.platforms[0]}</span></p>
                <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{campaign.scheduling.startDate} at {campaign.scheduling.postTime}</span>
                </div>
            </div>
        </div>

        {/* Content Preview */}
        <div className="p-5 flex-1">
            <div className={`rounded-lg p-3 mb-4 border h-24 overflow-hidden relative group ${
              isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-slate-50 border-slate-200'
            }`}>
                 {campaign.creative.imageUrls?.[0] ? (
                    <div className="flex gap-4 h-full">
                        <img 
                            src={campaign.creative.imageUrls[0]} 
                            alt="Campaign Creative" 
                            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                        />
                        <p className={`text-xs line-clamp-3 italic ${theme.textSecondary}`}>"{campaign.creative.textContent}"</p>
                    </div>
                ) : (
                    <p className={`text-xs italic ${theme.textSecondary}`}>"{campaign.creative.textContent}"</p>
                )}
            </div>

            {/* Metrics */}
            {campaign.performance && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">IMPRESSIONS</p>
                        <p className={`text-sm font-bold ${theme.text}`}>{campaign.performance.impressions.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">ENGAGEMENT</p>
                        <p className={`text-sm font-bold ${theme.text}`}>{campaign.performance.engagement.toLocaleString()}</p>
                    </div>
                </div>
            )}
            {!campaign.performance && (
                <div className={`text-center py-2 text-xs text-slate-400 rounded border border-dashed ${
                  isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-slate-50 border-slate-200'
                }`}>
                    No analytics yet
                </div>
            )}
        </div>

        {/* Action Footer */}
        <div className={`p-3 border-t flex justify-end gap-2 ${
          isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-slate-50 border-slate-200'
        }`}>
            {campaign.status === 'draft' && (
                <button className="text-xs font-bold text-[#ffcc29] px-3 py-1.5 hover:bg-[#ffcc29]/10 rounded border border-transparent hover:border-[#ffcc29]/30 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Edit
                </button>
            )}
             {campaign.status === 'draft' && (
                <button className="text-xs font-bold text-black bg-[#ffcc29] px-3 py-1.5 rounded hover:bg-[#ffcc29]/80 flex items-center gap-1">
                    <Send className="w-3 h-3" /> Post
                </button>
            )}
            {campaign.status === 'posted' && (
                <button className={`text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 ${
                  isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-200'
                }`}>
                    <Archive className="w-3 h-3" /> Archive
                </button>
            )}
        </div>
    </div>
);

// --- MODAL (Kept concise for length) ---
const CreateCampaignModal: React.FC<{ onClose: () => void; onSuccess: (c: Campaign) => void; isDarkMode: boolean; theme: ReturnType<typeof getThemeClasses> }> = ({ onClose, onSuccess, isDarkMode, theme }) => {
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

    const inputClasses = `w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc29] ${
      isDarkMode 
        ? 'bg-[#0d1117] border-[#ffcc29]/20 text-white placeholder-slate-500' 
        : 'bg-white border-slate-200 text-slate-900'
    }`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`rounded-2xl shadow-xl w-full max-w-4xl h-[600px] flex overflow-hidden ${theme.bgCard}`}>
                <div className={`w-64 border-r p-8 flex flex-col ${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-slate-50 border-slate-200'}`}>
                    <h2 className={`text-lg font-bold mb-8 ${theme.text}`}>Create Campaign</h2>
                    <div className="space-y-6">
                         {[1, 2, 3].map(s => (
                             <div key={s} className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === s ? 'bg-[#ffcc29] border-[#ffcc29] text-black' : isDarkMode ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500'}`}>{s}</div>
                                 <span className={step === s ? 'text-[#ffcc29] font-bold' : theme.textSecondary}>Step {s}</span>
                             </div>
                         ))}
                    </div>
                </div>
                <div className="flex-1 p-8 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        {step === 1 && (
                            <div className="space-y-4">
                                <h3 className={`text-xl font-bold ${theme.text}`}>Details</h3>
                                <input className={inputClasses} placeholder="Campaign Name" value={name} onChange={e => setName(e.target.value)} />
                                <div className="grid grid-cols-3 gap-2">{['Awareness', 'Traffic', 'Sales'].map(o => <button key={o} onClick={() => setObjective(o.toLowerCase() as any)} className={`p-2 border rounded transition-colors ${objective === o.toLowerCase() ? 'bg-[#ffcc29]/20 border-[#ffcc29] text-[#ffcc29]' : isDarkMode ? 'border-slate-600 text-slate-400 hover:border-[#ffcc29]/50' : 'border-slate-200 text-slate-600 hover:border-[#ffcc29]/50'}`}>{o}</button>)}</div>
                            </div>
                        )}
                        {step === 2 && (
                            <div className="space-y-4">
                                <h3 className={`text-xl font-bold ${theme.text}`}>Schedule</h3>
                                <input type="date" className={inputClasses} value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <input type="time" className={inputClasses} value={postTime} onChange={e => setPostTime(e.target.value)} />
                            </div>
                        )}
                        {step === 3 && (
                             <div className="space-y-4">
                                 <h3 className={`text-xl font-bold ${theme.text}`}>Creative</h3>
                                 <div className="flex justify-between"><label className={theme.text}>Caption</label><button onClick={handleGenerateAI} className="text-[#ffcc29] font-bold flex gap-1 hover:text-[#ffcc29]/80"><Sparkles className="w-4 h-4"/> Generate AI</button></div>
                                 <textarea className={`${inputClasses} h-32`} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Ad copy..." />
                             </div>
                        )}
                    </div>
                    <div className={`flex justify-between pt-4 border-t ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'}`}>
                        <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)} className={theme.textSecondary}>Back</button>
                        <button onClick={step === 3 ? handleSubmit : () => setStep(s => s + 1)} className="px-6 py-2 bg-[#ffcc29] text-black rounded-lg font-medium hover:bg-[#ffcc29]/80">Next</button>
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
    isDarkMode: boolean;
    theme: ReturnType<typeof getThemeClasses>;
}

const EditSuggestionModal: React.FC<EditSuggestionModalProps> = ({ suggestion, onClose, onSave, isDarkMode, theme }) => {
    const [title, setTitle] = useState(suggestion.title);
    const [caption, setCaption] = useState(suggestion.caption);
    const [platform, setPlatform] = useState(suggestion.platform);
    const [bestTime, setBestTime] = useState(suggestion.bestTime);
    const [hashtags, setHashtags] = useState(suggestion.hashtags.join(' '));
    const [isRegenerating, setIsRegenerating] = useState(false);

    const inputClasses = `w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc29] ${
      isDarkMode 
        ? 'bg-[#0d1117] border-[#ffcc29]/20 text-white placeholder-slate-500' 
        : 'bg-white border-slate-200 text-slate-900'
    }`;

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
                className={`rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 ${theme.bgCard}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#ffcc29]/20 rounded-lg text-[#ffcc29]">
                            <Edit3 className="w-5 h-5" />
                        </div>
                        <h2 className={`text-lg font-bold ${theme.text}`}>Edit Campaign</h2>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
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
                            className={inputClasses}
                        />
                    </div>

                    {/* Platform & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Platform</label>
                            <select
                                value={platform}
                                onChange={e => setPlatform(e.target.value)}
                                className={inputClasses}
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
                                className={inputClasses}
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
                                className="text-xs text-[#ffcc29] font-bold flex items-center gap-1 hover:text-[#ffcc29]/80 disabled:opacity-50"
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
                            className={`${inputClasses} resize-none`}
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
                            className={inputClasses}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-end gap-3 p-6 border-t ${
                  isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-slate-50 border-slate-200'
                }`}>
                    <button 
                        onClick={onClose}
                        className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                          isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-[#ffcc29] text-black font-medium rounded-lg hover:bg-[#ffcc29]/80 transition-colors flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" /> Save & Create Draft
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Campaigns;