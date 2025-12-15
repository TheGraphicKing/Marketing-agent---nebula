import { AuthResponse, BusinessProfile, Campaign, DashboardData, SocialConnection, User } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

// Helper to get auth token
const getToken = (): string | null => localStorage.getItem('authToken');

// Helper to set auth token
const setToken = (token: string): void => localStorage.setItem('authToken', token);

// Helper to remove auth token
const removeToken = (): void => localStorage.removeItem('authToken');

// Generic API call function with real backend integration
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {},
  requiresAuth: boolean = false
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if required
  if (requiresAuth) {
    const token = getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data as T;
  } catch (error: any) {
    // Handle network errors
    if (error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to server. Please check your connection.');
    }
    throw error;
  }
}

// ============================================
// MOCK DATA FOR NON-AUTH FEATURES
// ============================================

// Helpers to get dates relative to today for the demo
const today = new Date();
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(today.getDate() + n);
  return d.toISOString().split('T')[0];
};

// Initial Mock Campaigns
let campaigns: Campaign[] = [
  {
    _id: 'c1',
    name: 'Winter Collection Launch',
    objective: 'awareness',
    platforms: ['instagram'],
    status: 'posted',
    creative: { type: 'image', textContent: 'Embrace the chill. ❄️ #WinterFashion', imageUrls: ['https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop'], captions: 'Embrace the chill.' },
    scheduling: { startDate: daysFromNow(-2), postTime: '10:00' },
    performance: { impressions: 12500, clicks: 450, ctr: 3.6, engagement: 4500, spend: 500 },
    createdAt: daysFromNow(-10)
  },
  {
    _id: 'c2',
    name: 'Spring Teaser Video',
    objective: 'awareness',
    platforms: ['tiktok'],
    status: 'draft',
    creative: { type: 'video', textContent: 'Coming soon...', imageUrls: [], captions: '' },
    scheduling: { startDate: daysFromNow(2), postTime: '09:00' },
    createdAt: daysFromNow(-1)
  },
  {
    _id: 'c3',
    name: 'Flash Sale: 24h',
    objective: 'sales',
    platforms: ['facebook'],
    status: 'scheduled',
    creative: { type: 'image', textContent: '24h Only!', imageUrls: [], captions: '' },
    scheduling: { startDate: daysFromNow(5), postTime: '12:00' },
    createdAt: daysFromNow(-3)
  },
  {
    _id: 'c4',
    name: 'Influencer Collab',
    objective: 'engagement',
    platforms: ['instagram', 'youtube'],
    status: 'active',
    creative: { type: 'image', textContent: 'Check out this review!', imageUrls: [], captions: '' },
    scheduling: { startDate: daysFromNow(0), postTime: '15:00' },
    createdAt: daysFromNow(-5)
  }
];

// Initial Social Connections
let socialConnections: SocialConnection[] = [
  { platform: 'Instagram', connected: false, status: 'disconnected' },
  { platform: 'Facebook', connected: false, status: 'disconnected' },
  { platform: 'Twitter', connected: false, status: 'disconnected' },
  { platform: 'LinkedIn', connected: false, status: 'disconnected' },
  { platform: 'YouTube', connected: false, status: 'disconnected' },
  { platform: 'TikTok', connected: false, status: 'disconnected' },
  { platform: 'Pinterest', connected: false, status: 'disconnected' },
  { platform: 'Snapchat', connected: false, status: 'disconnected' },
  { platform: 'Reddit', connected: false, status: 'disconnected' }
];

// Helper for Mock AI Generation
const generateContextAwareCaption = (topic: string, business?: BusinessProfile) => {
  const industry = business?.industry || 'General';
  const voice = business?.brandVoice || 'Professional';
  const audience = business?.targetAudience || 'Everyone';

  return `[AI Generated for ${industry} | Voice: ${voice}]\n\nHere is a caption targeting ${audience} about "${topic}":\n\n"Experience the difference. ${topic} brings you closer to what matters. 🚀 #NebulaaAI #${industry.replace(/\s/g, '')}"`;
};

// ============================================
// API SERVICE EXPORTS
// ============================================

export const apiService = {
  // ============================================
  // REAL AUTHENTICATION ENDPOINTS
  // ============================================
  
  register: async (data: { email: string; password: string; firstName: string; companyName?: string }): Promise<AuthResponse> => {
    const response = await apiCall<{ success: boolean; message: string; token: string; user: User }>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify(data) }
    );
    
    if (response.token) {
      setToken(response.token);
    }
    
    return {
      success: response.success,
      token: response.token,
      user: response.user
    };
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await apiCall<{ success: boolean; message: string; token: string; user: User }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) }
    );
    
    if (response.token) {
      setToken(response.token);
    }
    
    return {
      success: response.success,
      token: response.token,
      user: response.user
    };
  },

  getCurrentUser: async (): Promise<{ user: User | null }> => {
    try {
      const token = getToken();
      if (!token) {
        return { user: null };
      }
      
      const response = await apiCall<{ success: boolean; user: User }>(
        '/auth/me',
        { method: 'GET' },
        true
      );
      
      return { user: response.user };
    } catch (error) {
      removeToken();
      return { user: null };
    }
  },

  logout: (): void => {
    removeToken();
  },

  completeOnboarding: async (data: BusinessProfile, connectedSocials?: {platform: string; username?: string}[]): Promise<{ success: boolean; user: User }> => {
    const response = await apiCall<{ success: boolean; user: User }>(
      '/auth/complete-onboarding',
      { method: 'PUT', body: JSON.stringify({ businessProfile: data, connectedSocials }) },
      true
    );
    return response;
  },

  updateProfile: async (data: Partial<User>): Promise<{ success: boolean; user: User }> => {
    const response = await apiCall<{ success: boolean; user: User }>(
      '/auth/update-profile',
      { method: 'PUT', body: JSON.stringify(data) },
      true
    );
    return response;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; token?: string }> => {
    const response = await apiCall<{ success: boolean; token: string }>(
      '/auth/change-password',
      { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) },
      true
    );
    
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  },

  // ============================================
  // REAL DASHBOARD ENDPOINTS (AI-POWERED)
  // ============================================

  getDashboardOverview: async (): Promise<DashboardData> => {
    try {
      const response = await apiCall<{ success: boolean; data: any }>(
        '/dashboard/overview',
        { method: 'GET' },
        true
      );
      
      if (response.success && response.data) {
        return {
          overview: response.data.overview || {
            totalCampaigns: 0,
            activeCampaigns: 0,
            activeCampaignsChange: 0,
            totalSpent: 0,
            brandScore: 50,
            brandScoreChange: 0,
            engagementRate: 0
          },
          trends: response.data.trends || [],
          recentCampaigns: response.data.recentCampaigns || campaigns,
          suggestedActions: response.data.suggestedActions || [],
          competitorActivity: response.data.competitorActivity || [],
          // Extended AI data
          campaignIdeas: response.data.campaignIdeas,
          brandScoreFactors: response.data.brandScoreFactors,
          personalizedTips: response.data.personalizedTips,
          businessContext: response.data.businessContext,
          generatedAt: response.data.generatedAt
        } as DashboardData;
      }
      
      throw new Error('Invalid response');
    } catch (error) {
      console.log('Using fallback dashboard data:', error);
      // Fallback to mock data if API fails or user not logged in
      const activeCount = campaigns.filter(c => c.status === 'active' || c.status === 'posted').length;
      
      return {
        overview: {
          totalCampaigns: campaigns.length,
          activeCampaigns: activeCount,
          activeCampaignsChange: 12,
          totalSpent: campaigns.reduce((acc, curr) => acc + (curr.performance?.spend || 0), 0),
          brandScore: 75,
          brandScoreChange: 4.2,
          engagementRate: 3.8
        },
        trends: [
          { id: '1', title: 'AI in Marketing', description: 'Leveraging AI for personalized content.', category: 'Tech' },
          { id: '2', title: 'Sustainability', description: 'Green marketing is on the rise.', category: 'Social' },
          { id: '3', title: 'Short-form Video', description: 'TikTok and Reels dominance continues.', category: 'Media' }
        ],
        recentCampaigns: campaigns,
        suggestedActions: [
          { id: '1', title: 'Post a story update', type: 'campaign' },
          { id: '2', title: 'Review competitor ads', type: 'social' }
        ],
        competitorActivity: [
          { id: 'p1', competitorName: 'Rival Co.', content: 'New product alert!', sentiment: 'neutral', postedAt: '2h ago', likes: 50, comments: 2, platform: 'instagram' }
        ]
      } as DashboardData;
    }
  },

  getCompetitorAnalysis: async (competitors?: string[]): Promise<any> => {
    try {
      const queryString = competitors ? `?competitors=${competitors.join(',')}` : '';
      const response = await apiCall<{ success: boolean; data: any }>(
        `/dashboard/competitors${queryString}`,
        { method: 'GET' },
        true
      );
      return response.data;
    } catch (error) {
      console.log('Competitor analysis error:', error);
      return { competitors: [], marketGaps: [], recommendations: [] };
    }
  },

  getCampaignSuggestions: async (count: number = 3): Promise<any> => {
    try {
      const response = await apiCall<{ success: boolean; data: any }>(
        `/dashboard/campaign-suggestions?count=${count}`,
        { method: 'GET' },
        true
      );
      return response.data;
    } catch (error) {
      console.log('Campaign suggestions error:', error);
      return { campaigns: [] };
    }
  },

  refreshDashboard: async (): Promise<any> => {
    try {
      const response = await apiCall<{ success: boolean; data: any }>(
        '/dashboard/refresh',
        { method: 'POST' },
        true
      );
      return response.data;
    } catch (error) {
      console.log('Dashboard refresh error:', error);
      return null;
    }
  },

  getSynopsis: async (sectionType: string, sectionData: any): Promise<{ synopsis: string; insights: string[]; trend: 'up' | 'down' | 'stable' }> => {
    try {
      const response = await apiCall<{ success: boolean; synopsis: string; insights?: string[]; trend?: 'up' | 'down' | 'stable' }>(
        '/dashboard/synopsis',
        { method: 'POST', body: JSON.stringify({ section: sectionType, data: sectionData }) },
        true
      );
      return {
        synopsis: response.synopsis || 'No synopsis available.',
        insights: response.insights || [],
        trend: response.trend || 'stable'
      };
    } catch (error) {
      console.log('Synopsis error:', error);
      return { 
        synopsis: 'Unable to generate synopsis at this time. Please try again.', 
        insights: [], 
        trend: 'stable' 
      };
    }
  },

  // ============================================
  // AI CAPTION GENERATION
  // ============================================

  generateCaption: async (topic: string): Promise<{ caption: string }> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const caption = generateContextAwareCaption(topic);
    return { caption };
  },

  // ============================================
  // SOCIAL CONNECTIONS - HYBRID (Real YouTube, Mock others)
  // ============================================

  getSocials: async (): Promise<{ connections: SocialConnection[] }> => {
    try {
      // Try to get real social connections from backend
      const response = await apiCall<{ success: boolean; connections: SocialConnection[] }>(
        '/social/status',
        { method: 'GET' },
        true
      );
      return { connections: response.connections };
    } catch (error) {
      // Fallback to mock data if not logged in or API fails
      console.log('Using mock social connections');
      return { connections: socialConnections };
    }
  },

  // Get YouTube OAuth URL
  getYouTubeAuthUrl: async (): Promise<{ success: boolean; authUrl: string }> => {
    const response = await apiCall<{ success: boolean; authUrl: string }>(
      '/social/youtube/auth',
      { method: 'GET' },
      true
    );
    return response;
  },

  // Disconnect YouTube
  disconnectYouTube: async (): Promise<{ success: boolean }> => {
    const response = await apiCall<{ success: boolean }>(
      '/social/youtube/disconnect',
      { method: 'POST' },
      true
    );
    return response;
  },

  toggleSocial: async (platform: string, connected: boolean, username?: string): Promise<{ success: boolean }> => {
    // For YouTube, use real API
    if (platform === 'YouTube' && !connected) {
      return await apiService.disconnectYouTube();
    }
    
    // For other platforms, use mock
    await new Promise(resolve => setTimeout(resolve, 300));
    
    socialConnections = socialConnections.map(s =>
      s.platform === platform
        ? {
            ...s,
            connected,
            username: connected ? username : undefined,
            status: connected ? 'active' : 'disconnected'
          }
        : s
    );
    
    return { success: true };
  },

  getCompetitors: async (): Promise<any> => {
    try {
      // First try to get real data from backend
      const response = await apiCall<{ success: boolean; posts: any[] }>(
        '/competitors/posts',
        { method: 'GET' },
        true
      );
      return { posts: response.posts || [] };
    } catch (error) {
      console.log('Using fallback competitor data');
      // Return empty - will trigger seed on page
      return { posts: [] };
    }
  },

  addCompetitor: async (data: any): Promise<any> => {
    const response = await apiCall<{ success: boolean; competitor: any }>(
      '/competitors',
      { method: 'POST', body: JSON.stringify(data) },
      true
    );
    return response;
  },

  addCompetitorPost: async (competitorId: string, post: any): Promise<any> => {
    const response = await apiCall<{ success: boolean; competitor: any }>(
      `/competitors/${competitorId}/posts`,
      { method: 'POST', body: JSON.stringify(post) },
      true
    );
    return response;
  },

  seedCompetitorSamples: async (): Promise<any> => {
    const response = await apiCall<{ success: boolean; message: string }>(
      '/competitors/seed-sample',
      { method: 'POST' },
      true
    );
    return response;
  },

  getInfluencers: async (): Promise<any> => {
    try {
      const response = await apiCall<{ success: boolean; influencers: any[] }>(
        '/influencers',
        { method: 'GET' },
        true
      );
      return { influencers: response.influencers || [] };
    } catch (error) {
      console.log('Using fallback influencer data');
      return { influencers: [] };
    }
  },

  addInfluencer: async (data: any): Promise<any> => {
    const response = await apiCall<{ success: boolean; influencer: any }>(
      '/influencers',
      { method: 'POST', body: JSON.stringify(data) },
      true
    );
    return response;
  },

  recalculateInfluencerScore: async (id: string): Promise<any> => {
    const response = await apiCall<{ success: boolean; influencer: any }>(
      `/influencers/${id}/recalculate`,
      { method: 'POST' },
      true
    );
    return response;
  },

  seedInfluencerSamples: async (): Promise<any> => {
    const response = await apiCall<{ success: boolean; message: string }>(
      '/influencers/seed-sample',
      { method: 'POST' },
      true
    );
    return response;
  },

  // ============================================
  // CAMPAIGNS - REAL BACKEND
  // ============================================

  getCampaigns: async (status?: string): Promise<{ campaigns: Campaign[]; counts?: any }> => {
    try {
      const queryString = status && status !== 'all' ? `?status=${status}` : '';
      const response = await apiCall<{ success: boolean; campaigns: Campaign[]; counts: any }>(
        `/campaigns${queryString}`,
        { method: 'GET' },
        true
      );
      return { campaigns: response.campaigns || [], counts: response.counts };
    } catch (error) {
      console.log('Using fallback campaign data:', error);
      return { campaigns };
    }
  },

  getCampaign: async (id: string): Promise<{ campaign: Campaign }> => {
    const response = await apiCall<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}`,
      { method: 'GET' },
      true
    );
    return { campaign: response.campaign };
  },

  createCampaign: async (data: Partial<Campaign>): Promise<{ campaign: Campaign }> => {
    const response = await apiCall<{ success: boolean; campaign: Campaign }>(
      '/campaigns',
      { method: 'POST', body: JSON.stringify(data) },
      true
    );
    return { campaign: response.campaign };
  },

  updateCampaign: async (id: string, data: Partial<Campaign>): Promise<{ campaign: Campaign }> => {
    const response = await apiCall<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      true
    );
    return { campaign: response.campaign };
  },

  deleteCampaign: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiCall<{ success: boolean }>(
      `/campaigns/${id}`,
      { method: 'DELETE' },
      true
    );
    return response;
  },

  postCampaign: async (id: string): Promise<{ campaign: Campaign }> => {
    const response = await apiCall<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}/post`,
      { method: 'POST' },
      true
    );
    return { campaign: response.campaign };
  },

  archiveCampaign: async (id: string): Promise<{ campaign: Campaign }> => {
    const response = await apiCall<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}/archive`,
      { method: 'POST' },
      true
    );
    return { campaign: response.campaign };
  },

  scheduleCampaign: async (id: string, startDate: string, postTime: string): Promise<{ campaign: Campaign }> => {
    const response = await apiCall<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}/schedule`,
      { method: 'POST', body: JSON.stringify({ startDate, postTime }) },
      true
    );
    return { campaign: response.campaign };
  },

  getCampaignAnalytics: async (startDate?: string, endDate?: string): Promise<any> => {
    try {
      let queryString = '';
      if (startDate || endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        queryString = `?${params.toString()}`;
      }
      
      const response = await apiCall<{ success: boolean; analytics: any }>(
        `/campaigns/analytics/overview${queryString}`,
        { method: 'GET' },
        true
      );
      return response.analytics;
    } catch (error) {
      console.log('Analytics error:', error);
      return {
        totals: { impressions: 0, clicks: 0, engagement: 0, reach: 0, spend: 0 },
        averages: { ctr: 0, engagementRate: 0 },
        campaignCount: 0,
        dailyData: []
      };
    }
  },

  // ============================================
  // REMINDERS - REAL BACKEND
  // ============================================

  getReminders: async (startDate?: string, endDate?: string): Promise<{ reminders: any[] }> => {
    try {
      let queryString = '';
      if (startDate || endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        queryString = `?${params.toString()}`;
      }
      
      const response = await apiCall<{ success: boolean; reminders: any[] }>(
        `/reminders${queryString}`,
        { method: 'GET' },
        true
      );
      return { reminders: response.reminders || [] };
    } catch (error) {
      console.log('Reminders error:', error);
      return { reminders: [] };
    }
  },

  getPendingReminders: async (): Promise<{ reminders: any[]; count: number }> => {
    try {
      const response = await apiCall<{ success: boolean; reminders: any[]; count: number }>(
        '/reminders/pending',
        { method: 'GET' },
        true
      );
      return { reminders: response.reminders || [], count: response.count || 0 };
    } catch (error) {
      console.log('Pending reminders error:', error);
      return { reminders: [], count: 0 };
    }
  },

  getCalendarEvents: async (year: number, month: number): Promise<{ events: any[] }> => {
    try {
      const response = await apiCall<{ success: boolean; events: any[] }>(
        `/reminders/calendar/${year}/${month}`,
        { method: 'GET' },
        true
      );
      return { events: response.events || [] };
    } catch (error) {
      console.log('Calendar events error:', error);
      return { events: [] };
    }
  },

  createReminder: async (data: {
    title: string;
    description?: string;
    scheduledFor: string;
    reminderOffset?: number;
    type?: string;
    campaignId?: string;
    platform?: string;
    color?: string;
  }): Promise<{ reminder: any }> => {
    const response = await apiCall<{ success: boolean; reminder: any }>(
      '/reminders',
      { method: 'POST', body: JSON.stringify(data) },
      true
    );
    return { reminder: response.reminder };
  },

  createCampaignReminder: async (campaignId: string, reminderOffset?: number): Promise<{ reminder: any }> => {
    const response = await apiCall<{ success: boolean; reminder: any }>(
      `/reminders/from-campaign/${campaignId}`,
      { method: 'POST', body: JSON.stringify({ reminderOffset: reminderOffset || 30 }) },
      true
    );
    return { reminder: response.reminder };
  },

  dismissReminder: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiCall<{ success: boolean }>(
      `/reminders/${id}/dismiss`,
      { method: 'POST' },
      true
    );
    return response;
  },

  snoozeReminder: async (id: string, minutes?: number): Promise<{ reminder: any }> => {
    const response = await apiCall<{ success: boolean; reminder: any }>(
      `/reminders/${id}/snooze`,
      { method: 'POST', body: JSON.stringify({ minutes: minutes || 15 }) },
      true
    );
    return { reminder: response.reminder };
  },

  deleteReminder: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiCall<{ success: boolean }>(
      `/reminders/${id}`,
      { method: 'DELETE' },
      true
    );
    return response;
  },
};
