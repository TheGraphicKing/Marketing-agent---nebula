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
    const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const getCampaignsForDay = (dateStr: string) => {
        return campaigns.filter(c => c.scheduling.startDate === dateStr);
    };

    const selectedDayCampaigns = selectedDate ? getCampaignsForDay(selectedDate) : [];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row overflow-hidden min-h-[500px]">
            {/* Calendar Grid Section */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors">Today</button>
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 border-r border-slate-200"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                            <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {/* Padding Days */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`pad-${i}`} className="min-h-[80px] bg-slate-50/50 rounded-lg" />
                    ))}

                    {/* Actual Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayCampaigns = getCampaignsForDay(dateStr);
                        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                        const isSelected = selectedDate === dateStr;

                        return (
                            <div 
                                key={day} 
                                onClick={() => setSelectedDate(dateStr)}
                                className={`min-h-[80px] p-2 rounded-lg transition-all cursor-pointer relative border ${
                                    isSelected 
                                    ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100 z-10' 
                                    : 'bg-white border-slate-100 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                        isToday 
                                        ? 'bg-indigo-600 text-white' 
                                        : isSelected ? 'text-indigo-700' : 'text-slate-500'
                                    }`}>
                                        {day}
                                    </span>
                                    {dayCampaigns.length > 0 && (
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 space-y-1">
                                    {dayCampaigns.slice(0, 2).map(c => (
                                        <div key={c._id} className={`h-1.5 rounded-full w-full ${
                                            c.status === 'active' || c.status === 'posted' ? 'bg-green-400' :
                                            c.status === 'draft' ? 'bg-amber-400' : 'bg-indigo-400'
                                        }`} />
                                    ))}
                                    {dayCampaigns.length > 2 && (
                                        <div className="text-[9px] text-slate-400 text-center font-medium">+{dayCampaigns.length - 2} more</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Details Panel */}
            <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col">
                <h3 className="text-base font-bold text-slate-900 mb-1">
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
                </h3>
                <p className="text-xs text-slate-500 mb-6 font-medium uppercase tracking-wide">
                    {selectedDayCampaigns.length} Events Scheduled
                </p>

                <div className="space-y-4 flex-1 overflow-y-auto">
                    {selectedDayCampaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center border-2 border-dashed border-slate-200 rounded-xl">
                            <Clock className="w-6 h-6 text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500 font-medium">No campaigns</p>
                            <button className="mt-2 text-xs text-indigo-600 font-bold hover:underline">
                                + Schedule one
                            </button>
                        </div>
                    ) : (
                        selectedDayCampaigns.map(c => (
                            <div key={c._id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors group cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                         c.status === 'active' || c.status === 'posted' ? 'bg-green-100 text-green-700' :
                                         c.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                                         'bg-indigo-100 text-indigo-700'
                                    }`}>
                                        {c.status}
                                    </span>
                                    <Clock className="w-3 h-3 text-slate-300" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{c.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="capitalize">{c.platforms[0]}</span>
                                    <span>•</span>
                                    <span>{c.scheduling.postTime}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Event
                </button>
            </div>
        </div>
    );
};

export default Dashboard;