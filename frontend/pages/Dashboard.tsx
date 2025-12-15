import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '../services/api';
import { DashboardData, Campaign, CompetitorPost } from '../types';
import { TrendingUp, ArrowUpRight, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Info, Activity, Clock, MoreHorizontal, Plus, X, ExternalLink, Edit3, Share2, MessageSquare } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBrandScoreInfo, setShowBrandScoreInfo] = useState(false);
  const [competitorIndex, setCompetitorIndex] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number } | null>(null);
  
  // Sample budget data points for the graph
  const budgetData = [120, 85, 150, 200, 180, 250, data?.overview.totalSpent || 500];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  useEffect(() => {
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
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <Activity className="w-4 h-4 text-indigo-500" />
                </div>
            </div>
            <div className="text-5xl font-bold text-slate-800 mb-8 tracking-tight">{data?.overview.activeCampaigns}</div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> {data?.overview.activeCampaignsChange}%
                </span>
                <span className="text-xs text-slate-300">vs last period</span>
            </div>
        </div>

        {/* Budget Spent Card - Interactive Graph */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-slate-200 transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
                <span className="text-slate-400 font-medium text-xs uppercase tracking-wider">Budget Spent</span>
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <span className="text-indigo-500 font-bold text-sm">$</span>
                </div>
            </div>
            <div className="text-5xl font-bold text-slate-800 mb-4 tracking-tight">${data?.overview.totalSpent.toLocaleString()}</div>
            
            {/* Interactive Graph */}
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
                  d={`M 0 55 ${budgetData.map((val, i) => `L ${i * 40 + 20} ${55 - (val / Math.max(...budgetData)) * 45}`).join(' ')} L 280 55 Z`}
                  fill="url(#budgetGradient)"
                />
                
                {/* Line */}
                <path
                  d={`M ${budgetData.map((val, i) => `${i * 40 + 20} ${55 - (val / Math.max(...budgetData)) * 45}`).join(' L ')}`}
                  fill="none"
                  stroke="rgb(99, 102, 241)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Interactive points */}
                {budgetData.map((val, i) => {
                  const x = i * 40 + 20;
                  const y = 55 - (val / Math.max(...budgetData)) * 45;
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
            
            {/* Day labels */}
            <div className="flex justify-between mt-1 px-2">
              {days.map((day, i) => (
                <span key={day} className="text-[10px] text-slate-300">{day}</span>
              ))}
            </div>
        </div>

        {/* Brand Score Card - With Info Button */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl shadow-xl shadow-indigo-200/50 p-6 relative flex flex-col items-center justify-center text-center text-white overflow-hidden">
             {/* Info Button - Top Right */}
             <button 
               onClick={() => setShowBrandScoreInfo(true)}
               className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
               title="What is Brand Score?"
             >
               <Info className="w-4 h-4 text-white/80" />
             </button>
             
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
            </p>
            
            <div className="space-y-3 mb-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">How it's calculated:</h4>
              <div className="space-y-2">
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
              </div>
            </div>
            
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
                    <Info className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <button className="text-indigo-600 text-xs font-medium hover:underline">View All</button>
            </div>
            
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
                            <div className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 cursor-pointer transition-colors">
                                <MoreHorizontal className="w-5 h-5" />
                            </div>
                            <div className="flex justify-between items-start mb-3">
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
                                    <span className="text-slate-500">❤️ {currentCompetitor.likes?.toLocaleString()}</span>
                                    <span className="text-slate-500">💬 {currentCompetitor.comments}</span>
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
        </div>

        {/* Suggested Actions - With Action Buttons */}
        <div className="bg-slate-900 rounded-2xl shadow-xl p-6 text-white flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-sm font-semibold">Recommended Actions</h2>
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
         <CalendarWidget campaigns={data?.recentCampaigns || []} />
      </div>
    </div>
  );
};

const CalendarWidget: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<Campaign | null>(null);

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

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const handleToday = () => setCurrentDate(new Date());

    const getCampaignsForDay = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return campaigns.filter(c => c.scheduling.startDate === dateStr);
    };

    const formatDateRange = () => {
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
                    <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg font-medium">
                        Week View
                    </span>
                </div>
            </div>

            {/* Calendar Grid */}
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
                            const dayCampaigns = getCampaignsForDay(day);
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
                                            className="h-12 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                        />
                                    ))}
                                    
                                    {/* Campaign Events */}
                                    {dayCampaigns.map((campaign, idx) => {
                                        const startHour = parseTime(campaign.scheduling.postTime);
                                        const topOffset = (startHour - 6) * 48; // 48px per hour slot
                                        
                                        const colors = {
                                            'active': 'bg-green-500 border-green-600',
                                            'posted': 'bg-green-500 border-green-600',
                                            'scheduled': 'bg-indigo-500 border-indigo-600',
                                            'draft': 'bg-amber-500 border-amber-600',
                                            'paused': 'bg-slate-400 border-slate-500'
                                        };
                                        
                                        return (
                                            <div
                                                key={campaign._id}
                                                onClick={() => setSelectedEvent(campaign)}
                                                className={`absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity shadow-sm border-l-4 ${colors[campaign.status as keyof typeof colors] || 'bg-indigo-500 border-indigo-600'}`}
                                                style={{ 
                                                    top: `${topOffset}px`,
                                                    height: '44px'
                                                }}
                                            >
                                                <p className="text-white text-xs font-semibold truncate">{campaign.name}</p>
                                                <p className="text-white/80 text-[10px] truncate">{campaign.scheduling.postTime} • {campaign.platforms[0]}</p>
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
                                <span>{new Date(selectedEvent.scheduling.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>{selectedEvent.scheduling.postTime}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Activity className="w-4 h-4 text-slate-400" />
                                <span className="capitalize">{selectedEvent.platforms.join(', ')}</span>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                Edit Campaign
                            </button>
                            <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;