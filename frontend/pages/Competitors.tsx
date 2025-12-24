import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { CompetitorPost } from '../types';
import { Loader2, Search, RotateCw, ExternalLink, Heart, MessageCircle, Plus, Instagram, Twitter, Linkedin, Facebook, Youtube, Swords, Sparkles, X, Eye, Download, Copy, Save, MessageSquare, FileText } from 'lucide-react';
import { useTheme, getThemeClasses } from '../context/ThemeContext';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  twitter: <Twitter className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
  facebook: <Facebook className="w-3 h-3" />,
  youtube: <Youtube className="w-3 h-3" />,
};

const Competitors: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = getThemeClasses(isDarkMode);
  const [posts, setPosts] = useState<CompetitorPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Last 7 days');
  
  // Rival Post State
  const [showRivalPostModal, setShowRivalPostModal] = useState(false);
  const [rivalPostLoading, setRivalPostLoading] = useState(false);
  const [rivalPost, setRivalPost] = useState<{
    caption: string;
    hashtags: string[];
    imageUrl: string;
    platform: string;
    competitorName: string;
    originalContent: string;
  } | null>(null);
  const [editedCaption, setEditedCaption] = useState('');
  const [editedHashtags, setEditedHashtags] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  // Handle creating a rival post
  const handleCreateRivalPost = async (post: CompetitorPost) => {
    setRivalPostLoading(true);
    setShowRivalPostModal(true);
    setRivalPost(null);
    
    try {
      const result = await apiService.generateRivalPost({
        competitorName: post.competitorName,
        competitorContent: post.content,
        platform: post.platform,
        sentiment: post.sentiment,
        likes: post.likes,
        comments: post.comments
      });
      
      setRivalPost({
        caption: result.caption,
        hashtags: result.hashtags,
        imageUrl: result.imageUrl,
        platform: post.platform,
        competitorName: post.competitorName,
        originalContent: post.content
      });
      setEditedCaption(result.caption);
      setEditedHashtags(result.hashtags.join(' '));
    } catch (error) {
      console.error('Failed to generate rival post:', error);
      alert('Failed to generate rival post. Please try again.');
      setShowRivalPostModal(false);
    } finally {
      setRivalPostLoading(false);
    }
  };

  // Save rival post as draft
  const handleSaveAsDraft = async () => {
    if (!rivalPost) return;
    setSavingDraft(true);
    
    try {
      await apiService.createCampaign({
        name: `Rival to ${rivalPost.competitorName}`,
        objective: 'engagement',
        platforms: [rivalPost.platform],
        status: 'draft',
        creative: {
          type: 'image',
          textContent: editedCaption,
          imageUrls: [rivalPost.imageUrl],
          captions: editedCaption,
          hashtags: editedHashtags.split(/[\s#]+/).filter(t => t.trim())
        },
        scheduling: {
          startDate: new Date().toISOString().split('T')[0],
          postTime: '10:00'
        }
      });
      
      alert('Saved as draft! Check your Campaigns page.');
      setShowRivalPostModal(false);
      setRivalPost(null);
    } catch (error) {
      console.error('Failed to save draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  // Copy caption to clipboard
  const handleCopyCaption = () => {
    const fullCaption = `${editedCaption}\n\n${editedHashtags}`;
    navigator.clipboard.writeText(fullCaption);
    alert('Caption and hashtags copied to clipboard!');
  };

  // Download image
  const handleDownloadImage = async () => {
    if (!rivalPost?.imageUrl) return;
    
    try {
      const response = await fetch(rivalPost.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rival-post-${rivalPost.platform}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      window.open(rivalPost.imageUrl, '_blank');
    }
  };

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
          <h1 className={`text-2xl font-bold ${theme.text}`}>Competitor Analysis</h1>
          <p className={theme.textSecondary}>Track market rivals with real-time AI search.</p>
        </div>
        <div className="flex gap-2">
            {['Last 7 days', 'Last 1 month', 'Last 3 months'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setSelectedFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border ${f === selectedFilter 
                    ? 'bg-[#ffcc29]/10 border-[#ffcc29]/30 text-[#ffcc29]' 
                    : `${theme.bgCard} ${isDarkMode ? 'border-[#ffcc29]/20 text-[#ededed]/70 hover:bg-[#ffcc29]/10' : 'border-slate-200 text-slate-600 hover:bg-[#f5f5f5]'}`}`}
                >
                    {f}
                </button>
            ))}
        </div>
      </div>

      <div className={`${theme.bgCard} p-6 rounded-xl border ${isDarkMode ? 'border-[#ffcc29]/20' : 'border-slate-200'} mb-8`}>
          <div className="flex justify-between items-center mb-6">
              <h2 className={`text-lg font-bold ${theme.text}`}>Competitor Activity Feed</h2>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textMuted}`} />
                  <input 
                      type="text" 
                      placeholder="Filter by keyword..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-9 pr-8 py-2 border rounded-lg text-sm outline-none focus:border-[#ffcc29] ${isDarkMode ? 'bg-[#070A12] border-[#ffcc29]/20 text-[#ededed] placeholder-[#ededed]/50' : 'border-slate-300 text-[#070A12]'}`}
                  />
                  <RotateCw 
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer hover:text-[#ffcc29] ${theme.textMuted} ${loading ? 'animate-spin' : ''}`}
                    onClick={handleRefresh}
                  />
                </div>
              </div>
          </div>

          {loading ? (
             <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#ffcc29] animate-spin" />
             </div>
          ) : filteredPosts.length === 0 ? (
             <div className="text-center py-12">
                <p className={`${theme.textSecondary} mb-4`}>No competitor posts found.</p>
                <button 
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-[#ffcc29] text-white rounded-lg text-sm font-medium hover:bg-[#e6b825]"
                >
                  Load Sample Data
                </button>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map(post => (
                    <div key={post.id} className={`${theme.bgCard} border ${isDarkMode ? 'border-[#ffcc29]/20 hover:border-[#ffcc29]/40' : 'border-[#ededed] hover:shadow-md'} rounded-xl p-5 transition-all`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                    post.competitorName?.includes('Tech') ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') :
                                    post.competitorName?.includes('Market') ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
                                    post.competitorName?.includes('Growth') ? (isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700') :
                                    (isDarkMode ? 'bg-[#ffcc29]/20 text-[#ffcc29]' : 'bg-[#ffcc29]/20 text-indigo-700')
                                }`}>
                                    {post.competitorLogo || post.competitorName?.charAt(0) || 'C'}
                                </div>
                                <div>
                                    <h3 className={`text-sm font-bold ${theme.text}`}>{post.competitorName}</h3>
                                    <p className={`text-xs flex items-center gap-1 ${theme.textMuted}`}>
                                      {platformIcons[post.platform] || post.platform} • {post.postedAt}
                                    </p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                post.sentiment === 'positive' ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600') :
                                post.sentiment === 'negative' ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600') :
                                (isDarkMode ? 'bg-[#ededed]/10 text-[#ededed]/60' : 'bg-[#ededed] text-slate-600')
                            }`}>
                                {post.sentiment}
                            </span>
                        </div>
                        
                        <p className={`text-sm mb-4 min-h-[60px] ${theme.textSecondary}`}>
                            {post.content}
                        </p>

                        {/* Create Rival Post Button */}
                        <button
                          onClick={() => handleCreateRivalPost(post)}
                          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#ffcc29] to-[#ffa500] text-black text-sm font-semibold rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all"
                        >
                          <Swords className="w-4 h-4" />
                          Create Rival Post
                        </button>

                        <div className={`flex justify-between items-center pt-4 border-t ${isDarkMode ? 'border-[#ededed]/10' : 'border-[#f5f5f5]'}`}>
                            <div className="flex gap-4">
                                <span className={`flex items-center gap-1 text-xs font-medium ${theme.textSecondary}`}>
                                    <Heart className="w-3 h-3 text-red-400 fill-red-400" /> {(post.likes || 0).toLocaleString()}
                                </span>
                                <span className={`flex items-center gap-1 text-xs font-medium ${theme.textSecondary}`}>
                                    <MessageCircle className={`w-3 h-3 ${theme.textMuted}`} /> {post.comments || 0}
                                </span>
                            </div>
                            {post.postUrl ? (
                              <a 
                                href={post.postUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-medium text-[#ffcc29] hover:underline"
                              >
                                  View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className={`flex items-center gap-1 text-xs font-medium ${theme.textMuted}`}>
                                  {post.platform}
                              </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
          )}
      </div>

      {/* Rival Post Modal */}
      {showRivalPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !rivalPostLoading && setShowRivalPostModal(false)}>
          <div 
            className={`${isDarkMode ? 'bg-[#0d1117] border-[#ffcc29]/20' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-[#ffcc29]/20 bg-gradient-to-r from-[#0d1117] to-[#161b22]' : 'border-slate-100 bg-gradient-to-r from-white to-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#ffcc29] to-[#ffa500] flex items-center justify-center">
                    <Swords className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${theme.text}`}>Create Rival Post</h3>
                    <p className={`text-xs ${theme.textMuted}`}>
                      {rivalPost ? `Countering ${rivalPost.competitorName}'s ${rivalPost.platform} post` : 'Generating your viral counter-post...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRivalPostModal(false)}
                  disabled={rivalPostLoading}
                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-[#161b22]' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {rivalPostLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#ffcc29] to-[#ffa500] flex items-center justify-center mb-4 animate-pulse">
                    <Sparkles className="w-8 h-8 text-black animate-spin" />
                  </div>
                  <p className={`text-lg font-semibold ${theme.text} mb-2`}>Crafting Your Viral Post</p>
                  <p className={`text-sm ${theme.textMuted} text-center max-w-sm`}>
                    Our AI is analyzing the competitor's content and creating a unique, engaging post that will help you stand out...
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-2 h-2 rounded-full bg-[#ffcc29] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#ffcc29] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#ffcc29] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              ) : rivalPost ? (
                <div className="space-y-6">
                  {/* Original Post Reference */}
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/10' : 'bg-slate-50 border-slate-200'} border`}>
                    <p className={`text-xs font-medium ${theme.textMuted} mb-2 flex items-center gap-1.5`}>
                      <Eye className="w-3.5 h-3.5" /> Original Competitor Post
                    </p>
                    <p className={`text-sm ${theme.textSecondary} italic`}>"{rivalPost.originalContent}"</p>
                  </div>

                  {/* Generated Image */}
                  <div className="relative">
                    <p className={`text-xs font-medium ${theme.textMuted} mb-2 flex items-center gap-1.5`}>
                      <Sparkles className="w-3.5 h-3.5 text-[#ffcc29]" /> AI Generated Image
                    </p>
                    <div className="relative rounded-xl overflow-hidden border border-[#ffcc29]/20">
                      <img 
                        src={rivalPost.imageUrl} 
                        alt="Generated rival post" 
                        className="w-full h-64 object-cover"
                      />
                      <button
                        onClick={handleDownloadImage}
                        className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Caption */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-xs font-medium ${theme.textMuted} flex items-center gap-1.5`}>
                        <MessageSquare className="w-3.5 h-3.5" /> Caption
                      </p>
                      <button
                        onClick={handleCopyCaption}
                        className={`flex items-center gap-1 text-xs ${theme.textMuted} hover:text-[#ffcc29] transition-colors`}
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <textarea
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      className={`w-full p-4 rounded-xl ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:ring-2 focus:ring-[#ffcc29]/50 focus:border-[#ffcc29] transition-all resize-none`}
                      rows={4}
                    />
                  </div>

                  {/* Hashtags */}
                  <div>
                    <p className={`text-xs font-medium ${theme.textMuted} mb-2 flex items-center gap-1.5`}>
                      <FileText className="w-3.5 h-3.5" /> Hashtags
                    </p>
                    <input
                      type="text"
                      value={editedHashtags}
                      onChange={(e) => setEditedHashtags(e.target.value)}
                      className={`w-full p-3 rounded-xl ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:ring-2 focus:ring-[#ffcc29]/50 focus:border-[#ffcc29] transition-all`}
                      placeholder="#trending #viral #marketing"
                    />
                    <p className={`text-xs ${theme.textMuted} mt-1`}>
                      {editedHashtags.split(/[\s#]+/).filter(t => t.trim()).length} hashtags
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer Actions */}
            {rivalPost && !rivalPostLoading && (
              <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-[#ffcc29]/20 bg-[#0d1117]' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setShowRivalPostModal(false)}
                    className={`px-4 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#161b22] hover:bg-[#21262d]' : 'bg-slate-100 hover:bg-slate-200'} ${theme.text} text-sm font-medium transition-colors`}
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveAsDraft}
                      disabled={savingDraft}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#161b22] border-[#ffcc29]/30 hover:border-[#ffcc29]' : 'bg-white border-slate-200 hover:border-[#ffcc29]'} border ${theme.text} text-sm font-medium transition-all disabled:opacity-50`}
                    >
                      {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save as Draft
                    </button>
                    <button
                      onClick={handleCopyCaption}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ffcc29] to-[#ffa500] text-black text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                      Copy & Post
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Competitors;