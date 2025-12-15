import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { CompetitorPost } from '../types';
import { Loader2, Search, RotateCw, ExternalLink, Heart, MessageCircle, Plus, Instagram, Twitter, Linkedin, Facebook, Youtube } from 'lucide-react';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  twitter: <Twitter className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
  facebook: <Facebook className="w-3 h-3" />,
  youtube: <Youtube className="w-3 h-3" />,
  tiktok: <span className="text-[10px] font-bold">TT</span>,
};

const Competitors: React.FC = () => {
  const [posts, setPosts] = useState<CompetitorPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Last 7 days');

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await apiService.getCompetitors();
      if (res.posts && res.posts.length > 0) {
        setPosts(res.posts);
      } else {
        // Auto-seed sample data if no posts exist
        await apiService.seedCompetitorSamples();
        const newRes = await apiService.getCompetitors();
        setPosts(newRes.posts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = posts.filter(post =>
    post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.competitorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    await loadPosts();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Competitor Analysis</h1>
          <p className="text-slate-500">Track market rivals with real-time AI search.</p>
        </div>
        <div className="flex gap-2">
            {['Last 7 days', 'Last 1 month', 'Last 3 months'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setSelectedFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border ${f === selectedFilter ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    {f}
                </button>
            ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 mb-8">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">Competitor Activity Feed</h2>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                      type="text" 
                      placeholder="Filter by keyword..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                  />
                  <RotateCw 
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-indigo-600 ${loading ? 'animate-spin' : ''}`}
                    onClick={handleRefresh}
                  />
                </div>
              </div>
          </div>

          {loading ? (
             <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
             </div>
          ) : filteredPosts.length === 0 ? (
             <div className="text-center py-12">
                <p className="text-slate-500 mb-4">No competitor posts found.</p>
                <button 
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Load Sample Data
                </button>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map(post => (
                    <div key={post.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                    post.competitorName?.includes('Tech') ? 'bg-blue-100 text-blue-700' :
                                    post.competitorName?.includes('Market') ? 'bg-green-100 text-green-700' :
                                    post.competitorName?.includes('Growth') ? 'bg-purple-100 text-purple-700' :
                                    'bg-indigo-100 text-indigo-700'
                                }`}>
                                    {post.competitorLogo || post.competitorName?.charAt(0) || 'C'}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">{post.competitorName}</h3>
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                      {platformIcons[post.platform] || post.platform} • {post.postedAt}
                                    </p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                post.sentiment === 'positive' ? 'bg-green-50 text-green-600' :
                                post.sentiment === 'negative' ? 'bg-red-50 text-red-600' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                                {post.sentiment}
                            </span>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-6 min-h-[60px]">
                            {post.content}
                        </p>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                    <Heart className="w-3 h-3 text-red-400 fill-red-400" /> {(post.likes || 0).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                    <MessageCircle className="w-3 h-3 text-slate-400" /> {post.comments || 0}
                                </span>
                            </div>
                            {post.postUrl ? (
                              <a 
                                href={post.postUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                              >
                                  View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                                  {post.platform}
                              </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default Competitors;