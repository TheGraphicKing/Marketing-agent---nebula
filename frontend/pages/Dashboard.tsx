import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '../services/api';
import { DashboardData, Campaign, CompetitorPost } from '../types';
import { TrendingUp, ArrowUpRight, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Info, Activity, Clock, MoreHorizontal, Plus, X, ExternalLink, Edit3, Share2, MessageSquare, FileText, Loader2, Bell, BellRing, Check, AlertCircle, Trash2 } from 'lucide-react';

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
      {/* Info Button with Hover Tooltip */}
      <div 
        className="relative"
        ref={infoRef}
        onMouseEnter={() => setIsHoveringInfo(true)}
        onMouseLeave={() => setIsHoveringInfo(false)}
      >
        <button
          className={`group relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold shadow-sm ${
            isDark 
              ? 'bg-gradient-to-br from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white border border-white/20 hover:border-white/40 hover:scale-110' 
              : 'bg-gradient-to-br from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 text-indigo-600 border border-indigo-200/50 hover:border-indigo-300 hover:scale-110 hover:shadow-md'
          }`}
        >
          <span className="relative z-10">i</span>
          <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isDark ? 'bg-white/10' : 'bg-indigo-400/10'} opacity-0 group-hover:opacity-100`}></div>
        </button>
        
        {/* Info Hover Tooltip */}
        {isHoveringInfo && (
          <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-72 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 relative">
              {/* Arrow */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-slate-200 rotate-45"></div>
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">{info?.title}</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {info?.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Synopsis Button with Hover Tooltip */}
      <div 
        className="relative"
        ref={dRef}
        onMouseEnter={handleSynopsisHover}
        onMouseLeave={() => setIsHoveringD(false)}
      >
        <button
          className={`group relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold shadow-sm ${
            isDark 
              ? 'bg-gradient-to-br from-purple-400/30 to-pink-400/20 hover:from-purple-400/40 hover:to-pink-400/30 text-white border border-purple-300/30 hover:border-purple-300/50 hover:scale-110' 
              : 'bg-gradient-to-br from-purple-50 to-pink-100 hover:from-purple-100 hover:to-pink-200 text-purple-600 border border-purple-200/50 hover:border-purple-300 hover:scale-110 hover:shadow-md'
          }`}
        >
          <span className="relative z-10">d</span>
          <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isDark ? 'bg-purple-400/10' : 'bg-purple-400/10'} opacity-0 group-hover:opacity-100`}></div>
          {loadingSynopsis && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-400 animate-spin"></div>
          )}
        </button>
        
        {/* Synopsis Hover Tooltip */}
        {isHoveringD && (
          <div className="absolute z-50 top-full right-0 mt-2 w-80 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 relative">
              {/* Arrow */}
              <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-slate-200 rotate-45"></div>
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">AI Synopsis</h4>
                    <p className="text-[10px] text-slate-400">{info?.title}</p>
                  </div>
                </div>
                
                {loadingSynopsis ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                    <p className="text-xs text-slate-500">AI is analyzing...</p>
                  </div>
                ) : synopsis ? (
                  <>
                    {/* Trend Badge */}
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold mb-2 ${
                      synopsis.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                      synopsis.trend === 'down' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {synopsis.trend === 'up' ? '↑ Trending Up' : synopsis.trend === 'down' ? '↓ Trending Down' : '→ Stable'}
                    </div>
                    
                    {/* Synopsis */}
                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-4">
                      {synopsis.synopsis}
                    </p>
                    
                    {/* Quick Insights */}
                    {synopsis.insights && synopsis.insights.length > 0 && (
                      <div className="border-t border-slate-100 pt-2">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Top Insight</p>
                        <p className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-purple-500">💡</span>
                          <span className="line-clamp-2">{synopsis.insights[0]}</span>
                        </p>
                      </div>
                    )}
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBrandScoreInfo, setShowBrandScoreInfo] = useState(false);
  const [competitorIndex, setCompetitorIndex] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number } | null>(null);
  
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
    const actionMap: Record<string, { label: string; icon: React.ReactNode; onClick: () => void }> = {
      'post': { label: 'Create Post', icon: <Edit3 className="w-3 h-3" />, onClick: () => window.open('/campaigns?action=create', '_self') },
      'story': { label: 'Post Story', icon: <Share2 className="w-3 h-3" />, onClick: () => window.open('/campaigns?action=story', '_self') },
      'review': { label: 'View Ads', icon: <ExternalLink className="w-3 h-3" />, onClick: () => window.open('/competitors', '_self') },
      'engage': { label: 'Engage', icon: <MessageSquare className="w-3 h-3" />, onClick: () => window.open('/campaigns', '_self') },
    };
    
    // Determine action type from title
    let type = 'post';
    if (title.toLowerCase().includes('story')) type = 'story';
    else if (title.toLowerCase().includes('review') || title.toLowerCase().includes('competitor') || title.toLowerCase().includes('ads')) type = 'review';
    else if (title.toLowerCase().includes('engage') || title.toLowerCase().includes('comment')) type = 'engage';
    
    return actionMap[type] || actionMap['post'];
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-400 gap-2"><div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce"></div> Loading metrics...</div>;
  }

  const currentCompetitor = data?.competitorActivity?.[competitorIndex];
  const prevCompetitor = data?.competitorActivity?.[(competitorIndex === 0 ? (data.competitorActivity.length - 1) : competitorIndex - 1)];
  const nextCompetitor = data?.competitorActivity?.[(competitorIndex === (data?.competitorActivity?.length || 1) - 1 ? 0 : competitorIndex + 1)];

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-1">
      {/* Header - More minimal */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Overview of your marketing performance.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 flex items-center gap-2 shadow-sm hover:border-slate-300 transition-colors cursor-pointer">
            Last 7 Days
            <ChevronRight className="w-4 h-4 rotate-90 text-slate-400" />
        </div>
      </div>

      {/* Stats Grid - More refined spacing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Active Campaigns Card - Cleaner */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-slate-200 transition-all duration-200">
            <div className="flex justify-between items-start mb-6">
                <span className="text-slate-400 font-medium text-xs uppercase tracking-wider">Active Campaigns</span>
                <div className="flex items-center gap-2">
                    <SectionButtons 
                      sectionType="activeCampaigns" 
                      sectionData={{ count: data?.overview.activeCampaigns, change: data?.overview.activeCampaignsChange }} 
                    />
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <Activity className="w-4 h-4 text-indigo-500" />
                    </div>
                </div>
            </div>
            <div className="text-5xl font-bold text-slate-800 mb-8 tracking-tight">
              {hasCampaigns ? data?.overview.activeCampaigns : (
                <span className="text-2xl text-slate-300">No campaigns yet</span>
              )}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                {hasCampaigns ? (
                  <>
                    <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> {data?.overview.activeCampaignsChange || 0}%
                    </span>
                    <span className="text-xs text-slate-300">vs last period</span>
                  </>
                ) : (
                  <button 
                    onClick={() => window.open('/campaigns', '_self')}
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    Create your first campaign →
                  </button>
                )}
            </div>
        </div>

        {/* Budget Spent Card - Interactive Graph */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-slate-200 transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
                <span className="text-slate-400 font-medium text-xs uppercase tracking-wider">Budget Spent</span>
                <div className="flex items-center gap-2">
                    <SectionButtons 
                      sectionType="budgetSpent" 
                      sectionData={{ total: data?.overview.totalSpent, dailyData: budgetData }} 
                    />
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <span className="text-indigo-500 font-bold text-sm">$</span>
                    </div>
                </div>
            </div>
            <div className="text-5xl font-bold text-slate-800 mb-4 tracking-tight">
              {hasSpend ? `$${(data?.overview.totalSpent || 0).toLocaleString()}` : (
                <span className="text-2xl text-slate-300">$0</span>
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
                    className="absolute bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
                    style={{ left: `${(hoveredPoint.x / 280) * 100}%`, top: `${(hoveredPoint.y / 60) * 100 - 10}%` }}
                  >
                    ${hoveredPoint.value.toLocaleString()}
                    <div className="absolute left-1/2 -bottom-1 transform -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-16 mt-4 flex items-center justify-center">
                <p className="text-xs text-slate-400">No spend data yet</p>
              </div>
            )}
            
            {/* Day labels */}
            <div className="flex justify-between mt-1 px-2">
              {days.map((day: string, i: number) => (
                <span key={i} className="text-[10px] text-slate-300">{day}</span>
              ))}
            </div>
        </div>

        {/* Brand Score Card - With Info Button */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl shadow-xl shadow-indigo-200/50 p-6 relative flex flex-col items-center justify-center text-center text-white overflow-hidden">
             {/* Info and Synopsis Buttons - Top Right */}
             <div className="absolute top-4 right-4 flex items-center gap-1.5">
               <SectionButtons 
                 sectionType="brandScore" 
                 sectionData={{ score: data?.overview.brandScore, change: data?.overview.brandScoreChange, factors: data?.brandScoreFactors }} 
                 variant="dark"
               />
               <button 
                 onClick={() => setShowBrandScoreInfo(true)}
                 className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
                 title="Score Breakdown"
               >
                 <Info className="w-4 h-4 text-white/80" />
               </button>
             </div>
             
             <span className="text-indigo-200 font-medium text-xs uppercase tracking-wider mb-5">AI Brand Score</span>
             <div className="relative">
                 <svg className="w-28 h-28 transform -rotate-90">
                     <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
                     <circle 
                       cx="56" cy="56" r="48" 
                       stroke="currentColor" 
                       strokeWidth="6" 
                       fill="transparent" 
                       strokeDasharray={`${data?.overview.brandScore ? data.overview.brandScore * 3.01 : 0} 301`} 
                       strokeLinecap="round"
                       className="text-white transition-all duration-1000 ease-out" 
                     />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold tracking-tight">
                     {data?.overview.brandScore}
                 </div>
             </div>
             <span className="mt-5 bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                <ArrowUpRight className="w-3 h-3" /> {data?.overview.brandScoreChange}%
             </span>
             
             {/* Decorative elements */}
             <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full"></div>
             <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/5 rounded-full"></div>
        </div>
      </div>

      {/* Brand Score Info Modal */}
      {showBrandScoreInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowBrandScoreInfo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Info className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">What is Brand Score?</h3>
              </div>
              <button onClick={() => setShowBrandScoreInfo(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <p className="text-slate-600 text-sm leading-relaxed mb-5">
              Your <strong>AI Brand Score</strong> is a comprehensive metric (0-100) that measures your brand's overall marketing health and effectiveness across all connected platforms.
              {data?.businessContext?.industry && (
                <span className="block mt-2 text-indigo-600 font-medium">
                  Personalized for {data.businessContext.name || 'your'} {data.businessContext.industry} business.
                </span>
              )}
            </p>
            
            <div className="space-y-3 mb-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Score Breakdown:</h4>
              <div className="space-y-2">
                {data?.brandScoreFactors?.engagement && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {data.brandScoreFactors.engagement.score}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">Engagement Rate</p>
                      <p className="text-xs text-slate-400">{data.brandScoreFactors.engagement.reason}</p>
                    </div>
                  </div>
                )}
                {data?.brandScoreFactors?.consistency && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm">
                      {data.brandScoreFactors.consistency.score}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">Content Consistency</p>
                      <p className="text-xs text-slate-400">{data.brandScoreFactors.consistency.reason}</p>
                    </div>
                  </div>
                )}
                {data?.brandScoreFactors?.audienceGrowth && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-sm">
                      {data.brandScoreFactors.audienceGrowth.score}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">Audience Growth</p>
                      <p className="text-xs text-slate-400">{data.brandScoreFactors.audienceGrowth.reason}</p>
                    </div>
                  </div>
                )}
                {data?.brandScoreFactors?.contentQuality && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold text-sm">
                      {data.brandScoreFactors.contentQuality.score}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">Content Quality</p>
                      <p className="text-xs text-slate-400">{data.brandScoreFactors.contentQuality.reason}</p>
                    </div>
                  </div>
                )}
                {/* Fallback if no AI factors */}
                {!data?.brandScoreFactors && (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-sm">30%</div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Engagement Rate</p>
                        <p className="text-xs text-slate-400">Likes, comments, shares across platforms</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm">25%</div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Content Consistency</p>
                        <p className="text-xs text-slate-400">Posting frequency and schedule adherence</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-sm">25%</div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Audience Growth</p>
                        <p className="text-xs text-slate-400">Follower growth rate and reach expansion</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold text-sm">20%</div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Campaign Performance</p>
                        <p className="text-xs text-slate-400">ROI and conversion metrics</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Personalized Tips */}
            {data?.personalizedTips && data.personalizedTips.length > 0 && (
              <div className="mb-5 p-3 bg-indigo-50 rounded-xl">
                <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">💡 Tips for You</h4>
                <ul className="space-y-1">
                  {data.personalizedTips.slice(0, 2).map((tip, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-indigo-400">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button 
              onClick={() => setShowBrandScoreInfo(false)} 
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Competitor Radar - With Navigation Arrows */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-slate-200 transition-all duration-200">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-800">Competitor Radar</h2>
                    <SectionButtons 
                      sectionType="competitorRadar" 
                      sectionData={{ competitors: data?.competitorActivity, current: currentCompetitor }} 
                    />
                </div>
                <button 
                  onClick={() => window.open('/competitors', '_self')}
                  className="text-indigo-600 text-xs font-medium hover:underline"
                >
                  View All
                </button>
            </div>
            
            {(!data?.competitorActivity || data.competitorActivity.length === 0) ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">No competitor data yet</p>
                <p className="text-xs text-slate-400 mb-4">Add competitors to track their activity</p>
                <button 
                  onClick={() => window.open('/competitors', '_self')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Add Competitors
                </button>
              </div>
            ) : (
            <div className="relative">
                {/* Left Arrow with Preview */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                    <button 
                      onClick={handlePrevCompetitor}
                      className="p-2 bg-white border border-slate-200 rounded-full shadow-md text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    {prevCompetitor && (
                      <span className="mt-1.5 text-[9px] text-slate-400 max-w-[60px] text-center truncate">
                        {prevCompetitor.competitorName}
                      </span>
                    )}
                </div>
                
                <div className="px-8">
                    {currentCompetitor && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 relative">
                            {currentCompetitor.isAIGenerated && (
                              <span className="absolute top-2 left-2 text-[9px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                                AI Insight
                              </span>
                            )}
                            <div className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 cursor-pointer transition-colors">
                                <MoreHorizontal className="w-5 h-5" />
                            </div>
                            <div className="flex justify-between items-start mb-3 mt-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold text-slate-700 border border-slate-100">
                                        {currentCompetitor.competitorLogo || currentCompetitor.competitorName?.charAt(0) || 'C'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{currentCompetitor.competitorName}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            {currentCompetitor.platform} • {currentCompetitor.postedAt}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-4 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 italic">
                                "{currentCompetitor.content}"
                            </p>
                            <div className="flex justify-between items-center">
                                <div className="flex gap-4 text-xs font-medium">
                                    <span className="text-slate-500">❤️ {(currentCompetitor.likes || 0).toLocaleString()}</span>
                                    <span className="text-slate-500">💬 {currentCompetitor.comments || 0}</span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                                    currentCompetitor.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' : 
                                    currentCompetitor.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-200 text-slate-600'
                                }`}>
                                    {currentCompetitor.sentiment} Analysis
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Right Arrow with Preview */}
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                    <button 
                      onClick={handleNextCompetitor}
                      className="p-2 bg-white border border-slate-200 rounded-full shadow-md text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    {nextCompetitor && (
                      <span className="mt-1.5 text-[9px] text-slate-400 max-w-[60px] text-center truncate">
                        {nextCompetitor.competitorName}
                      </span>
                    )}
                </div>
                
                {/* Pagination dots */}
                {data?.competitorActivity && data.competitorActivity.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-4">
                    {data.competitorActivity.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCompetitorIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          idx === competitorIndex ? 'bg-indigo-600 w-4' : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
            </div>
            )}
        </div>

        {/* Suggested Actions - With Action Buttons */}
        <div className="bg-slate-900 rounded-2xl shadow-xl p-6 text-white flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-sm font-semibold">Recommended Actions</h2>
                    <SectionButtons 
                      sectionType="recommendedActions" 
                      sectionData={{ actions: data?.suggestedActions }} 
                      variant="dark"
                    />
                </div>
                <span className="text-[10px] bg-indigo-500 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide">AI Generated</span>
            </div>

            <div className="space-y-3 flex-1">
                {data?.suggestedActions.map((action, idx) => {
                    const actionBtn = getActionButton(action.type, action.title);
                    return (
                      <div key={action.id} className="flex items-center justify-between gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                              </span>
                              <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">{action.title}</p>
                          </div>
                          <button
                            onClick={actionBtn.onClick}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            {actionBtn.icon}
                            {actionBtn.label}
                          </button>
                      </div>
                    );
                })}
                <button className="w-full mt-2 py-3 border border-dashed border-slate-700 rounded-xl text-slate-400 text-sm hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Generate More Ideas
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
    
    // Schedule form state
    const [scheduleForm, setScheduleForm] = useState({
      title: '',
      type: 'reminder' as 'reminder' | 'campaign',
      description: '',
      reminderOffset: 30,
      platform: 'instagram'
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
        platform: 'instagram'
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
        
        if (scheduleForm.type === 'reminder') {
          await apiService.createReminder({
            title: scheduleForm.title,
            description: scheduleForm.description,
            scheduledFor: scheduledFor.toISOString(),
            reminderOffset: scheduleForm.reminderOffset,
            platform: scheduleForm.platform
          });
          
          // Refresh calendar events
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const { events } = await apiService.getCalendarEvents(year, month);
          setCalendarEvents(events || []);
        } else {
          // Create a campaign
          const result = await apiService.createCampaign({
            name: scheduleForm.title,
            objective: 'awareness',
            platforms: [scheduleForm.platform],
            status: 'scheduled',
            creative: { type: 'image', textContent: scheduleForm.description, imageUrls: [] },
            scheduling: {
              startDate: scheduledFor.toISOString().split('T')[0],
              postTime: `${String(selectedSlot.hour).padStart(2, '0')}:00`
            }
          });
          
          // Add the new campaign to local state immediately
          if (result.campaign) {
            setAllCampaigns(prev => [result.campaign, ...prev]);
          }
          
          // Also refresh from API to ensure sync
          await refreshCampaigns();
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
        platform: campaign.platforms?.[0] || 'instagram'
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
        const dateStr = date.toISOString().split('T')[0];
        
        // Get campaigns from local state (includes newly created ones)
        const dayCampaigns = allCampaigns.filter(c => {
          if (!c.scheduling?.startDate) return false;
          // Handle both string dates and Date objects
          const campaignDate = typeof c.scheduling.startDate === 'string' 
            ? c.scheduling.startDate.split('T')[0]
            : new Date(c.scheduling.startDate).toISOString().split('T')[0];
          return campaignDate === dateStr;
        });
        
        // Get calendar events from API (reminders)
        const dayEvents = calendarEvents.filter(e => {
          if (!e.scheduledFor) return false;
          const eventDate = new Date(e.scheduledFor).toISOString().split('T')[0];
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
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-slate-200 transition-all duration-200">
            {/* Reminder Toast Notification */}
            {showReminderToast && pendingReminders.length > 0 && (
              <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 max-w-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <BellRing className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800 text-sm">
                        {pendingReminders.length} Reminder{pendingReminders.length > 1 ? 's' : ''}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{pendingReminders[0]?.title}</p>
                      <div className="flex gap-2 mt-3">
                        <button 
                          onClick={() => handleDismissReminder(pendingReminders[0]?._id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                        >
                          Dismiss
                        </button>
                        <button 
                          onClick={() => handleSnoozeReminder(pendingReminders[0]?._id, 15)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Snooze 15m
                        </button>
                      </div>
                    </div>
                    <button onClick={() => setShowReminderToast(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleToday}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2"
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Today
                    </button>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={handlePrevWeek}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-500" />
                        </button>
                        <button 
                            onClick={handleNextWeek}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                    <h2 className="text-base font-semibold text-slate-800">
                        {formatDateRange()}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {pendingReminders.length > 0 && (
                      <button 
                        onClick={() => setShowReminderToast(true)}
                        className="relative p-2 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Bell className="w-5 h-5 text-amber-500" />
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {pendingReminders.length}
                        </span>
                      </button>
                    )}
                    {/* View Type Selector */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                      {(['day', 'week', 'month'] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => setViewType(view)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                            viewType === view
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {view}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg font-medium">
                        Click to schedule
                    </span>
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
                    <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-slate-500">
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
                      days.push(<div key={`pad-${i}`} className="h-24 bg-slate-50/50 rounded-lg"></div>);
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
                          className={`h-24 p-1.5 border border-slate-100 rounded-lg hover:bg-indigo-50/50 cursor-pointer transition-colors ${
                            today ? 'bg-indigo-50 border-indigo-200' : ''
                          }`}
                        >
                          <span className={`text-sm font-medium ${
                            today ? 'text-white bg-indigo-600 w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'
                          }`}>
                            {d}
                          </span>
                          <div className="mt-1 space-y-0.5 overflow-hidden max-h-14">
                            {dayEvents.slice(0, 3).map((event: any, idx) => (
                              <div 
                                key={event._id || idx} 
                                onClick={(e) => { e.stopPropagation(); if (event.eventType === 'campaign') setSelectedEvent(event); }}
                                className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                                  event.eventType === 'reminder' || event.type === 'reminder' 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {event.name || event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <span className="text-[10px] text-slate-400 pl-1">+{dayEvents.length - 3} more</span>
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
                <div className="flex-shrink-0 w-20 border-r border-slate-200 bg-slate-50">
                  {timeSlots.map(hour => (
                    <div key={hour} className="h-14 border-b border-slate-100 pr-3 flex items-start justify-end pt-0">
                      <span className="text-xs text-slate-400 -mt-2">
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
                        className="h-14 border-b border-slate-100 hover:bg-indigo-50 transition-colors cursor-pointer px-4 flex items-center gap-3"
                      >
                        {dayEvents.map((event: any, idx) => (
                          <div 
                            key={event._id || idx}
                            onClick={(e) => { e.stopPropagation(); if (event.eventType === 'campaign') setSelectedEvent(event); }}
                            className={`flex-1 py-2 px-3 rounded-lg cursor-pointer ${
                              event.eventType === 'reminder' || event.type === 'reminder' 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-indigo-500 text-white'
                            }`}
                          >
                            <p className="text-sm font-medium truncate">{event.name || event.title}</p>
                            <p className="text-xs text-white/80">{event.platforms?.join(', ') || event.platform || ''}</p>
                          </div>
                        ))}
                        {dayEvents.length === 0 && (
                          <span className="text-slate-300 text-sm opacity-0 hover:opacity-100 transition-opacity">+ Add event</span>
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
                <div className="flex-shrink-0 w-16 border-r border-slate-200 bg-slate-50">
                    <div className="h-16 border-b border-slate-200"></div>
                    {timeSlots.map(hour => (
                        <div key={hour} className="h-12 border-b border-slate-100 pr-2 flex items-start justify-end pt-0">
                            <span className="text-xs text-slate-400 -mt-2">
                                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="flex-1 overflow-y-auto">
                    {/* Day Headers */}
                    <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
                        {weekDays.map((day, idx) => {
                            const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = day.getDate();
                            const today = isToday(day);
                            
                            return (
                                <div 
                                    key={idx} 
                                    className={`flex-1 h-16 flex flex-col items-center justify-center border-r border-slate-100 last:border-r-0 ${
                                        today ? 'bg-indigo-50' : ''
                                    }`}
                                >
                                    <span className={`text-xs font-medium ${today ? 'text-indigo-600' : 'text-slate-500'}`}>
                                        {dayName}
                                    </span>
                                    <span className={`text-xl font-bold mt-0.5 ${
                                        today 
                                            ? 'text-white bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center' 
                                            : 'text-slate-900'
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
                                    className={`flex-1 border-r border-slate-100 last:border-r-0 relative ${
                                        today ? 'bg-indigo-50/30' : ''
                                    }`}
                                >
                                    {timeSlots.map(hour => (
                                        <div 
                                            key={hour} 
                                            onClick={() => handleSlotClick(day, hour)}
                                            className="h-12 border-b border-slate-100 hover:bg-indigo-50 transition-colors cursor-pointer group"
                                        >
                                            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Plus className="w-4 h-4 text-indigo-400" />
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
                                            'active': 'bg-green-500 border-green-600',
                                            'posted': 'bg-green-500 border-green-600',
                                            'scheduled': 'bg-indigo-500 border-indigo-600',
                                            'draft': 'bg-amber-500 border-amber-600',
                                            'paused': 'bg-slate-400 border-slate-500',
                                            'pending': 'bg-purple-500 border-purple-600',
                                            'reminder': 'bg-purple-500 border-purple-600'
                                        };
                                        
                                        const eventStatus = event.status || 'scheduled';
                                        const eventType = event.type || event.eventType || 'campaign';
                                        const colorClass = eventType === 'reminder' ? colors['reminder'] : (colors[eventStatus] || 'bg-indigo-500 border-indigo-600');
                                        
                                        return (
                                            <div
                                                key={event._id || event.id || idx}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (event.eventType === 'campaign' || event.type === 'campaign') {
                                                    setSelectedEvent(event);
                                                  }
                                                }}
                                                className={`absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity shadow-sm border-l-4 ${colorClass}`}
                                                style={{ 
                                                    top: `${topOffset}px`,
                                                    height: '44px'
                                                }}
                                            >
                                                <div className="flex items-center gap-1">
                                                  {eventType === 'reminder' && <Bell className="w-2.5 h-2.5 text-white/80" />}
                                                  <p className="text-white text-xs font-semibold truncate">{event.name || event.title}</p>
                                                </div>
                                                <p className="text-white/80 text-[10px] truncate">
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

            {/* Schedule Modal */}
            {showScheduleModal && selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowScheduleModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{isEditMode ? 'Edit Campaign' : 'Schedule Event'}</h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                  {selectedSlot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedSlot.hour}:00
                                </p>
                            </div>
                            <button onClick={() => { setShowScheduleModal(false); setIsEditMode(false); setEditingCampaign(null); }} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Event Type - hide in edit mode */}
                          {!isEditMode && (
                          <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Event Type</label>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => setScheduleForm(prev => ({ ...prev, type: 'reminder' }))}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  scheduleForm.type === 'reminder' 
                                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' 
                                    : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                                }`}
                              >
                                <Bell className="w-4 h-4" /> Reminder
                              </button>
                              <button
                                onClick={() => setScheduleForm(prev => ({ ...prev, type: 'campaign' }))}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  scheduleForm.type === 'campaign' 
                                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' 
                                    : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                                }`}
                              >
                                <Activity className="w-4 h-4" /> Campaign
                              </button>
                            </div>
                          </div>
                          )}
                          
                          {/* Title */}
                          <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Title</label>
                            <input
                              type="text"
                              value={scheduleForm.title}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder={scheduleForm.type === 'reminder' ? 'Reminder title...' : 'Campaign name...'}
                              className="w-full mt-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                            />
                          </div>
                          
                          {/* Description */}
                          <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</label>
                            <textarea
                              value={scheduleForm.description}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Add details..."
                              rows={2}
                              className="w-full mt-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 resize-none"
                            />
                          </div>
                          
                          {/* Platform (for campaigns) */}
                          {scheduleForm.type === 'campaign' && (
                            <div>
                              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Platform</label>
                              <select
                                value={scheduleForm.platform}
                                onChange={(e) => setScheduleForm(prev => ({ ...prev, platform: e.target.value }))}
                                className="w-full mt-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                              >
                                <option value="instagram">Instagram</option>
                                <option value="facebook">Facebook</option>
                                <option value="twitter">Twitter</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="tiktok">TikTok</option>
                              </select>
                            </div>
                          )}
                          
                          {/* Reminder offset */}
                          {scheduleForm.type === 'reminder' && (
                            <div>
                              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Remind me</label>
                              <select
                                value={scheduleForm.reminderOffset}
                                onChange={(e) => setScheduleForm(prev => ({ ...prev, reminderOffset: parseInt(e.target.value) }))}
                                className="w-full mt-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
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
                        
                        <div className="flex gap-3 mt-6">
                            <button 
                              onClick={isEditMode ? handleUpdateCampaign : handleCreateEvent}
                              disabled={!scheduleForm.title.trim() || loading}
                              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {isEditMode ? 'Update Campaign' : (scheduleForm.type === 'reminder' ? 'Set Reminder' : 'Create Campaign')}
                            </button>
                            <button onClick={() => { setShowScheduleModal(false); setIsEditMode(false); setEditingCampaign(null); }} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
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
                                    'bg-indigo-100 text-indigo-700'
                                }`}>
                                    {selectedEvent.status}
                                </span>
                                <h3 className="text-lg font-bold text-slate-900 mt-2">{selectedEvent.name}</h3>
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
                                    <p className="text-lg font-bold text-slate-800">{(selectedEvent.performance.impressions || 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400">Impressions</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-slate-800">{(selectedEvent.performance.clicks || 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400">Clicks</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-slate-800">{selectedEvent.performance.ctr || 0}%</p>
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
                              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
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