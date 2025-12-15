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
  // MOCK ENDPOINTS FOR OTHER FEATURES
  // ============================================

  getDashboardOverview: async (): Promise<DashboardData> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
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
  },

  getCampaigns: async (status?: string): Promise<{ campaigns: Campaign[] }> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (status) {
      return { campaigns: campaigns.filter(c => c.status === status) };
    }
    return { campaigns };
  },

  createCampaign: async (data: Partial<Campaign>): Promise<{ success: boolean; campaign: Campaign }> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const campaignObj: Campaign = {
      ...data,
      _id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      platforms: data.platforms || ['instagram'],
      status: data.status || 'draft',
      performance: { impressions: 0, clicks: 0, ctr: 0, engagement: 0, spend: 0 }
    } as Campaign;
    
    campaigns.unshift(campaignObj);
    return { success: true, campaign: campaignObj };
  },

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
    await new Promise(resolve => setTimeout(resolve, 300));
    return { competitors: [] };
  },

  getInfluencers: async (): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { influencers: [] };
  },
};
