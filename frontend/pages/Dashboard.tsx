import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '../services/api';
import { DashboardData, Campaign, CompetitorPost } from '../types';
import { TrendingUp, ArrowUpRight, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Calendar, Info, Activity, Clock, MoreHorizontal, Plus, X, ExternalLink, Edit3, Share2, MessageSquare, FileText, Loader2, Bell, BellRing, Check, AlertCircle, Trash2, Eye, Users, BarChart3 } from 'lucide-react';
import { useTheme, getThemeClasses } from '../context/ThemeContext';

// Section info descriptions
const sectionInfo: Record<string, { title: string; description: string }> = {
  activeCampaigns: {
    title: 'Active Campaigns',
    description: 'This shows the total number of marketing campaigns that are currently running or have been posted. Active campaigns are those that are live and generating engagement, impressions, or conversions for your brand.'
  },
  budgetSpent: {
    title: 'Budget Spent',
    description: 'This tracks your total marketing spend across all active and completed campaigns. The graph shows your daily spending pattern over the past week, helping you understand your budget allocation and pacing.'
  },
  brandScore: {
    title: 'AI Brand Score',
    description: 'Your Brand Score (0-100) is an AI-calculated metric that measures your overall marketing health based on engagement rates, content consistency, audience growth, and campaign performance across all connected platforms.'
  },
  competitorRadar: {
    title: 'Competitor Radar',
    description: 'This section monitors your competitors\' social media activity in real-time. It shows their recent posts, engagement metrics, and AI-powered sentiment analysis to help you stay ahead of market trends.'
  },
  recommendedActions: {
    title: 'Recommended Actions',
    description: 'AI-generated suggestions based on your current marketing performance, competitor activity, and industry trends. These actionable recommendations help you optimize your marketing strategy.'
  },
  calendar: {
    title: 'Campaign Calendar',
    description: 'A visual timeline of all your scheduled, active, and completed campaigns. Use this calendar to plan your content strategy, avoid scheduling conflicts, and ensure consistent posting.'
  }
};

// Section Info Button Component
const SectionButtons: React.FC<{
  sectionType: string;
  sectionData: any;
  variant?: 'light' | 'dark';
}> = ({ sectionType, sectionData, variant = 'light' }) => {
  const [showSynopsis, setShowSynopsis] = useState(false);
  const [synopsis, setSynopsis] = useState<{ synopsis: string; insights: string[]; trend: 'up' | 'down' | 'stable' } | null>(null);
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);
  const [isHoveringInfo, setIsHoveringInfo] = useState(false);
  const [isHoveringD, setIsHoveringD] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const dRef = useRef<HTMLDivElement>(null);

  const handleSynopsisHover = async () => {
    setIsHoveringD(true);
    if (!synopsis && !loadingSynopsis) {
      setLoadingSynopsis(true);
      try {
        const result = await apiService.getSynopsis(sectionType, sectionData);
        setSynopsis(result);
      } catch (error) {
        setSynopsis({ synopsis: 'Unable to generate synopsis.', insights: [], trend: 'stable' });
      }
      setLoadingSynopsis(false);
    }
  };

  const info = sectionInfo[sectionType];
  const isDark = variant === 'dark';

  return (
    <div className="flex items-center gap-1">
      {/* Info Button - Click to open modal for Brand Score, hover for others */}
      <div 
        className="relative"
        ref={infoRef}
        onMouseEnter={() => sectionType !== 'brandScore' && setIsHoveringInfo(true)}
        onMouseLeave={() => sectionType !== 'brandScore' && setIsHoveringInfo(false)}
      >
        <button
          onClick={() => sectionType === 'brandScore' && setIsHoveringInfo(!isHoveringInfo)}
          className={`group relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold shadow-sm ${
            isDark 
              ? 'bg-gradient-to-br from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white border border-white/20 hover:border-white/40 hover:scale-110' 
              : 'bg-gradient-to-br from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 text-[#ffcc29] border border-indigo-200/50 hover:border-indigo-300 hover:scale-110 hover:shadow-md'
          }`}
        >
          <span className="relative z-10">i</span>
          <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isDark ? 'bg-white/10' : 'bg-[#ffcc29]/10'} opacity-0 group-hover:opacity-100`}></div>
        </button>
        
        {/* Info Tooltip - Static modal with X button for Brand Score */}
        {isHoveringInfo && (
          <>
            {/* Backdrop for Brand Score modal */}
            {sectionType === 'brandScore' && (
              <div 
                className="fixed inset-0 z-[9998] bg-black/20" 
                onClick={() => setIsHoveringInfo(false)}
              />
            )}
            <div 
              className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-200" 
              style={{
                width: sectionType === 'brandScore' ? '420px' : '280px',
                maxHeight: sectionType === 'brandScore' ? '80vh' : 'auto',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                overflowY: sectionType === 'brandScore' ? 'auto' : 'visible'
              }}
            >
              <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4">
                {/* Header with X button */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#ffcc29]/20 rounded-lg">
                      <Info className="w-3.5 h-3.5 text-[#ffcc29]" />
                    </div>
                    <h4 className="text-sm font-semibold text-[#0a0f1a]">{info?.title}</h4>
                  </div>
                  {sectionType === 'brandScore' && (
                    <button 
                      onClick={() => setIsHoveringInfo(false)}
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
                
                {sectionType === 'brandScore' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Your <strong>AI Brand Score</strong> (0-100) measures your brand's overall marketing health, calculated in real-time from your connected platforms.
                    </p>
                    
                    {/* Weightage Breakdown */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">📊 Weightage Breakdown</p>
                      
                      {/* Engagement 30% */}
                      <div className="p-2.5 bg-[#ffcc29]/5 rounded-lg border-l-3 border-[#ffcc29]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-8 h-8 bg-[#ffcc29]/20 rounded flex items-center justify-center text-[#ffcc29] font-bold text-xs">30%</span>
                          <span className="font-semibold text-sm text-slate-800">Engagement Rate</span>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-0.5 ml-10">
                          <li>• Likes, comments, shares per post</li>
                          <li>• Saves & bookmarks rate</li>
                          <li>• Industry benchmark comparison</li>
                        </ul>
                      </div>
                      
                      {/* Consistency 25% */}
                      <div className="p-2.5 bg-blue-50/50 rounded-lg border-l-3 border-blue-500">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-bold text-xs">25%</span>
                          <span className="font-semibold text-sm text-slate-800">Content Consistency</span>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-0.5 ml-10">
                          <li>• Posting frequency & schedule</li>
                          <li>• Platform coverage</li>
                          <li>• Optimal timing adherence</li>
                        </ul>
                      </div>
                      
                      {/* Growth 25% */}
                      <div className="p-2.5 bg-emerald-50/50 rounded-lg border-l-3 border-emerald-500">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center text-emerald-600 font-bold text-xs">25%</span>
                          <span className="font-semibold text-sm text-slate-800">Audience Growth</span>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-0.5 ml-10">
                          <li>• Follower growth rate (WoW/MoM)</li>
                          <li>• Reach & impressions</li>
                          <li>• Profile visit trends</li>
                        </ul>
                      </div>
                      
                      {/* Performance 20% */}
                      <div className="p-2.5 bg-amber-50/50 rounded-lg border-l-3 border-amber-500">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center text-amber-600 font-bold text-xs">20%</span>
                          <span className="font-semibold text-sm text-slate-800">Campaign Performance</span>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-0.5 ml-10">
                          <li>• Click-through rate (CTR)</li>
                          <li>• Conversion rate & ROI</li>
                          <li>• Goal achievement</li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Score Ranges */}
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">🎯 Score Ranges</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="flex items-center gap-1.5 p-1.5 bg-white rounded text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <span><b>80-100</b> Great</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 bg-white rounded text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                          <span><b>60-79</b> Good</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 bg-white rounded text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          <span><b>40-59</b> Fair</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 bg-white rounded text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                          <span><b>0-39</b> Low</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 text-center pt-1">
                      📡 Updated in real-time from connected platforms
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {info?.description}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Synopsis Button with Hover Tooltip - Click to chat */}
      <div 
        className="relative"
        ref={dRef}
        onMouseEnter={handleSynopsisHover}
        onMouseLeave={() => setIsHoveringD(false)}
      >
        <button
          onClick={() => {
            if (synopsis) {
              // Dispatch custom event to open chatbot with this synopsis
              const message = `Tell me more about my ${info?.title || sectionType}: ${synopsis.synopsis}`;
              window.dispatchEvent(new CustomEvent('openChatWithMessage', { detail: { message, synopsis: synopsis.synopsis, insights: synopsis.insights } }));
            }
          }}
          className={`group relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold shadow-sm cursor-pointer ${
            isDark 
              ? 'bg-gradient-to-br from-[#ffcc29]/30 to-pink-400/20 hover:from-[#ffcc29]/40 hover:to-pink-400/30 text-white border border-purple-300/30 hover:border-purple-300/50 hover:scale-110' 
              : 'bg-gradient-to-br from-[#ffcc29]/10 to-pink-100 hover:from-[#ffcc29]/20 hover:to-pink-200 text-[#ffcc29] border border-purple-200/50 hover:border-purple-300 hover:scale-110 hover:shadow-md'
          }`}
          title="Click to discuss with Daddy"
        >
          <span className="relative z-10">d</span>
          <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isDark ? 'bg-[#ffcc29]/10' : 'bg-[#ffcc29]/10'} opacity-0 group-hover:opacity-100`}></div>
          {loadingSynopsis && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#ffcc29] animate-spin"></div>
          )}
        </button>
        
        {/* Synopsis Hover Tooltip */}
        {isHoveringD && (
          <div className="absolute z-50 top-full right-0 mt-2 w-80 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 relative">
              {/* Arrow */}
              <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-slate-200 rotate-45"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#ffcc29]/20 rounded-lg">
                      <FileText className="w-3.5 h-3.5 text-[#ffcc29]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0a0f1a]">AI Synopsis</h4>
                      <p className="text-[10px] text-slate-400">{info?.title}</p>
                    </div>
                  </div>
                  {synopsis && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const message = `Tell me more about my ${info?.title || sectionType}: ${synopsis.synopsis}`;
                        window.dispatchEvent(new CustomEvent('openChatWithMessage', { detail: { message, synopsis: synopsis.synopsis, insights: synopsis.insights } }));
                      }}
                      className="text-[10px] bg-[#ffcc29] text-[#070A12] px-2 py-1 rounded-full font-semibold hover:bg-[#e6b825] transition-colors"
                    >
                      💬 Ask Daddy
                    </button>
                  )}
                </div>
                
                {loadingSynopsis ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="w-4 h-4 text-[#ffcc29] animate-spin" />
                    <p className="text-xs text-slate-500">AI is analyzing...</p>
                  </div>
                ) : synopsis ? (
                  <>
                    {/* Trend Badge */}
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold mb-2 ${
                      synopsis.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                      synopsis.trend === 'down' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-slate-600'
                    }`}>
                      {synopsis.trend === 'up' ? '↑ Trending Up' : synopsis.trend === 'down' ? '↓ Trending Down' : '→ Stable'}
                    </div>
                    
                    {/* Synopsis */}
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {synopsis.synopsis}
                    </p>
                    
                    {/* Quick Insights */}
                    {synopsis.insights && synopsis.insights.length > 0 && (
                      <div className="border-t border-gray-100 pt-2">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Key Insights</p>
                        <ul className="space-y-1">
                          {synopsis.insights.slice(0, 3).map((insight, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <span className="text-[#ffcc29]">💡</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Click hint */}
                    <p className="text-[10px] text-slate-400 mt-3 text-center">Click to discuss with Daddy 💬</p>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = getThemeClasses(isDarkMode);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBrandScoreInfo, setShowBrandScoreInfo] = useState(false);
  const [competitorIndex, setCompetitorIndex] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number } | null>(null);
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());
  const [loadingMoreActions, setLoadingMoreActions] = useState(false);
  
  // Sample budget data points for the graph - use real data if available
  const budgetData = data?.overview?.dailySpend?.map((d: any) => d.spend) || [0, 0, 0, 0, 0, 0, 0];
  const days = data?.overview?.dailySpend?.map((d: any) => d.day) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hasRealData = data?.dataSource === 'real';
  const hasCampaigns = (data?.overview?.totalCampaigns || 0) > 0;
  const hasSpend = (data?.overview?.totalSpent || 0) > 0;
  
  const fetchData = async () => {
    try {
      const dashboardData = await apiService.getDashboardOverview();
      setData(dashboardData);
    } catch (error) {
      console.error("Failed to load dashboard", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const handlePrevCompetitor = () => {
    if (data?.competitorActivity) {
      setCompetitorIndex((prev) => (prev === 0 ? data.competitorActivity.length - 1 : prev - 1));
    }
  };

  const handleNextCompetitor = () => {
    if (data?.competitorActivity) {
      setCompetitorIndex((prev) => (prev === data.competitorActivity.length - 1 ? 0 : prev + 1));
    }
  };

  const getActionButton = (actionType: string, title: string) => {
    // Use hash navigation for HashRouter
    const navigate = (path: string) => {
      window.location.hash = path;
    };
    
    const actionMap: Record<string, { label: string; icon: React.ReactNode; onClick: () => void }> = {
      'create_campaign': { 
        label: 'Create Campaign', 
        icon: <Plus className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns?action=create') 
      },
      'create_post': { 
        label: 'Create Post', 
        icon: <Edit3 className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns?action=create&type=post') 
      },
      'create_story': { 
        label: 'Create Story', 
        icon: <Share2 className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns?action=create&type=story') 
      },
      'analyze_competitors': { 
        label: 'View Competitors', 
        icon: <Eye className="w-3 h-3" />, 
        onClick: () => navigate('/competitors') 
      },
      'find_influencers': { 
        label: 'Find Influencers', 
        icon: <Users className="w-3 h-3" />, 
        onClick: () => navigate('/influencers') 
      },
      'engage_audience': { 
        label: 'Engage', 
        icon: <MessageSquare className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns') 
      },
      'connect_social': { 
        label: 'Connect', 
        icon: <ExternalLink className="w-3 h-3" />, 
        onClick: () => navigate('/connect-socials') 
      },
      'view_analytics': { 
        label: 'View Analytics', 
        icon: <BarChart3 className="w-3 h-3" />, 
        onClick: () => navigate('/dashboard') 
      },
      'schedule_content': { 
        label: 'Schedule', 
        icon: <Calendar className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns?action=create&schedule=true') 
      },
      // Legacy type mappings for backwards compatibility
      'campaign': { 
        label: 'Create Campaign', 
        icon: <Plus className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns?action=create') 
      },
      'social': { 
        label: 'Create Post', 
        icon: <Edit3 className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns?action=create') 
      },
      'content': { 
        label: 'Create Content', 
        icon: <Edit3 className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns?action=create') 
      },
      'post': { 
        label: 'Create Post', 
        icon: <Edit3 className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns?action=create') 
      },
      'story': { 
        label: 'Post Story', 
        icon: <Share2 className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns?action=create&type=story') 
      },
      'review': { 
        label: 'View', 
        icon: <Eye className="w-3 h-3" />, 
        onClick: () => navigate('/competitors') 
      },
      'engage': { 
        label: 'Engage', 
        icon: <MessageSquare className="w-3 h-3" />, 
        onClick: () => navigate('/campaigns') 
      },
      'generate_content': { 
        label: 'Generate Content', 
        icon: <Edit3 className="w-3 h-3" />, 
        onClick: () => navigate('/content-studio') 
      },
      'view_trends': { 
        label: 'View Trends', 
        icon: <BarChart3 className="w-3 h-3" />, 
        onClick: () => navigate('/trends') 
      },
      'discover_trends': { 
        label: 'Discover Trends', 
        icon: <BarChart3 className="w-3 h-3" />, 
        onClick: () => navigate('/trends') 
      },
    };
    
    // First try exact match with actionType
    if (actionMap[actionType]) {
      return actionMap[actionType];
    }
    
    // Fallback: Determine action type from title keywords
    const titleLower = title.toLowerCase();
    if (titleLower.includes('campaign') || titleLower.includes('create campaign') || titleLower.includes('launch')) {
      return actionMap['create_campaign'];
    }
    if (titleLower.includes('story') || titleLower.includes('stories')) {
      return actionMap['create_story'];
    }
    if (titleLower.includes('competitor') || titleLower.includes('analyze') || titleLower.includes('rival')) {
      return actionMap['analyze_competitors'];
    }
    if (titleLower.includes('influencer') || titleLower.includes('partner')) {
      return actionMap['find_influencers'];
    }
    if (titleLower.includes('engage') || titleLower.includes('comment') || titleLower.includes('respond') || titleLower.includes('reply')) {
      return actionMap['engage_audience'];
    }
    if (titleLower.includes('connect') || titleLower.includes('link') || titleLower.includes('social account')) {
      return actionMap['connect_social'];
    }
    if (titleLower.includes('analytics') || titleLower.includes('performance') || titleLower.includes('metrics')) {
      return actionMap['view_analytics'];
    }
    if (titleLower.includes('schedule') || titleLower.includes('plan')) {
      return actionMap['schedule_content'];
    }
    if (titleLower.includes('trend') || titleLower.includes('discover') || titleLower.includes('explore')) {
      return actionMap['discover_trends'];
    }
    if (titleLower.includes('generate') || titleLower.includes('ai content') || titleLower.includes('studio')) {
      return actionMap['generate_content'];
    }
    if (titleLower.includes('post') || titleLower.includes('content') || titleLower.includes('share')) {
      return actionMap['create_post'];
    }
    
    // Default to create campaign
    return actionMap['create_campaign'];
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-400 gap-2"><div className="w-4 h-4 bg-#ffcc29 rounded-full animate-bounce"></div> Loading metrics...</div>;
  }

  const currentCompetitor = data?.competitorActivity?.[competitorIndex];
  const prevCompetitor = data?.competitorActivity?.[(competitorIndex === 0 ? (data.competitorActivity.length - 1) : competitorIndex - 1)];
  const nextCompetitor = data?.competitorActivity?.[(competitorIndex === (data?.competitorActivity?.length || 1) - 1 ? 0 : competitorIndex + 1)];

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-1">
      {/* Header - Personalized */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className={`text-2xl font-semibold tracking-tight ${theme.text}`}>
              {data?.businessContext?.name ? `${data.businessContext.name} Dashboard` : 'Dashboard'}
            </h1>
            <p className={`text-sm mt-0.5 ${theme.textSecondary}`}>
              {data?.businessContext?.industry 
                ? `Marketing performance for your ${data.businessContext.industry} business.`
                : 'Overview of your marketing performance.'
              }
            </p>
        </div>
        <div className={`${theme.bgCard} border ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'} rounded-lg px-4 py-2 text-sm font-medium ${theme.textSecondary} flex items-center gap-2 shadow-sm hover:border-slate-300 transition-colors cursor-pointer`}>
            Last 7 Days
            <ChevronRight className={`w-4 h-4 rotate-90 ${theme.textMuted}`} />
        </div>
      </div>

      {/* Stats Grid - More refined spacing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Active Campaigns Card - Cleaner */}
        <div className={`${theme.bgCard} rounded-2xl border ${isDarkMode ? 'border-[#ffcc29]/20 hover:border-[#ffcc29]/40' : 'border-[#ededed] hover:border-slate-200'} p-6 transition-all duration-200`}>
            <div className="flex justify-between items-start mb-6">
                <span className={`font-medium text-xs uppercase tracking-wider ${theme.textSecondary}`}>Active Campaigns</span>
                <div className="flex items-center gap-2">
                    <SectionButtons 
                      sectionType="activeCampaigns" 
                      sectionData={{ count: data?.overview.activeCampaigns, change: data?.overview.activeCampaignsChange }} 
                    />
                </div>
            </div>
            <div className={`text-5xl font-bold mb-4 tracking-tight ${theme.text}`}>
              {data?.overview.activeCampaigns ?? 0}
            </div>
            {(data?.overview?.activeCampaigns || 0) === 0 && (
              <p className={`text-xs mb-4 ${theme.textMuted}`}>No active campaigns yet</p>
            )}
            <div className={`flex justify-between items-center pt-4 border-t ${isDarkMode ? 'border-[#ededed]/10' : 'border-[#f5f5f5]'}`}>
                {(data?.overview?.activeCampaigns || 0) > 0 ? (
                  <>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        <ArrowUpRight className="w-3 h-3" /> {data?.overview.activeCampaignsChange || 0}%
                    </span>
                    <span className={`text-xs ${theme.textMuted}`}>vs last period</span>
                  </>
                ) : (
                  <button 
                    onClick={() => { window.location.hash = '/campaigns?action=create'; }}
                    className="w-full py-2 bg-[#ffcc29] hover:bg-[#e6b825] text-[#070A12] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create New Campaign
                  </button>
                )}
            </div>
        </div>

        {/* Budget Spent Card - Interactive Graph */}
        <div className={`${theme.bgCard} rounded-2xl border ${isDarkMode ? 'border-[#ffcc29]/20 hover:border-[#ffcc29]/40' : 'border-[#ededed] hover:border-slate-200'} p-6 transition-all duration-200`}>
            <div className="flex justify-between items-start mb-4">
                <span className={`font-medium text-xs uppercase tracking-wider ${theme.textSecondary}`}>Budget Spent</span>
                <div className="flex items-center gap-2">
                    <SectionButtons 
                      sectionType="budgetSpent" 
                      sectionData={{ total: data?.overview.totalSpent, dailyData: budgetData }} 
                    />
                </div>
            </div>
            <div className={`text-5xl font-bold mb-4 tracking-tight ${theme.text}`}>
              {hasSpend ? `$${(data?.overview.totalSpent || 0).toLocaleString()}` : (
                <span className={`text-2xl ${theme.textMuted}`}>$0</span>
              )}
            </div>
            
            {/* Interactive Graph */}
            {hasSpend ? (
              <div className="relative h-16 mt-4">
                <svg 
                  viewBox="0 0 280 60" 
                  className="w-full h-full"
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Gradient fill */}
                  <defs>
                    <linearGradient id="budgetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  
                  {/* Area fill */}
                  <path
                    d={`M 0 55 ${budgetData.map((val: number, i: number) => `L ${i * 40 + 20} ${55 - (val / Math.max(...budgetData, 1)) * 45}`).join(' ')} L 280 55 Z`}
                    fill="url(#budgetGradient)"
                  />
                  
                  {/* Line */}
                  <path
                    d={`M ${budgetData.map((val: number, i: number) => `${i * 40 + 20} ${55 - (val / Math.max(...budgetData, 1)) * 45}`).join(' L ')}`}
                    fill="none"
                    stroke="rgb(99, 102, 241)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Interactive points */}
                  {budgetData.map((val: number, i: number) => {
                    const x = i * 40 + 20;
                    const y = 55 - (val / Math.max(...budgetData, 1)) * 45;
                    return (
                      <g key={i}>
                        <circle
                          cx={x}
                          cy={y}
                          r="12"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint({ x, y, value: val })}
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r={hoveredPoint?.x === x ? 5 : 3}
                          fill="white"
                          stroke="rgb(99, 102, 241)"
                          strokeWidth="2"
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </svg>
                
                {/* Tooltip */}
                {hoveredPoint && (
                  <div 
                    className="absolute bg-#0a0f1a text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
                    style={{ left: `${(hoveredPoint.x / 280) * 100}%`, top: `${(hoveredPoint.y / 60) * 100 - 10}%` }}
                  >
                    ${hoveredPoint.value.toLocaleString()}
                    <div className="absolute left-1/2 -bottom-1 transform -translate-x-1/2 w-2 h-2 bg-#0a0f1a rotate-45"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-16 mt-4 flex items-center justify-center">
                <p className={`text-xs ${theme.textMuted}`}>No spend data yet</p>
              </div>
            )}
            
            {/* Day labels */}
            <div className="flex justify-between mt-1 px-2">
              {days.map((day: string, i: number) => (
                <span key={i} className={`text-[10px] ${theme.textMuted}`}>{day}</span>
              ))}
            </div>
        </div>

        {/* Brand Score Card - Matching other cards */}
        <div className={`${theme.bgCard} rounded-2xl border ${isDarkMode ? 'border-[#ffcc29]/20 hover:border-[#ffcc29]/40' : 'border-[#ededed] hover:border-slate-200'} p-6 transition-all duration-200`}>
             <div className="flex justify-between items-start mb-6">
                <span className={`font-medium text-xs uppercase tracking-wider ${theme.textSecondary}`}>AI Brand Score</span>
                <div className="flex items-center gap-2">
                   <SectionButtons 
                     sectionType="brandScore" 
                     sectionData={{ score: data?.overview.brandScore, change: data?.overview.brandScoreChange, factors: data?.brandScoreFactors }} 
                   />
                </div>
             </div>
             
             <div className="flex items-center gap-6">
                 <div className="relative">
                     <svg className="w-20 h-20 transform -rotate-90">
                         <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" className={isDarkMode ? 'text-[#ffcc29]/20' : 'text-[#ffcc29]/20'} />
                         <circle 
                           cx="40" cy="40" r="32" 
                           stroke="currentColor" 
                           strokeWidth="6" 
                           fill="transparent" 
                           strokeDasharray={`${data?.overview.brandScore ? data.overview.brandScore * 2.01 : 0} 201`} 
                           strokeLinecap="round"
                           className="text-[#ffcc29] transition-all duration-1000 ease-out" 
                         />
                     </svg>
                     <div className={`absolute inset-0 flex items-center justify-center text-2xl font-bold tracking-tight ${theme.text}`}>
                         {data?.overview.brandScore ?? 0}
                     </div>
                 </div>
                 <div className="flex-1">
                     <div className={`text-4xl font-bold mb-1 tracking-tight ${theme.text}`}>
                       {data?.overview.brandScore ?? 0}<span className={`text-lg ${theme.textMuted}`}>/100</span>
                     </div>
                     <p className={`text-xs ${theme.textMuted}`}>Overall brand health</p>
                 </div>
             </div>
             
             <div className={`flex justify-between items-center pt-4 mt-4 border-t ${isDarkMode ? 'border-[#ededed]/10' : 'border-[#f5f5f5]'}`}>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    <ArrowUpRight className="w-3 h-3" /> {data?.overview.brandScoreChange ?? 0}%
                </span>
                <span className={`text-xs ${theme.textMuted}`}>vs last period</span>
             </div>
        </div>
      </div>

      {/* Brand Score Info Modal */}
      {showBrandScoreInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowBrandScoreInfo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-#ffcc2920 rounded-xl">
                  <Info className="w-5 h-5 text-#ffcc29" />
                </div>
                <h3 className="text-lg font-semibold text-#0a0f1a">How AI Brand Score Works</h3>
              </div>
              <button onClick={() => setShowBrandScoreInfo(false)} className="p-1.5 hover:bg-#ededed rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Your <strong>AI Brand Score</strong> is a comprehensive metric (0-100) calculated by our AI engine that measures your brand's overall marketing health and effectiveness. The score is updated in real-time based on data from all your connected social platforms.
              {data?.businessContext?.industry && (
                <span className="block mt-2 text-#ffcc29 font-medium">
                  📊 Personalized for {data.businessContext.name || 'your'} {data.businessContext.industry} business.
                </span>
              )}
            </p>

            {/* Score Formula */}
            <div className="mb-5 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">📐 Score Calculation Formula</h4>
              <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 text-center">
                Brand Score = (E × 0.30) + (C × 0.25) + (A × 0.25) + (P × 0.20)
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">Where E = Engagement, C = Consistency, A = Audience Growth, P = Performance</p>
            </div>
            
            <div className="space-y-4 mb-5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">📊 Weightage Breakdown & Criteria</h4>
              
              {/* Engagement Rate - 30% */}
              <div className="p-4 bg-#f5f5f5 rounded-xl border-l-4 border-#ffcc29">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-#ffcc2920 rounded-lg flex items-center justify-center text-#ffcc29 font-bold text-lg">30%</div>
                    <h5 className="font-semibold text-#0f1526">Engagement Rate</h5>
                  </div>
                  {data?.brandScoreFactors?.engagement && (
                    <span className="text-sm font-bold text-#ffcc29">Score: {data.brandScoreFactors.engagement.score}/100</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-2">Measures how actively your audience interacts with your content.</p>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Criteria Evaluated:</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• <strong>Likes & Reactions:</strong> Total interactions per post relative to followers</li>
                    <li>• <strong>Comments:</strong> Quality and quantity of audience responses</li>
                    <li>• <strong>Shares & Reposts:</strong> Content virality and shareability</li>
                    <li>• <strong>Saves & Bookmarks:</strong> Content value perception</li>
                    <li>• <strong>Industry Benchmark:</strong> Compared against {data?.businessContext?.industry || 'your industry'} average (2-5%)</li>
                  </ul>
                </div>
                {data?.brandScoreFactors?.engagement?.reason && (
                  <p className="text-xs text-#ffcc29 mt-2 italic">💡 {data.brandScoreFactors.engagement.reason}</p>
                )}
              </div>

              {/* Content Consistency - 25% */}
              <div className="p-4 bg-#f5f5f5 rounded-xl border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-lg">25%</div>
                    <h5 className="font-semibold text-#0f1526">Content Consistency</h5>
                  </div>
                  {data?.brandScoreFactors?.consistency && (
                    <span className="text-sm font-bold text-blue-600">Score: {data.brandScoreFactors.consistency.score}/100</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-2">Evaluates your posting regularity and schedule adherence.</p>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Criteria Evaluated:</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• <strong>Posting Frequency:</strong> Posts per week across all platforms</li>
                    <li>• <strong>Schedule Adherence:</strong> Consistency in posting times</li>
                    <li>• <strong>Platform Coverage:</strong> Activity across connected channels</li>
                    <li>• <strong>Content Gap Analysis:</strong> Days without any posts</li>
                    <li>• <strong>Optimal Timing:</strong> Posting during peak engagement hours</li>
                  </ul>
                </div>
                {data?.brandScoreFactors?.consistency?.reason && (
                  <p className="text-xs text-blue-600 mt-2 italic">💡 {data.brandScoreFactors.consistency.reason}</p>
                )}
              </div>

              {/* Audience Growth - 25% */}
              <div className="p-4 bg-#f5f5f5 rounded-xl border-l-4 border-emerald-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-lg">25%</div>
                    <h5 className="font-semibold text-#0f1526">Audience Growth</h5>
                  </div>
                  {data?.brandScoreFactors?.audienceGrowth && (
                    <span className="text-sm font-bold text-emerald-600">Score: {data.brandScoreFactors.audienceGrowth.score}/100</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-2">Tracks your follower growth rate and reach expansion.</p>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Criteria Evaluated:</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• <strong>Follower Growth Rate:</strong> Week-over-week & month-over-month increase</li>
                    <li>• <strong>Net New Followers:</strong> New followers minus unfollows</li>
                    <li>• <strong>Reach & Impressions:</strong> Total unique users viewing your content</li>
                    <li>• <strong>Profile Visits:</strong> Users actively seeking your profile</li>
                    <li>• <strong>Growth Trajectory:</strong> Trending upward, stable, or declining</li>
                  </ul>
                </div>
                {data?.brandScoreFactors?.audienceGrowth?.reason && (
                  <p className="text-xs text-emerald-600 mt-2 italic">💡 {data.brandScoreFactors.audienceGrowth.reason}</p>
                )}
              </div>

              {/* Campaign Performance - 20% */}
              <div className="p-4 bg-#f5f5f5 rounded-xl border-l-4 border-amber-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold text-lg">20%</div>
                    <h5 className="font-semibold text-#0f1526">Campaign Performance</h5>
                  </div>
                  {data?.brandScoreFactors?.contentQuality && (
                    <span className="text-sm font-bold text-amber-600">Score: {data.brandScoreFactors.contentQuality.score}/100</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-2">Measures your marketing campaign effectiveness and ROI.</p>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Criteria Evaluated:</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• <strong>Click-Through Rate (CTR):</strong> Users taking action on your content</li>
                    <li>• <strong>Conversion Rate:</strong> Actions leading to desired outcomes</li>
                    <li>• <strong>ROI Metrics:</strong> Return on marketing investment</li>
                    <li>• <strong>Link Performance:</strong> Bio link and story link clicks</li>
                    <li>• <strong>Campaign Goal Achievement:</strong> Meeting set marketing objectives</li>
                  </ul>
                </div>
                {data?.brandScoreFactors?.contentQuality?.reason && (
                  <p className="text-xs text-amber-600 mt-2 italic">💡 {data.brandScoreFactors.contentQuality.reason}</p>
                )}
              </div>
            </div>

            {/* Score Ranges */}
            <div className="mb-5 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">🎯 Score Interpretation</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs"><strong>80-100:</strong> Excellent</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs"><strong>60-79:</strong> Good</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-xs"><strong>40-59:</strong> Needs Work</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs"><strong>0-39:</strong> Critical</span>
                </div>
              </div>
            </div>

            {/* Personalized Tips */}
            {data?.personalizedTips && data.personalizedTips.length > 0 && (
              <div className="mb-5 p-4 bg-#ffcc2910 rounded-xl border border-#ffcc2930">
                <h4 className="text-xs font-bold text-#ffcc29 uppercase tracking-wider mb-2">💡 Personalized Tips to Improve</h4>
                <ul className="space-y-2">
                  {data.personalizedTips.slice(0, 3).map((tip, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-2 bg-white p-2 rounded-lg">
                      <span className="text-#ffcc29 font-bold">{idx + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data Sources */}
            <div className="mb-5 p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 text-center">
                📡 Score is calculated using real-time data from your connected platforms and updated every time you visit the dashboard.
              </p>
            </div>
            
            <button 
              onClick={() => setShowBrandScoreInfo(false)} 
              className="w-full py-3 bg-#ffcc29 hover:bg-#e6b824 text-#0a0f1a text-sm font-semibold rounded-xl transition-colors"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Competitor Radar - Enhanced with Stats Bar and Better Layout */}
        <div className={`${theme.bgCard} rounded-2xl border ${isDarkMode ? 'border-[#ffcc29]/20 hover:border-[#ffcc29]/40' : 'border-[#ededed] hover:border-slate-200'} p-6 transition-all duration-200 min-h-[420px] flex flex-col`}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className={`text-sm font-semibold ${theme.text}`}>Competitor Radar</h2>
                    <SectionButtons 
                      sectionType="competitorRadar" 
                      sectionData={{ competitors: data?.competitorActivity, current: currentCompetitor }} 
                    />
                </div>
                <div className="flex items-center gap-2">
                <button 
                  onClick={async () => {
                    try {
                      // Use the new real competitor posts API
                      const result = await apiService.refreshRealCompetitorPosts();
                      if (result.success && result.posts?.length > 0) {
                        alert(`✅ Fetched ${result.posts.length} REAL posts from social media!`);
                        // Reload dashboard data to show real posts
                        const refreshed = await apiService.getDashboardOverview();
                        setData(refreshed);
                      } else {
                        alert(`⚠️ ${result.message || 'Could not fetch real posts. Check competitor social handles.'}`);
                      }
                    } catch (e: any) {
                      console.error('Real-time scrape error:', e);
                      alert('❌ Real-time scraping not available. Please check your Apify API key.');
                    }
                  }}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                  title="Fetch REAL posts from competitor social media accounts"
                >
                  🔄 Live
                </button>
                <button 
                  onClick={() => window.open('/competitors', '_self')}
                  className="text-[#ffcc29] text-xs font-semibold hover:underline px-3 py-1.5 bg-[#ffcc29]/10 rounded-lg hover:bg-[#ffcc29]/20 transition-colors"
                >
                  View All
                </button>
                </div>
            </div>
            
            {(!data?.competitorActivity || data.competitorActivity.length === 0) ? (
              <div className={`${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-[#f5f5f5] border-[#ededed]'} border rounded-xl p-8 text-center`}>
                <div className={`w-12 h-12 ${isDarkMode ? 'bg-[#070A12]' : 'bg-[#ededed]'} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <Activity className={`w-6 h-6 ${theme.textMuted}`} />
                </div>
                <p className={`text-sm font-medium mb-1 ${theme.textSecondary}`}>No competitor data yet</p>
                <p className={`text-xs mb-4 ${theme.textMuted}`}>Add competitors to track their activity</p>
                <button 
                  onClick={() => window.open('/competitors', '_self')}
                  className="px-4 py-2 bg-[#ffcc29] hover:bg-[#e6b825] text-[#070A12] text-xs font-semibold rounded-lg transition-colors"
                >
                  + Add Competitors
                </button>
              </div>
            ) : (
            <>
            <div className="relative flex items-stretch gap-4 flex-1">
                {/* Left Navigation with Preview */}
                <div className="flex flex-col items-center justify-center shrink-0 w-20">
                  <button 
                    onClick={handlePrevCompetitor}
                    className={`p-2.5 ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/30 hover:border-[#ffcc29]/60' : 'bg-white border-slate-200 hover:border-[#ffcc29]'} border rounded-full shadow-sm ${theme.textSecondary} hover:text-[#ffcc29] transition-all mb-2`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {prevCompetitor && (
                    <div 
                      onClick={handlePrevCompetitor}
                      className={`text-center cursor-pointer hover:opacity-80 transition-opacity px-1`}
                    >
                      <p className={`text-[10px] font-medium ${theme.textSecondary} truncate max-w-[80px]`}>{prevCompetitor.competitorName}</p>
                      <p className={`text-[9px] ${theme.textMuted} line-clamp-2 leading-tight mt-0.5`}>
                        "{prevCompetitor.content?.substring(0, 40)}..."
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Main Competitor Card */}
                <div className="flex-1 min-w-0 flex">
                    {currentCompetitor && (
                        <div 
                          className={`${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-[#f5f5f5] border-[#ededed]'} border rounded-xl p-5 relative min-h-[280px] flex flex-col w-full ${currentCompetitor.postUrl ? 'cursor-pointer hover:border-[#ffcc29]/30 hover:shadow-md transition-all' : ''}`}
                          onClick={() => currentCompetitor.postUrl && window.open(currentCompetitor.postUrl, '_blank')}
                        >
                            {currentCompetitor.postUrl && (
                              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                <span className="text-[9px] text-[#ffcc29] font-medium">View Post</span>
                                <ExternalLink className="w-3.5 h-3.5 text-[#ffcc29]" />
                              </div>
                            )}
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-11 h-11 rounded-full ${isDarkMode ? 'bg-[#070A12]' : 'bg-white'} shadow-sm flex items-center justify-center text-sm font-bold ${theme.text} border ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-[#ededed]'}`}>
                                    {currentCompetitor.competitorLogo || currentCompetitor.competitorName?.charAt(0) || 'C'}
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${theme.text}`}>{currentCompetitor.competitorName}</p>
                                    <p className={`text-xs ${theme.textMuted} flex items-center gap-1`}>
                                        <span className={`w-2 h-2 rounded-full ${
                                          currentCompetitor.platform === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' :
                                          currentCompetitor.platform === 'twitter' ? 'bg-[#1DA1F2]' :
                                          currentCompetitor.platform === 'linkedin' ? 'bg-[#0A66C2]' :
                                          currentCompetitor.platform === 'facebook' ? 'bg-[#1877F2]' :
                                          currentCompetitor.platform === 'tiktok' ? 'bg-black' :
                                          currentCompetitor.platform === 'youtube' ? 'bg-[#FF0000]' :
                                          'bg-slate-400'
                                        }`}></span>
                                        {currentCompetitor.platform} • {currentCompetitor.postedAt}
                                    </p>
                                </div>
                            </div>
                            <p className={`text-sm ${theme.textSecondary} mb-4 leading-relaxed ${isDarkMode ? 'bg-[#070A12]' : 'bg-white'} p-4 rounded-lg border ${isDarkMode ? 'border-[#ffcc29]/10' : 'border-[#ededed]'} italic min-h-[120px] flex-1`}>
                                "{currentCompetitor.content}"
                            </p>
                            <div className="flex justify-between items-center mt-auto">
                                <div className={`flex gap-4 text-xs font-medium ${theme.textSecondary}`}>
                                    <span>❤️ {(currentCompetitor.likes || 0).toLocaleString()}</span>
                                    <span>💬 {currentCompetitor.comments || 0}</span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                                    currentCompetitor.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' : 
                                    currentCompetitor.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-200 text-slate-600'
                                }`}>
                                    {currentCompetitor.sentiment}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Right Navigation with Preview */}
                <div className="flex flex-col items-center justify-center shrink-0 w-20">
                  <button 
                    onClick={handleNextCompetitor}
                    className={`p-2.5 ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/30 hover:border-[#ffcc29]/60' : 'bg-white border-slate-200 hover:border-[#ffcc29]'} border rounded-full shadow-sm ${theme.textSecondary} hover:text-[#ffcc29] transition-all mb-2`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {nextCompetitor && (
                    <div 
                      onClick={handleNextCompetitor}
                      className={`text-center cursor-pointer hover:opacity-80 transition-opacity px-1`}
                    >
                      <p className={`text-[10px] font-medium ${theme.textSecondary} truncate max-w-[80px]`}>{nextCompetitor.competitorName}</p>
                      <p className={`text-[9px] ${theme.textMuted} line-clamp-2 leading-tight mt-0.5`}>
                        "{nextCompetitor.content?.substring(0, 40)}..."
                      </p>
                    </div>
                  )}
                </div>
            </div>
            
            {/* Pagination dots */}
            {data?.competitorActivity && data.competitorActivity.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {data.competitorActivity.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCompetitorIndex(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === competitorIndex ? 'bg-[#ffcc29] w-4' : isDarkMode ? 'bg-[#ededed]/30 hover:bg-[#ededed]/50' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            )}
            </>
            )}
        </div>

        {/* Suggested Actions - With Action Buttons and Dismiss */}
        <div className={`${theme.bgCard} rounded-2xl border ${isDarkMode ? 'border-[#ffcc29]/20 hover:border-[#ffcc29]/40' : 'border-[#ededed] hover:border-slate-200'} p-6 transition-all duration-200 flex flex-col`}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#ffcc29]" />
                    <h2 className={`text-sm font-semibold ${theme.text}`}>Recommended Actions</h2>
                    <SectionButtons 
                      sectionType="recommendedActions" 
                      sectionData={{ actions: data?.suggestedActions }} 
                    />
                </div>
                <span className="text-[10px] bg-[#ffcc29]/20 text-[#ffcc29] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide">AI Personalized</span>
            </div>
            
            {/* Business context indicator */}
            {data?.businessContext?.name && (
              <div className={`mb-4 px-3 py-2 ${isDarkMode ? 'bg-[#ffcc29]/10 border-[#ffcc29]/20' : 'bg-[#ffcc29]/10 border-[#ffcc29]/20'} border rounded-lg`}>
                <p className="text-[10px] text-[#ffcc29] uppercase tracking-wider mb-0.5">Tailored for</p>
                <p className={`text-xs ${theme.text} font-medium`}>
                  {data.businessContext.name} • {data.businessContext.industry}
                </p>
              </div>
            )}

            <div className="space-y-2.5 flex-1">
                {/* Loading state */}
                {loadingMoreActions && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#ffcc29]" />
                    <span className={`ml-2 text-sm ${theme.textMuted}`}>Generating personalized recommendations...</span>
                  </div>
                )}
                
                {/* Show actions if available and not loading */}
                {!loadingMoreActions && data?.suggestedActions && data.suggestedActions.length > 0 && 
                  data.suggestedActions
                    .filter(action => !dismissedActions.has(action.id))
                    .map((action, idx) => {
                      const actionBtn = getActionButton(action.actionType || action.type || 'create_campaign', action.title);
                      return (
                        <div key={action.id} className={`flex items-center justify-between gap-2 p-3 ${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20 hover:border-[#ffcc29]/40' : 'bg-[#f5f5f5] border-[#ededed] hover:border-slate-300'} border rounded-xl transition-all`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  action.priority === 'high' ? 'bg-red-100 text-red-600 border border-red-200' :
                                  action.priority === 'medium' ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                                  'bg-[#ffcc29]/20 text-[#ffcc29] border border-[#ffcc29]/30'
                                }`}>
                                    {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium ${theme.text} truncate`}>{action.title}</p>
                                  {action.description && (
                                    <p className={`text-[10px] ${theme.textMuted} mt-0.5 truncate`}>{action.description}</p>
                                  )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={actionBtn.onClick}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffcc29] hover:bg-[#e6b825] text-[#070A12] text-xs font-semibold rounded-lg transition-colors"
                              >
                                {actionBtn.icon}
                                {actionBtn.label}
                              </button>
                              <button
                                onClick={() => setDismissedActions(prev => new Set([...prev, action.id]))}
                                className={`p-1.5 ${isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/20' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'} rounded-lg transition-colors`}
                                title="Dismiss this recommendation"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                        </div>
                      );
                  })
                }
                
                {/* Show message when all actions are dismissed */}
                {!loadingMoreActions && data?.suggestedActions && data.suggestedActions.length > 0 && 
                  data.suggestedActions.filter(a => !dismissedActions.has(a.id)).length === 0 && (
                  <div className="text-center py-6">
                    <p className={`text-sm mb-2 ${theme.textMuted}`}>All recommendations dismissed</p>
                    <button 
                      onClick={() => setDismissedActions(new Set())}
                      className="text-[#ffcc29] text-xs hover:text-[#e6b825] underline"
                    >
                      Restore all
                    </button>
                  </div>
                )}
                
                {/* No recommendations available */}
                {!loadingMoreActions && (!data?.suggestedActions || data.suggestedActions.length === 0) && (
                  <div className="text-center py-8">
                    <div className={`w-12 h-12 ${isDarkMode ? 'bg-[#ffcc29]/20' : 'bg-[#ffcc29]/10'} rounded-full flex items-center justify-center mx-auto mb-3`}>
                      <TrendingUp className="w-6 h-6 text-[#ffcc29]" />
                    </div>
                    <p className={`text-sm font-medium mb-1 ${theme.textSecondary}`}>No recommendations yet</p>
                    <p className={`text-xs mb-4 ${theme.textMuted}`}>Click below to generate AI-powered marketing suggestions</p>
                  </div>
                )}
                
                <button 
                  onClick={async () => {
                    setLoadingMoreActions(true);
                    setDismissedActions(new Set()); // Clear dismissed on refresh
                    try {
                      await fetchData();
                    } finally {
                      setLoadingMoreActions(false);
                    }
                  }}
                  disabled={loadingMoreActions}
                  className={`w-full mt-2 py-3 border border-dashed ${isDarkMode ? 'border-[#ffcc29]/30 hover:border-[#ffcc29]/50' : 'border-slate-300 hover:border-[#ffcc29]'} rounded-xl ${theme.textSecondary} text-sm hover:text-[#ffcc29] hover:bg-[#ffcc29]/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                    {loadingMoreActions ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Generate AI Recommendations</>
                    )}
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
         {/* Interactive Calendar */}
         <CalendarWidget campaigns={data?.recentCampaigns || []} dashboardData={data} onCampaignCreated={fetchData} />
      </div>
    </div>
  );
};

const CalendarWidget: React.FC<{ campaigns: Campaign[]; dashboardData?: DashboardData | null; onCampaignCreated?: () => void }> = ({ campaigns, dashboardData, onCampaignCreated }) => {
    const { isDarkMode } = useTheme();
    const theme = getThemeClasses(isDarkMode);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<Campaign | null>(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [pendingReminders, setPendingReminders] = useState<any[]>([]);
    const [showReminderToast, setShowReminderToast] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('week');
    const [allCampaigns, setAllCampaigns] = useState<Campaign[]>(campaigns);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    
    // Update allCampaigns when props change
    useEffect(() => {
      setAllCampaigns(campaigns);
    }, [campaigns]);
    
    // Schedule form state with enhanced campaign fields
    const [scheduleForm, setScheduleForm] = useState({
      title: '',
      type: 'reminder' as 'reminder' | 'campaign',
      description: '',
      reminderOffset: 30,
      platform: 'instagram',
      // Enhanced campaign fields
      budget: '',
      targetAudience: '',
      contentType: 'image' as 'image' | 'video' | 'carousel' | 'story' | 'reel',
      hashtags: '',
      callToAction: '',
      objective: 'awareness' as 'awareness' | 'engagement' | 'traffic' | 'conversions' | 'leads',
      priority: 'medium' as 'low' | 'medium' | 'high',
      notes: ''
    });

    // Get the start of the week (Monday)
    const getWeekStart = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    };

    const weekStart = getWeekStart(currentDate);
    
    // Generate week days (Mon-Sun)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
    });

    // Time slots from 6 AM to 11 PM
    const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6);

    // Fetch calendar events and pending reminders
    useEffect(() => {
      const fetchCalendarData = async () => {
        try {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const { events } = await apiService.getCalendarEvents(year, month);
          setCalendarEvents(events || []);
        } catch (e) {
          console.error('Failed to fetch calendar events:', e);
        }
      };
      
      const fetchPendingReminders = async () => {
        try {
          const { reminders, count } = await apiService.getPendingReminders();
          setPendingReminders(reminders || []);
          if (count > 0) {
            setShowReminderToast(true);
          }
        } catch (e) {
          console.error('Failed to fetch pending reminders:', e);
        }
      };
      
      // Fetch all campaigns to display in calendar
      const fetchAllCampaigns = async () => {
        try {
          const response = await apiService.getCampaigns();
          setAllCampaigns(response.campaigns || []);
        } catch (e) {
          console.error('Failed to fetch campaigns:', e);
        }
      };
      
      fetchCalendarData();
      fetchPendingReminders();
      fetchAllCampaigns();
      
      // Check for pending reminders every minute
      const reminderInterval = setInterval(fetchPendingReminders, 60000);
      return () => clearInterval(reminderInterval);
    }, [currentDate]);

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        if (viewType === 'day') {
          newDate.setDate(currentDate.getDate() - 1);
        } else if (viewType === 'week') {
          newDate.setDate(currentDate.getDate() - 7);
        } else {
          newDate.setMonth(currentDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        if (viewType === 'day') {
          newDate.setDate(currentDate.getDate() + 1);
        } else if (viewType === 'week') {
          newDate.setDate(currentDate.getDate() + 7);
        } else {
          newDate.setMonth(currentDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const handleToday = () => setCurrentDate(new Date());
    
    // Refresh campaigns from API
    const refreshCampaigns = async () => {
      try {
        const response = await apiService.getCampaigns();
        setAllCampaigns(response.campaigns || []);
        if (onCampaignCreated) onCampaignCreated();
      } catch (e) {
        console.error('Failed to refresh campaigns:', e);
      }
    };
    
    // Handle click on time slot to schedule
    const handleSlotClick = (date: Date, hour: number) => {
      const slotDate = new Date(date);
      slotDate.setHours(hour, 0, 0, 0);
      setSelectedSlot({ date: slotDate, hour });
      setScheduleForm({
        title: '',
        type: 'reminder',
        description: '',
        reminderOffset: 30,
        platform: 'instagram',
        budget: '',
        targetAudience: '',
        contentType: 'image',
        hashtags: '',
        callToAction: '',
        objective: 'awareness',
        priority: 'medium',
        notes: ''
      });
      setShowScheduleModal(true);
    };
    
    // Handle creating a reminder/event
    const handleCreateEvent = async () => {
      if (!selectedSlot || !scheduleForm.title.trim()) return;
      
      setLoading(true);
      try {
        const scheduledFor = new Date(selectedSlot.date);
        scheduledFor.setHours(selectedSlot.hour, 0, 0, 0);
        
        // Format date as YYYY-MM-DD in local timezone (not UTC)
        const year = scheduledFor.getFullYear();
        const month = String(scheduledFor.getMonth() + 1).padStart(2, '0');
        const day = String(scheduledFor.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${day}`;
        
        if (scheduleForm.type === 'reminder') {
          await apiService.createReminder({
            title: scheduleForm.title,
            description: scheduleForm.description,
            scheduledFor: scheduledFor.toISOString(),
            reminderOffset: scheduleForm.reminderOffset,
            platform: scheduleForm.platform
          });
          
          // Refresh calendar events
          const calYear = currentDate.getFullYear();
          const calMonth = currentDate.getMonth() + 1;
          const { events } = await apiService.getCalendarEvents(calYear, calMonth);
          setCalendarEvents(events || []);
        } else {
          // Create a campaign with all the enhanced fields
          const result = await apiService.createCampaign({
            name: scheduleForm.title,
            objective: scheduleForm.objective,
            platforms: [scheduleForm.platform],
            status: 'scheduled',
            creative: { 
              type: scheduleForm.contentType, 
              textContent: scheduleForm.description, 
              imageUrls: [],
              hashtags: scheduleForm.hashtags ? scheduleForm.hashtags.split(',').map(h => h.trim()) : [],
              callToAction: scheduleForm.callToAction
            },
            scheduling: {
              startDate: localDateStr,
              postTime: `${String(selectedSlot.hour).padStart(2, '0')}:00`
            },
            budget: scheduleForm.budget ? { amount: parseFloat(scheduleForm.budget), currency: 'USD' } : undefined,
            targeting: scheduleForm.targetAudience ? { demographics: scheduleForm.targetAudience } : undefined,
            priority: scheduleForm.priority,
            notes: scheduleForm.notes
          });
          
          // Add the new campaign to local state immediately with proper structure
          if (result.campaign) {
            // Ensure the campaign has the scheduling data we just set
            const newCampaign = {
              ...result.campaign,
              scheduling: {
                ...result.campaign.scheduling,
                startDate: localDateStr,
                postTime: `${String(selectedSlot.hour).padStart(2, '0')}:00`
              }
            };
            setAllCampaigns(prev => [newCampaign, ...prev]);
          }
        }
        
        setShowScheduleModal(false);
        setSelectedSlot(null);
      } catch (e) {
        console.error('Failed to create event:', e);
        alert('Failed to create event. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    // Handle dismissing a reminder
    const handleDismissReminder = async (reminderId: string) => {
      try {
        await apiService.dismissReminder(reminderId);
        setPendingReminders(prev => prev.filter(r => r._id !== reminderId));
        if (pendingReminders.length <= 1) {
          setShowReminderToast(false);
        }
      } catch (e) {
        console.error('Failed to dismiss reminder:', e);
      }
    };
    
    // Handle snoozing a reminder
    const handleSnoozeReminder = async (reminderId: string, minutes: number = 15) => {
      try {
        await apiService.snoozeReminder(reminderId, minutes);
        setPendingReminders(prev => prev.filter(r => r._id !== reminderId));
        if (pendingReminders.length <= 1) {
          setShowReminderToast(false);
        }
      } catch (e) {
        console.error('Failed to snooze reminder:', e);
      }
    };
    
    // Handle opening edit modal for a campaign
    const handleEditCampaign = (campaign: Campaign) => {
      setEditingCampaign(campaign);
      setIsEditMode(true);
      setScheduleForm({
        title: campaign.name || '',
        type: 'campaign',
        description: campaign.creative?.textContent || '',
        reminderOffset: 30,
        platform: campaign.platforms?.[0] || 'instagram',
        budget: campaign.budget?.amount?.toString() || '',
        targetAudience: campaign.targeting?.demographics || '',
        contentType: campaign.creative?.type || 'image',
        hashtags: campaign.creative?.hashtags?.join(', ') || '',
        callToAction: campaign.creative?.callToAction || '',
        objective: campaign.objective || 'awareness',
        priority: campaign.priority || 'medium',
        notes: campaign.notes || ''
      });
      
      // Set the slot based on campaign schedule
      const startDate = campaign.scheduling?.startDate 
        ? new Date(campaign.scheduling.startDate) 
        : new Date();
      const hour = campaign.scheduling?.postTime 
        ? parseInt(campaign.scheduling.postTime.split(':')[0]) 
        : 9;
      
      setSelectedSlot({ date: startDate, hour });
      setShowScheduleModal(true);
      setSelectedEvent(null);
    };
    
    // Handle updating an existing campaign
    const handleUpdateCampaign = async () => {
      if (!editingCampaign || !selectedSlot || !scheduleForm.title.trim()) return;
      
      setLoading(true);
      try {
        const scheduledFor = new Date(selectedSlot.date);
        scheduledFor.setHours(selectedSlot.hour, 0, 0, 0);
        
        await apiService.updateCampaign(editingCampaign._id, {
          name: scheduleForm.title,
          platforms: [scheduleForm.platform],
          creative: { 
            ...editingCampaign.creative,
            textContent: scheduleForm.description 
          },
          scheduling: {
            ...editingCampaign.scheduling,
            startDate: scheduledFor.toISOString().split('T')[0],
            postTime: `${String(selectedSlot.hour).padStart(2, '0')}:00`
          }
        });
        
        // Refresh campaigns
        await refreshCampaigns();
        
        setShowScheduleModal(false);
        setSelectedSlot(null);
        setIsEditMode(false);
        setEditingCampaign(null);
      } catch (e) {
        console.error('Failed to update campaign:', e);
        alert('Failed to update campaign. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    // Handle deleting a campaign
    const handleDeleteCampaign = async () => {
      if (!selectedEvent) return;
      
      setDeleteLoading(true);
      try {
        await apiService.deleteCampaign(selectedEvent._id);
        
        // Remove from local state
        setAllCampaigns(prev => prev.filter(c => c._id !== selectedEvent._id));
        
        // Also refresh from API
        await refreshCampaigns();
        
        setShowDeleteConfirm(false);
        setSelectedEvent(null);
      } catch (e) {
        console.error('Failed to delete campaign:', e);
        alert('Failed to delete campaign. Please try again.');
      } finally {
        setDeleteLoading(false);
      }
    };

    // Get all events for a specific day (combining campaigns and reminders)
    const getEventsForDay = (date: Date) => {
        // Format the target date in local timezone
        const targetYear = date.getFullYear();
        const targetMonth = String(date.getMonth() + 1).padStart(2, '0');
        const targetDay = String(date.getDate()).padStart(2, '0');
        const dateStr = `${targetYear}-${targetMonth}-${targetDay}`;
        
        // Get campaigns from local state (includes newly created ones)
        const dayCampaigns = allCampaigns.filter(c => {
          if (!c.scheduling?.startDate) return false;
          // Handle both string dates and Date objects, normalize to YYYY-MM-DD
          let campaignDate: string;
          if (typeof c.scheduling.startDate === 'string') {
            // If it's already YYYY-MM-DD format, use it directly
            if (c.scheduling.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              campaignDate = c.scheduling.startDate;
            } else {
              // Parse as date and extract in local timezone
              const d = new Date(c.scheduling.startDate);
              campaignDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
          } else {
            const d = new Date(c.scheduling.startDate);
            campaignDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
          return campaignDate === dateStr;
        });
        
        // Get calendar events from API (reminders)
        const dayEvents = calendarEvents.filter(e => {
          if (!e.scheduledFor) return false;
          const d = new Date(e.scheduledFor);
          const eventDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return eventDate === dateStr;
        });
        
        return [...dayCampaigns.map(c => ({ ...c, eventType: 'campaign' })), ...dayEvents.map(e => ({ ...e, eventType: 'reminder' }))];
    };

    const formatDateRange = () => {
        if (viewType === 'day') {
          return currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });
        }
        
        if (viewType === 'month') {
          return currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          });
        }
        
        // Week view
        const endOfWeek = new Date(weekStart);
        endOfWeek.setDate(weekStart.getDate() + 6);
        
        const startMonth = weekStart.toLocaleDateString('en-US', { month: 'long' });
        const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'long' });
        const year = weekStart.getFullYear();
        
        if (startMonth === endMonth) {
            return `${startMonth} ${weekStart.getDate()}–${endOfWeek.getDate()}, ${year}`;
        }
        return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${endOfWeek.getDate()}, ${year}`;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const parseTime = (timeStr: string) => {
        if (!timeStr) return 9;
        const [hours] = timeStr.split(':').map(Number);
        return hours;
    };

    return (
        <div className={`${theme.bgCard} rounded-2xl border ${isDarkMode ? 'border-[#ffcc29]/20 hover:border-[#ffcc29]/40' : 'border-[#ededed] hover:border-slate-200'} overflow-hidden transition-all duration-200`}>
            {/* Reminder Toast Notification */}
            {showReminderToast && pendingReminders.length > 0 && (
              <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
                <div className={`${theme.bgCard} rounded-xl shadow-2xl border ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'} p-4 max-w-sm`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 ${isDarkMode ? 'bg-amber-900/30' : 'bg-amber-100'} rounded-lg`}>
                      <BellRing className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-sm ${theme.text}`}>
                        {pendingReminders.length} Reminder{pendingReminders.length > 1 ? 's' : ''}
                      </h4>
                      <p className={`text-xs mt-0.5 ${theme.textSecondary}`}>{pendingReminders[0]?.title}</p>
                      <div className="flex gap-2 mt-3">
                        <button 
                          onClick={() => handleDismissReminder(pendingReminders[0]?._id)}
                          className={`px-3 py-1.5 ${isDarkMode ? 'bg-[#0d1117] hover:bg-[#161b22] text-[#ededed]' : 'bg-[#ededed] hover:bg-slate-200 text-[#0f1526]'} text-xs font-medium rounded-lg transition-colors`}
                        >
                          Dismiss
                        </button>
                        <button 
                          onClick={() => handleSnoozeReminder(pendingReminders[0]?._id, 15)}
                          className="px-3 py-1.5 bg-[#ffcc29] hover:bg-[#e6b825] text-[#0a0f1a] text-xs font-medium rounded-lg transition-colors"
                        >
                          Snooze 15m
                        </button>
                      </div>
                    </div>
                    <button onClick={() => setShowReminderToast(false)} className={`${theme.textMuted} hover:${theme.text}`}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Header */}
            <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-[#ededed]'}`}>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleToday}
                        className={`px-4 py-2 ${theme.bgCard} border ${isDarkMode ? 'border-[#ffcc29]/30 hover:border-[#ffcc29]/50' : 'border-slate-200 hover:border-slate-300'} rounded-lg text-sm font-medium ${theme.textSecondary} hover:${isDarkMode ? 'bg-[#161b22]' : 'bg-[#f5f5f5]'} transition-all flex items-center gap-2`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Today
                    </button>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={handlePrevWeek}
                            className={`p-2 ${isDarkMode ? 'hover:bg-[#161b22]' : 'hover:bg-[#ededed]'} rounded-lg transition-colors`}
                        >
                            <ChevronLeft className={`w-4 h-4 ${theme.textSecondary}`} />
                        </button>
                        <button 
                            onClick={handleNextWeek}
                            className={`p-2 ${isDarkMode ? 'hover:bg-[#161b22]' : 'hover:bg-[#ededed]'} rounded-lg transition-colors`}
                        >
                            <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
                        </button>
                    </div>
                    <h2 className={`text-base font-semibold ${theme.text}`}>
                        {formatDateRange()}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {pendingReminders.length > 0 && (
                      <button 
                        onClick={() => setShowReminderToast(true)}
                        className={`relative p-2 ${isDarkMode ? 'hover:bg-amber-900/30' : 'hover:bg-amber-50'} rounded-lg transition-colors`}
                      >
                        <Bell className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-500'}`} />
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {pendingReminders.length}
                        </span>
                      </button>
                    )}
                    {/* View Type Selector */}
                    <div className={`flex items-center ${isDarkMode ? 'bg-[#0d1117]' : 'bg-[#ededed]'} rounded-lg p-0.5`}>
                      {(['day', 'week', 'month'] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => setViewType(view)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                            viewType === view
                              ? `${theme.bgCard} text-[#ffcc29] shadow-sm`
                              : `${theme.textSecondary} hover:${theme.text}`
                          }`}
                        >
                          {view}
                        </button>
                      ))}
                    </div>
                    <button 
                        onClick={() => {
                          const now = new Date();
                          setSelectedSlot({ date: now, hour: now.getHours() + 1 });
                          setScheduleForm({
                            title: '',
                            type: 'campaign',
                            description: '',
                            reminderOffset: 30,
                            platform: 'instagram',
                            budget: '',
                            targetAudience: '',
                            contentType: 'image',
                            hashtags: '',
                            callToAction: '',
                            objective: 'awareness',
                            priority: 'medium',
                            notes: ''
                          });
                          setShowScheduleModal(true);
                        }}
                        className={`text-xs text-[#070A12] bg-[#ffcc29] hover:bg-[#e6b825] px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow-sm`}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Schedule
                    </button>
                    <SectionButtons 
                      sectionType="calendar" 
                      sectionData={{ campaigns, currentWeek: formatDateRange() }} 
                    />
                </div>
            </div>

            {/* Calendar Grid */}
            {viewType === 'month' ? (
              // Month View
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1">
                  {/* Day name headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className={`h-8 flex items-center justify-center text-xs font-medium ${theme.textSecondary}`}>
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {(() => {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth();
                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);
                    const startPadding = firstDay.getDay();
                    const days = [];
                    
                    // Add empty cells for padding
                    for (let i = 0; i < startPadding; i++) {
                      days.push(<div key={`pad-${i}`} className={`h-24 ${isDarkMode ? 'bg-[#0d1117]/50' : 'bg-[#f5f5f5]/50'} rounded-lg`}></div>);
                    }
                    
                    // Add actual days
                    for (let d = 1; d <= lastDay.getDate(); d++) {
                      const date = new Date(year, month, d);
                      const dayEvents = getEventsForDay(date);
                      const today = isToday(date);
                      
                      days.push(
                        <div 
                          key={d} 
                          onClick={() => handleSlotClick(date, 9)}
                          className={`h-24 p-1.5 border ${isDarkMode ? 'border-[#ffcc29]/10' : 'border-[#ededed]'} rounded-lg ${isDarkMode ? 'hover:bg-[#ffcc29]/10' : 'hover:bg-[#ffcc29]/5'} cursor-pointer transition-colors ${
                            today ? `${isDarkMode ? 'bg-[#ffcc29]/20 border-[#ffcc29]/40' : 'bg-[#ffcc29]/10 border-indigo-200'}` : ''
                          }`}
                        >
                          <span className={`text-sm font-medium ${
                            today ? 'text-white bg-[#ffcc29] w-6 h-6 rounded-full flex items-center justify-center' : theme.text
                          }`}>
                            {d}
                          </span>
                          <div className="mt-1 space-y-0.5 overflow-hidden max-h-14">
                            {dayEvents.slice(0, 3).map((event: any, idx) => (
                              <div 
                                key={event._id || idx} 
                                onClick={(e) => { e.stopPropagation(); if (event.eventType === 'campaign') setSelectedEvent(event); }}
                                className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium shadow-sm ${
                                  event.eventType === 'reminder' || event.type === 'reminder' 
                                    ? `${isDarkMode ? 'bg-purple-500/80 text-white' : 'bg-purple-500 text-white'}` 
                                    : `${isDarkMode ? 'bg-[#ffcc29]/90 text-[#0a0f1a]' : 'bg-[#ffcc29] text-[#0a0f1a]'}`
                                }`}
                              >
                                {event.name || event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <span className={`text-[10px] pl-1 ${theme.textMuted}`}>+{dayEvents.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    return days;
                  })()}
                </div>
              </div>
            ) : viewType === 'day' ? (
              // Day View
              <div className="flex overflow-hidden" style={{ height: '500px' }}>
                {/* Time Column */}
                <div className={`flex-shrink-0 w-20 border-r ${isDarkMode ? 'border-[#ffcc29]/20 bg-[#0d1117]' : 'border-slate-200 bg-[#f5f5f5]'}`}>
                  {timeSlots.map(hour => (
                    <div key={hour} className={`h-14 border-b ${isDarkMode ? 'border-[#ffcc29]/10' : 'border-[#ededed]'} pr-3 flex items-start justify-end pt-0`}>
                      <span className={`text-xs ${theme.textMuted} -mt-2`}>
                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Single Day Grid */}
                <div className="flex-1 overflow-y-auto relative">
                  {timeSlots.map(hour => {
                    const dayEvents = getEventsForDay(currentDate).filter((e: any) => {
                      const eventHour = e.scheduling?.postTime 
                        ? parseInt(e.scheduling.postTime.split(':')[0]) 
                        : e.time ? new Date(e.time).getHours() : 9;
                      return eventHour === hour;
                    });
                    
                    return (
                      <div 
                        key={hour}
                        onClick={() => handleSlotClick(currentDate, hour)}
                        className={`h-14 border-b ${isDarkMode ? 'border-[#ffcc29]/10' : 'border-[#ededed]'} ${isDarkMode ? 'hover:bg-[#ffcc29]/10' : 'hover:bg-[#ffcc29]/5'} transition-colors cursor-pointer px-4 flex items-center gap-3`}
                      >
                        {dayEvents.map((event: any, idx) => (
                          <div 
                            key={event._id || idx}
                            onClick={(e) => { e.stopPropagation(); if (event.eventType === 'campaign') setSelectedEvent(event); }}
                            className={`flex-1 py-2 px-3 rounded-lg cursor-pointer shadow-md ${
                              event.eventType === 'reminder' || event.type === 'reminder' 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-[#ffcc29] text-[#0a0f1a]'
                            }`}
                          >
                            <p className="text-sm font-semibold truncate">{event.name || event.title}</p>
                            <p className={`text-xs ${event.eventType === 'reminder' || event.type === 'reminder' ? 'text-white/80' : 'text-[#0a0f1a]/70'}`}>{event.platforms?.join(', ') || event.platform || ''}</p>
                          </div>
                        ))}
                        {dayEvents.length === 0 && (
                          <span className={`text-sm opacity-0 hover:opacity-100 transition-opacity ${theme.textMuted}`}>+ Add event</span>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Current Time Indicator */}
                  {isToday(currentDate) && (
                    (() => {
                      const now = new Date();
                      const currentHour = now.getHours();
                      const currentMinute = now.getMinutes();
                      if (currentHour >= 6 && currentHour <= 23) {
                        const topPos = ((currentHour - 6) * 56) + (currentMinute * 0.93);
                        return (
                          <div 
                            className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                            style={{ top: `${topPos}px` }}
                          >
                            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500"></div>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
              </div>
            ) : (
              // Week View (default)
              <div className="flex overflow-hidden" style={{ height: '500px' }}>
                {/* Time Column */}
                <div className={`flex-shrink-0 w-16 border-r ${isDarkMode ? 'border-[#ffcc29]/20 bg-[#0d1117]' : 'border-slate-200 bg-[#f5f5f5]'}`}>
                    <div className={`h-16 border-b ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'}`}></div>
                    {timeSlots.map(hour => (
                        <div key={hour} className={`h-12 border-b ${isDarkMode ? 'border-[#ffcc29]/10' : 'border-[#ededed]'} pr-2 flex items-start justify-end pt-0`}>
                            <span className={`text-xs ${theme.textMuted} -mt-2`}>
                                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="flex-1 overflow-y-auto">
                    {/* Day Headers */}
                    <div className={`flex border-b ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'} ${theme.bgCard} sticky top-0 z-10`}>
                        {weekDays.map((day, idx) => {
                            const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = day.getDate();
                            const today = isToday(day);
                            
                            return (
                                <div 
                                    key={idx} 
                                    className={`flex-1 h-16 flex flex-col items-center justify-center border-r ${isDarkMode ? 'border-[#ffcc29]/10' : 'border-[#ededed]'} last:border-r-0 ${
                                        today ? `${isDarkMode ? 'bg-[#ffcc29]/20' : 'bg-[#ffcc29]/10'}` : ''
                                    }`}
                                >
                                    <span className={`text-xs font-medium ${today ? 'text-[#ffcc29]' : theme.textSecondary}`}>
                                        {dayName}
                                    </span>
                                    <span className={`text-xl font-bold mt-0.5 ${
                                        today 
                                            ? 'text-white bg-[#ffcc29] w-8 h-8 rounded-full flex items-center justify-center' 
                                            : theme.text
                                    }`}>
                                        {dayNum}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time Grid */}
                    <div className="flex relative">
                        {weekDays.map((day, dayIdx) => {
                            const dayEvents = getEventsForDay(day);
                            const today = isToday(day);
                            
                            return (
                                <div 
                                    key={dayIdx} 
                                    className={`flex-1 border-r ${isDarkMode ? 'border-[#ffcc29]/10' : 'border-[#ededed]'} last:border-r-0 relative ${
                                        today ? `${isDarkMode ? 'bg-[#ffcc29]/10' : 'bg-[#ffcc29]/5'}` : ''
                                    }`}
                                >
                                    {timeSlots.map(hour => (
                                        <div 
                                            key={hour} 
                                            onClick={() => handleSlotClick(day, hour)}
                                            className={`h-12 border-b ${isDarkMode ? 'border-[#ffcc29]/10' : 'border-[#ededed]'} ${isDarkMode ? 'hover:bg-[#ffcc29]/10' : 'hover:bg-[#ffcc29]/5'} transition-colors cursor-pointer group`}
                                        >
                                            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Plus className="w-4 h-4 text-[#ffcc29]" />
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Events */}
                                    {dayEvents.map((event: any, idx) => {
                                        const startHour = event.scheduling?.postTime 
                                          ? parseTime(event.scheduling.postTime)
                                          : event.time 
                                            ? new Date(event.time).getHours()
                                            : 9;
                                        const topOffset = (startHour - 6) * 48;
                                        
                                        const colors: Record<string, string> = {
                                            'active': 'bg-emerald-500 border-emerald-600',
                                            'posted': 'bg-emerald-500 border-emerald-600',
                                            'scheduled': 'bg-[#ffcc29] border-[#e6b825]',
                                            'draft': 'bg-amber-500 border-amber-600',
                                            'paused': 'bg-slate-400 border-slate-500',
                                            'pending': 'bg-blue-500 border-blue-600',
                                            'reminder': 'bg-purple-500 border-purple-600'
                                        };
                                        
                                        const eventStatus = event.status || 'scheduled';
                                        const eventType = event.type || event.eventType || 'campaign';
                                        const colorClass = eventType === 'reminder' ? colors['reminder'] : (colors[eventStatus] || 'bg-[#ffcc29] border-[#e6b825]');
                                        
                                        return (
                                            <div
                                                key={event._id || event.id || idx}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (event.eventType === 'campaign' || event.type === 'campaign') {
                                                    setSelectedEvent(event);
                                                  }
                                                }}
                                                className={`absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity shadow-md border-l-4 ${colorClass}`}
                                                style={{ 
                                                    top: `${topOffset}px`,
                                                    height: '44px'
                                                }}
                                            >
                                                <div className="flex items-center gap-1">
                                                  {eventType === 'reminder' && <Bell className="w-2.5 h-2.5 text-white/80" />}
                                                  <p className={`text-xs font-semibold truncate ${colorClass.includes('#ffcc29') ? 'text-[#0a0f1a]' : 'text-white'}`}>{event.name || event.title}</p>
                                                </div>
                                                <p className={`text-[10px] truncate ${colorClass.includes('#ffcc29') ? 'text-[#0a0f1a]/70' : 'text-white/80'}`}>
                                                  {event.scheduling?.postTime || (event.time ? new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                                                  {event.platforms?.[0] ? ` • ${event.platforms[0]}` : event.platform ? ` • ${event.platform}` : ''}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}

                        {/* Current Time Indicator */}
                        {weekDays.some(d => isToday(d)) && (
                            (() => {
                                const now = new Date();
                                const currentHour = now.getHours();
                                const currentMinute = now.getMinutes();
                                if (currentHour >= 6 && currentHour <= 23) {
                                    const topPos = ((currentHour - 6) * 48) + (currentMinute * 0.8);
                                    const todayIdx = weekDays.findIndex(d => isToday(d));
                                    return (
                                        <div 
                                            className="absolute h-0.5 bg-red-500 z-20 pointer-events-none"
                                            style={{ 
                                                top: `${topPos}px`,
                                                left: `${(todayIdx / 7) * 100}%`,
                                                width: `${100 / 7}%`
                                            }}
                                        >
                                            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500"></div>
                                        </div>
                                    );
                                }
                                return null;
                            })()
                        )}
                    </div>
                </div>
              </div>
            )}

            {/* Schedule Modal - Enhanced with all campaign details */}
            {showScheduleModal && selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowScheduleModal(false)}>
                    <div className={`${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200`} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className={`sticky top-0 z-10 ${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-white border-slate-200'} border-b px-6 py-4`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className={`text-lg font-bold ${theme.text}`}>{isEditMode ? 'Edit Campaign' : 'Schedule New Event'}</h3>
                                    <p className={`text-sm ${theme.textMuted} mt-0.5`}>
                                      Fill in the details below to {isEditMode ? 'update' : 'schedule'} your {scheduleForm.type}
                                    </p>
                                </div>
                                <button onClick={() => { setShowScheduleModal(false); setIsEditMode(false); setEditingCampaign(null); }} className={`p-2 ${isDarkMode ? 'hover:bg-[#161b22]' : 'hover:bg-slate-100'} rounded-lg transition-colors`}>
                                    <X className={`w-5 h-5 ${theme.textMuted}`} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-5">
                          {/* Event Type - hide in edit mode */}
                          {!isEditMode && (
                          <div>
                            <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Event Type</label>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => setScheduleForm(prev => ({ ...prev, type: 'reminder' }))}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  scheduleForm.type === 'reminder' 
                                    ? 'bg-purple-500/20 text-purple-500 border-2 border-purple-400' 
                                    : `${isDarkMode ? 'bg-[#161b22] text-slate-400 border-[#ffcc29]/10' : 'bg-slate-100 text-slate-600 border-transparent'} border-2 hover:border-purple-300`
                                }`}
                              >
                                <Bell className="w-4 h-4" /> Reminder
                              </button>
                              <button
                                onClick={() => setScheduleForm(prev => ({ ...prev, type: 'campaign' }))}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  scheduleForm.type === 'campaign' 
                                    ? 'bg-[#ffcc29]/20 text-[#ffcc29] border-2 border-[#ffcc29]' 
                                    : `${isDarkMode ? 'bg-[#161b22] text-slate-400 border-[#ffcc29]/10' : 'bg-slate-100 text-slate-600 border-transparent'} border-2 hover:border-[#ffcc29]/50`
                                }`}
                              >
                                <Activity className="w-4 h-4" /> Campaign
                              </button>
                            </div>
                          </div>
                          )}
                          
                          {/* Date & Time Section */}
                          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/10' : 'bg-slate-50 border-slate-200'} border`}>
                            <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide flex items-center gap-2`}>
                              <CalendarIcon className="w-3.5 h-3.5" /> Date & Time
                            </label>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div>
                                <label className={`text-[10px] ${theme.textMuted}`}>Date</label>
                                <input
                                  type="date"
                                  value={selectedSlot.date.toISOString().split('T')[0]}
                                  onChange={(e) => {
                                    const newDate = new Date(e.target.value);
                                    newDate.setHours(selectedSlot.hour, 0, 0, 0);
                                    setSelectedSlot({ date: newDate, hour: selectedSlot.hour });
                                  }}
                                  className={`w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                />
                              </div>
                              <div>
                                <label className={`text-[10px] ${theme.textMuted}`}>Time</label>
                                <select
                                  value={selectedSlot.hour}
                                  onChange={(e) => {
                                    const newHour = parseInt(e.target.value);
                                    const newDate = new Date(selectedSlot.date);
                                    newDate.setHours(newHour, 0, 0, 0);
                                    setSelectedSlot({ date: newDate, hour: newHour });
                                  }}
                                  className={`w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i}>
                                      {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          
                          {/* Title */}
                          <div>
                            <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>
                              {scheduleForm.type === 'reminder' ? 'Reminder Title' : 'Campaign Name'} *
                            </label>
                            <input
                              type="text"
                              value={scheduleForm.title}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder={scheduleForm.type === 'reminder' ? 'e.g., Review analytics report' : 'e.g., Holiday Sale Campaign'}
                              className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
                            />
                          </div>
                          
                          {/* Description / Content */}
                          <div>
                            <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>
                              {scheduleForm.type === 'reminder' ? 'Notes' : 'Post Content / Caption'}
                            </label>
                            <textarea
                              value={scheduleForm.description}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder={scheduleForm.type === 'reminder' ? 'Add any notes or details...' : 'Write your post caption here... Include emojis, mentions, and your message'}
                              rows={3}
                              className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] resize-none ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
                            />
                          </div>
                          
                          {/* Campaign-specific fields */}
                          {scheduleForm.type === 'campaign' && (
                            <>
                              {/* Platform & Content Type Row */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Platform *</label>
                                  <select
                                    value={scheduleForm.platform}
                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, platform: e.target.value }))}
                                    className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                  >
                                    <option value="instagram">📸 Instagram</option>
                                    <option value="facebook">📘 Facebook</option>
                                    <option value="twitter">🐦 Twitter/X</option>
                                    <option value="linkedin">💼 LinkedIn</option>
                                    <option value="tiktok">🎵 TikTok</option>
                                    <option value="youtube">▶️ YouTube</option>
                                  </select>
                                </div>
                                <div>
                                  <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Content Type</label>
                                  <select
                                    value={scheduleForm.contentType}
                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, contentType: e.target.value as any }))}
                                    className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                  >
                                    <option value="image">🖼️ Image Post</option>
                                    <option value="video">🎬 Video</option>
                                    <option value="carousel">📱 Carousel</option>
                                    <option value="story">⏱️ Story</option>
                                    <option value="reel">🎞️ Reel/Short</option>
                                  </select>
                                </div>
                              </div>

                              {/* Objective & Priority Row */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Campaign Objective</label>
                                  <select
                                    value={scheduleForm.objective}
                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, objective: e.target.value as any }))}
                                    className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                  >
                                    <option value="awareness">🌟 Brand Awareness</option>
                                    <option value="engagement">💬 Engagement</option>
                                    <option value="traffic">🔗 Website Traffic</option>
                                    <option value="conversions">🛒 Conversions</option>
                                    <option value="leads">📧 Lead Generation</option>
                                  </select>
                                </div>
                                <div>
                                  <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Priority</label>
                                  <select
                                    value={scheduleForm.priority}
                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, priority: e.target.value as any }))}
                                    className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                  >
                                    <option value="low">🟢 Low</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="high">🔴 High</option>
                                  </select>
                                </div>
                              </div>

                              {/* Hashtags */}
                              <div>
                                <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Hashtags</label>
                                <input
                                  type="text"
                                  value={scheduleForm.hashtags}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, hashtags: e.target.value }))}
                                  placeholder="#marketing, #socialmedia, #business"
                                  className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
                                />
                                <p className={`text-[10px] mt-1 ${theme.textMuted}`}>Separate hashtags with commas</p>
                              </div>

                              {/* Call to Action */}
                              <div>
                                <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Call to Action</label>
                                <select
                                  value={scheduleForm.callToAction}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, callToAction: e.target.value }))}
                                  className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                >
                                  <option value="">None</option>
                                  <option value="learn_more">Learn More</option>
                                  <option value="shop_now">Shop Now</option>
                                  <option value="sign_up">Sign Up</option>
                                  <option value="contact_us">Contact Us</option>
                                  <option value="book_now">Book Now</option>
                                  <option value="download">Download</option>
                                  <option value="get_quote">Get Quote</option>
                                  <option value="watch_more">Watch More</option>
                                </select>
                              </div>

                              {/* Budget & Target Audience Row */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Budget (USD)</label>
                                  <div className="relative mt-2">
                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`}>$</span>
                                    <input
                                      type="number"
                                      value={scheduleForm.budget}
                                      onChange={(e) => setScheduleForm(prev => ({ ...prev, budget: e.target.value }))}
                                      placeholder="0.00"
                                      className={`w-full pl-8 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Target Audience</label>
                                  <input
                                    type="text"
                                    value={scheduleForm.targetAudience}
                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                                    placeholder="e.g., 18-35, Females"
                                    className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
                                  />
                                </div>
                              </div>

                              {/* Additional Notes */}
                              <div>
                                <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Internal Notes</label>
                                <textarea
                                  value={scheduleForm.notes}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                                  placeholder="Any internal notes or reminders for this campaign..."
                                  rows={2}
                                  className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] resize-none ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
                                />
                              </div>
                            </>
                          )}
                          
                          {/* Reminder offset */}
                          {scheduleForm.type === 'reminder' && (
                            <div>
                              <label className={`text-xs font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Remind me</label>
                              <select
                                value={scheduleForm.reminderOffset}
                                onChange={(e) => setScheduleForm(prev => ({ ...prev, reminderOffset: parseInt(e.target.value) }))}
                                className={`w-full mt-2 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                              >
                                <option value={5}>5 minutes before</option>
                                <option value={15}>15 minutes before</option>
                                <option value={30}>30 minutes before</option>
                                <option value={60}>1 hour before</option>
                                <option value={1440}>1 day before</option>
                              </select>
                            </div>
                          )}
                        </div>
                        
                        {/* Footer with actions */}
                        <div className={`sticky bottom-0 ${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-white border-slate-200'} border-t px-6 py-4`}>
                            <div className="flex gap-3">
                                <button 
                                  onClick={isEditMode ? handleUpdateCampaign : handleCreateEvent}
                                  disabled={!scheduleForm.title.trim() || loading}
                                  className="flex-1 py-3 bg-[#ffcc29] hover:bg-[#e6b825] disabled:bg-slate-300 disabled:cursor-not-allowed text-[#070A12] text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {isEditMode ? 'Update Campaign' : (scheduleForm.type === 'reminder' ? 'Set Reminder' : 'Schedule Campaign')}
                                </button>
                                <button 
                                  onClick={() => { setShowScheduleModal(false); setIsEditMode(false); setEditingCampaign(null); }} 
                                  className={`px-5 py-3 border ${isDarkMode ? 'border-[#ffcc29]/20 text-slate-400 hover:bg-[#161b22]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} text-sm font-semibold rounded-xl transition-colors`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Event Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                    selectedEvent.status === 'active' || selectedEvent.status === 'posted' ? 'bg-green-100 text-green-700' :
                                    selectedEvent.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                                    'bg-[#ffcc29]/20 text-[#0a0f1a]'
                                }`}>
                                    {selectedEvent.status}
                                </span>
                                <h3 className="text-lg font-bold text-[#070A12] mt-2">{selectedEvent.name}</h3>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <Plus className="w-5 h-5 text-slate-400 rotate-45" />
                            </button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3 text-slate-600">
                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                <span>{selectedEvent.scheduling?.startDate ? new Date(selectedEvent.scheduling.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>{selectedEvent.scheduling?.postTime || 'No time set'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Activity className="w-4 h-4 text-slate-400" />
                                <span className="capitalize">{selectedEvent.platforms?.join(', ') || 'No platform'}</span>
                            </div>
                            
                            {/* Real Performance Data */}
                            {selectedEvent.performance && (selectedEvent.performance.impressions > 0 || selectedEvent.performance.clicks > 0) && (
                              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Performance</p>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                  <div>
                                    <p className="text-lg font-bold text-[#0a0f1a]">{(selectedEvent.performance.impressions || 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400">Impressions</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-[#0a0f1a]">{(selectedEvent.performance.clicks || 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400">Clicks</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-[#0a0f1a]">{selectedEvent.performance.ctr || 0}%</p>
                                    <p className="text-[10px] text-slate-400">CTR</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Description if available */}
                            {selectedEvent.creative?.textContent && (
                              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</p>
                                <p className="text-sm text-slate-600">{selectedEvent.creative.textContent}</p>
                              </div>
                            )}
                        </div>
                        
                        {/* Delete Confirmation */}
                        {showDeleteConfirm ? (
                          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800 font-medium mb-3">Are you sure you want to delete this campaign? This action cannot be undone.</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={handleDeleteCampaign}
                                disabled={deleteLoading}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Yes, Delete
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm(false)} 
                                className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 mt-6">
                            <button 
                              onClick={() => handleEditCampaign(selectedEvent)}
                              className="flex-1 py-2 bg-[#ffcc29] hover:bg-[#e6b825] text-[#0a0f1a] text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </button>
                            <button 
                              onClick={() => setShowDeleteConfirm(true)}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 border border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                            <button onClick={() => { setSelectedEvent(null); setShowDeleteConfirm(false); }} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                              Close
                            </button>
                          </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;