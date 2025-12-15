import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Influencer } from '../types';
import { Search, Loader2, Star, Filter, RefreshCw, Instagram, Youtube, Twitter } from 'lucide-react';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  youtube: <Youtube className="w-4 h-4 text-red-500" />,
  twitter: <Twitter className="w-4 h-4 text-blue-400" />,
  tiktok: <span className="text-sm font-bold text-slate-800">TT</span>,
  linkedin: <span className="text-sm font-bold text-blue-600">in</span>,
};

const Influencers: React.FC = () => {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string>('all');
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);

  const loadInfluencers = async () => {
    setLoading(true);
    try {
      const res = await apiService.getInfluencers();
      if (res.influencers && res.influencers.length > 0) {
        setInfluencers(res.influencers);
      } else {
        // Auto-seed sample data if no influencers exist
        await apiService.seedInfluencerSamples();
        const newRes = await apiService.getInfluencers();
        setInfluencers(newRes.influencers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfluencers();
  }, []);

  const handleRecalculate = async (id: string) => {
    setRecalculatingId(id);
    try {
      const res = await apiService.recalculateInfluencerScore(id);
      if (res.influencer) {
        setInfluencers(prev => prev.map(inf => 
          inf._id === id ? res.influencer : inf
        ));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecalculatingId(null);
    }
  };

  // Get all unique niches for filter
  const allNiches = Array.from(new Set(influencers.flatMap(inf => inf.niche || [])));

  const filteredInfluencers = influencers.filter(inf => {
    const matchesSearch = 
      inf.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.handle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.niche?.some(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesNiche = selectedNiche === 'all' || inf.niche?.includes(selectedNiche);
    
    return matchesSearch && matchesNiche;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Influencer Discovery</h1>
          <p className="text-slate-500">AI-vetted partnerships for maximum impact.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search influencers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 w-64"
            />
          </div>
          <select
            value={selectedNiche}
            onChange={(e) => setSelectedNiche(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
          >
            <option value="all">All Niches</option>
            {allNiches.map(niche => (
              <option key={niche} value={niche}>{niche}</option>
            ))}
          </select>
          <button 
            onClick={loadInfluencers}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {filteredInfluencers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 mb-4">No influencers found.</p>
          <button 
            onClick={loadInfluencers}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Load Sample Data
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredInfluencers.map((inf) => (
                <div key={inf._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    {/* Purple Header with Platform Icon */}
                    <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500 relative">
                      <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full p-2">
                        {platformIcons[inf.platform] || inf.platform}
                      </div>
                    </div>
                    
                    <div className="px-6 pb-6 flex-1 flex flex-col">
                        <div className="relative mb-3">
                            <img 
                              src={inf.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.name)}&background=6366f1&color=fff`} 
                              alt={inf.name}
                              className="w-16 h-16 rounded-full border-4 border-white absolute -top-8 left-0 object-cover shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.name)}&background=6366f1&color=fff`;
                              }}
                            />
                        </div>
                        
                        <div className="mt-10 mb-6">
                          <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-900 text-lg">{inf.name}</h3>
                              <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide">
                                  {inf.type}
                              </span>
                          </div>
                          <p className="text-indigo-600 font-medium text-sm mb-1">{inf.handle}</p>
                          <p className="text-xs text-slate-400 capitalize">{(inf.niche || []).join(' • ')}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-100 py-4 mb-4 text-center">
                           <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Followers</p>
                              <p className="text-sm font-bold text-slate-900">
                                {inf.followerCount >= 1000000 
                                  ? (inf.followerCount / 1000000).toFixed(1) + 'M'
                                  : (inf.followerCount / 1000).toFixed(inf.followerCount > 100000 ? 0 : 1) + 'K'
                                }
                              </p>
                           </div>
                           <div className="border-l border-r border-slate-100">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Reach</p>
                              <p className="text-sm font-bold text-slate-900">
                                {inf.reach >= 1000000 
                                  ? (inf.reach / 1000000).toFixed(1) + 'M'
                                  : (inf.reach / 1000).toFixed(inf.reach > 100000 ? 0 : 1) + 'K'
                                }
                              </p>
                           </div>
                           <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Engage.</p>
                              <p className="text-sm font-bold text-slate-900">{inf.engagementRate}%</p>
                           </div>
                        </div>

                        <div className="mt-auto">
                          <div className="flex justify-between items-center mb-2">
                               <span className="text-xs font-bold text-slate-700">Nebulaa Match Score</span>
                               <span className={`text-xs font-bold ${
                                   (inf.aiMatchScore?.score || 0) >= 90 ? 'text-green-600' :
                                   (inf.aiMatchScore?.score || 0) >= 70 ? 'text-green-600' : 
                                   'text-orange-500'
                               }`}>{inf.aiMatchScore?.score || 0}/100</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full mb-3">
                              <div 
                                  className={`h-1.5 rounded-full transition-all ${
                                      (inf.aiMatchScore?.score || 0) >= 90 ? 'bg-green-500' :
                                      (inf.aiMatchScore?.score || 0) >= 70 ? 'bg-green-500' : 
                                      'bg-orange-400'
                                  }`} 
                                  style={{ width: `${inf.aiMatchScore?.score || 0}%` }} 
                              />
                          </div>
                          <p className="text-[11px] text-slate-500 italic mb-4 leading-relaxed min-h-[36px]">
                              "{inf.aiMatchScore?.reason || 'Calculating match score...'}"
                          </p>
                          <button 
                            onClick={() => handleRecalculate(inf._id)}
                            disabled={recalculatingId === inf._id}
                            className="w-full py-2 bg-white border border-slate-200 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                              {recalculatingId === inf._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Star className="w-3 h-3" />
                              )}
                              Re-Evaluate with AI
                          </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Influencers;