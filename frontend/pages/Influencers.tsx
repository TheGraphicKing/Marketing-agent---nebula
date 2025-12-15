import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Influencer } from '../types';
import { Search, Loader2, Star } from 'lucide-react';

const Influencers: React.FC = () => {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInfluencers = async () => {
      try {
        const res = await apiService.getInfluencers();
        setInfluencers(res.influencers || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadInfluencers();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Influencer Discovery</h1>
        <p className="text-slate-500">AI-vetted partnerships for maximum impact.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {influencers.map((inf) => (
              <div key={inf._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  {/* Purple Header */}
                  <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                  
                  <div className="px-6 pb-6 flex-1 flex flex-col">
                      <div className="relative mb-3">
                          <img 
                            src={inf.profileImage} 
                            alt={inf.name}
                            className="w-16 h-16 rounded-full border-4 border-white absolute -top-8 left-0 object-cover shadow-sm"
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
                        <p className="text-xs text-slate-400 capitalize">{inf.niche.join(' • ')}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-100 py-4 mb-4 text-center">
                         <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Followers</p>
                            <p className="text-sm font-bold text-slate-900">{(inf.followerCount / 1000).toFixed(inf.followerCount > 100000 ? 0 : 1)}K</p>
                         </div>
                         <div className="border-l border-r border-slate-100">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Reach</p>
                            <p className="text-sm font-bold text-slate-900">{(inf.reach / 1000).toFixed(inf.reach > 100000 ? 0 : 1)}K</p>
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
                                 inf.aiMatchScore.score >= 90 ? 'text-green-600' :
                                 inf.aiMatchScore.score >= 70 ? 'text-green-600' : 
                                 'text-orange-500'
                             }`}>{inf.aiMatchScore.score}/100</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mb-3">
                            <div 
                                className={`h-1.5 rounded-full ${
                                    inf.aiMatchScore.score >= 90 ? 'bg-green-500' :
                                    inf.aiMatchScore.score >= 70 ? 'bg-green-500' : 
                                    'bg-orange-400'
                                }`} 
                                style={{ width: `${inf.aiMatchScore.score}%` }} 
                            />
                        </div>
                        <p className="text-[11px] text-slate-500 italic mb-4 leading-relaxed">
                            "{inf.aiMatchScore.reason}"
                        </p>
                        <button className="w-full py-2 bg-white border border-slate-200 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors flex items-center justify-center gap-2">
                            <Star className="w-3 h-3" /> Re-Evaluate with AI
                        </button>
                      </div>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default Influencers;