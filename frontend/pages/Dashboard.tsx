import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { DashboardData, Campaign } from '../types';
import { TrendingUp, ArrowUpRight, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Info, Activity, Clock, MoreHorizontal, Plus } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
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

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-400 gap-2"><div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce"></div> Loading metrics...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Overview of your marketing performance.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 flex items-center gap-2 shadow-sm">
            Last 7 Days
            <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Campaigns Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 font-medium text-sm">Active Campaigns</span>
                <div className="p-1.5 bg-slate-50 rounded-md">
                    <Activity className="w-4 h-4 text-indigo-600" />
                </div>
            </div>
            <div className="text-4xl font-bold text-slate-900 mb-6">{data?.overview.activeCampaigns}</div>
            <div className="flex justify-between items-center">
                <span className="bg-green-100 text-green-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> {data?.overview.activeCampaignsChange}%
                </span>
                <span className="text-xs text-slate-400">vs last period</span>
            </div>
        </div>

        {/* Budget Spent Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 font-medium text-sm">Budget Spent</span>
                <div className="p-1.5 bg-slate-50 rounded-md">
                    <span className="text-indigo-600 font-bold text-sm">$</span>
                </div>
            </div>
            <div className="text-4xl font-bold text-slate-900 mb-2">${data?.overview.totalSpent.toLocaleString()}</div>
            <div className="h-12 w-full mt-4 opacity-50">
                <svg viewBox="0 0 100 25" className="w-full h-full text-indigo-500 fill-indigo-50 stroke-indigo-500 stroke-2">
                    <path d="M0 25 L0 20 Q 15 5, 30 15 T 60 10 T 100 15 L 100 25 Z" />
                </svg>
            </div>
        </div>

        {/* Brand Score Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg shadow-indigo-200 p-6 relative flex flex-col items-center justify-center text-center text-white">
             <span className="text-indigo-100 font-medium text-sm mb-4">AI Brand Score</span>
             <div className="relative">
                 <svg className="w-24 h-24 transform -rotate-90">
                     <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-500/30" />
                     <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={`${data?.overview.brandScore ? data.overview.brandScore * 2.51 : 0} 251`} className="text-white transition-all duration-1000 ease-out" />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
                     {data?.overview.brandScore}
                 </div>
             </div>
             <span className="mt-4 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                <ArrowUpRight className="w-3 h-3" /> {data?.overview.brandScoreChange}%
             </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competitor Radar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Competitor Radar</h2>
                    <Info className="w-4 h-4 text-slate-300" />
                </div>
                <button className="text-indigo-600 text-xs font-medium hover:underline">View All</button>
            </div>
            
            <div className="relative group">
                {/* Simulated Carousel arrows */}
                <button className="absolute -left-3 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-2">
                    {data?.competitorActivity.slice(0, 1).map(post => (
                        <div key={post.id} className="bg-slate-50 border border-slate-100 rounded-xl p-5 relative">
                            <div className="absolute top-4 right-4 text-slate-300">
                                <MoreHorizontal className="w-5 h-5" />
                            </div>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold text-slate-700 border border-slate-100">
                                        {post.competitorLogo || 'C'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{post.competitorName}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            {post.platform} • {post.postedAt}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-4 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 italic">
                                "{post.content}"
                            </p>
                            <div className="flex justify-between items-center">
                                <div className="flex gap-4 text-xs font-medium">
                                    <span className="text-slate-500">❤️ {post.likes.toLocaleString()}</span>
                                    <span className="text-slate-500">💬 {post.comments}</span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    post.sentiment === 'positive' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {post.sentiment} Analysis
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <button className="absolute -right-3 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Suggested Actions */}
        <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-white flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-base font-bold">Recommended Actions</h2>
                </div>
                <span className="text-xs bg-indigo-600 px-2 py-0.5 rounded font-bold">AI Generated</span>
            </div>

            <div className="space-y-3 flex-1">
                {data?.suggestedActions.map((action, idx) => (
                    <div key={action.id} className="flex items-center justify-between gap-4 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                            </span>
                            <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{action.title}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                    </div>
                ))}
                <button className="w-full mt-2 py-2.5 border border-dashed border-slate-700 rounded-lg text-slate-400 text-sm hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Generate More Ideas
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Interactive Calendar */}
         <div className="lg:col-span-3">
             <CalendarWidget campaigns={data?.recentCampaigns || []} />
         </div>
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleToday}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Today
                    </button>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={handlePrevWeek}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button 
                            onClick={handleNextWeek}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {formatDateRange()}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
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