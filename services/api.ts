import { AuthResponse, BusinessProfile, Campaign, Competitor, CompetitorPost, DashboardData, Influencer, SocialConnection, User } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

// --- IN-MEMORY DATABASE (Persists for the session) ---
let currentUser: User | null = null;

// Helpers to get dates relative to today for the demo
const today = new Date();
const daysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(today.getDate() + n);
    return d.toISOString().split('T')[0];
};

// Initial Mock Campaigns populated to show up on the Calendar
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

async function handleResponse<T>(response: Response): Promise<T> {
  // In a real app, we'd check response.ok here
  return response as any;
}

// Helper for Mock AI Generation based on context
const generateContextAwareCaption = (topic: string, business?: BusinessProfile) => {
    const industry = business?.industry || 'General';
    const voice = business?.brandVoice || 'Professional';
    const audience = business?.targetAudience || 'Everyone';

    return `[AI Generated for ${industry} | Voice: ${voice}]\n\nHere is a caption targeting ${audience} about "${topic}":\n\n"Experience the difference. ${topic} brings you closer to what matters. 🚀 #NebulaaAI #${industry.replace(/\s/g, '')}"`;
};

// --- API CLIENT ---

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Simulate network delay for realism
  await new Promise(resolve => setTimeout(resolve, 500));

  // --- MOCK INTERCEPTOR ---
  
  // Auth Routes
  if (endpoint === '/auth/login' || endpoint === '/auth/register') {
      const body = JSON.parse(options.body as string);
      
      // If user doesn't exist in memory (first load), create one based on input
      if (!currentUser) {
          currentUser = {
            _id: '1',
            email: body.email,
            firstName: body.firstName || 'User',
            lastName: 'Admin',
            onboardingCompleted: false, 
            brandScore: { score: 0, metrics: { engagement: 0, consistency: 0, authenticity: 0 } },
            preferences: { emailNotifications: true }
          };
      }
      return { success: true, token: 'mock-jwt-token-123', user: currentUser } as unknown as T;
  }
  
  if (endpoint === '/auth/me') {
      if (!currentUser) throw new Error("Unauthorized");
      return { user: currentUser } as unknown as T;
  }

  // Onboarding Persistence
  if (endpoint === '/auth/onboarding') {
      const body = JSON.parse(options.body as string);
      if (currentUser) {
          currentUser = {
              ...currentUser,
              onboardingCompleted: true,
              businessProfile: body,
              brandScore: { score: 75, metrics: { engagement: 0.5, consistency: 0.8, authenticity: 0.9 } }
          };
      }
      return { success: true, user: currentUser } as unknown as T;
  }

  // Campaigns Logic
  if (endpoint.startsWith('/campaigns')) {
      // Create
      if (options.method === 'POST') {
          const newCampaign = JSON.parse(options.body as string);
          const campaignObj: Campaign = { 
              ...newCampaign, 
              _id: Math.random().toString(36).substr(2, 9),
              createdAt: new Date().toISOString(),
              platforms: newCampaign.platforms || ['instagram'], // Default
              status: newCampaign.status || 'draft',
              performance: { impressions: 0, clicks: 0, ctr: 0, engagement: 0, spend: 0 }
          };
          campaigns.unshift(campaignObj);
          return { success: true, campaign: campaignObj } as unknown as T;
      }

      // Read (Filter)
      if (endpoint.includes('status=')) {
          const status = endpoint.split('status=')[1];
          const filtered = campaigns.filter(c => c.status === status);
          return { campaigns: filtered } as unknown as T;
      }

      return { campaigns } as unknown as T;
  }

  // Socials Logic
  if (endpoint === '/settings/socials') {
      return { connections: socialConnections } as unknown as T;
  }

  if (endpoint === '/settings/socials/toggle') {
      const body = JSON.parse(options.body as string);
      socialConnections = socialConnections.map(s => 
          s.platform === body.platform 
          ? { 
              ...s, 
              connected: body.connected, 
              username: body.connected ? body.username : undefined, 
              status: body.connected ? 'active' : 'disconnected' 
            } 
          : s
      );
      return { success: true } as unknown as T;
  }

  // AI Generation
  if (endpoint === '/ai/generate-caption') {
      const body = JSON.parse(options.body as string);
      const caption = generateContextAwareCaption(body.topic, currentUser?.businessProfile);
      return { caption } as unknown as T;
  }

  // Dashboard Aggregation
  if (endpoint === '/dashboard/overview') {
      const activeCount = campaigns.filter(c => c.status === 'active' || c.status === 'posted').length;
      return {
          overview: { 
            totalCampaigns: campaigns.length, 
            activeCampaigns: activeCount, 
            activeCampaignsChange: 12,
            totalSpent: campaigns.reduce((acc, curr) => acc + (curr.performance?.spend || 0), 0), 
            brandScore: currentUser?.brandScore?.score || 0,
            brandScoreChange: 4.2,
            engagementRate: 3.8 
          },
          trends: [
              { id: '1', title: 'AI in Marketing', description: 'Leveraging AI for personalized content.', category: 'Tech' },
              { id: '2', title: 'Sustainability', description: 'Green marketing is on the rise.', category: 'Social' },
              { id: '3', title: 'Short-form Video', description: 'TikTok and Reels dominance continues.', category: 'Media' }
          ],
          recentCampaigns: campaigns, // Return all so dashboard can filter for calendar
          suggestedActions: [
              { id: '1', title: 'Post a story update', type: 'campaign' },
              { id: '2', title: 'Review competitor ads', type: 'social' }
          ],
          competitorActivity: [
              { id: 'p1', competitorName: 'Rival Co.', content: 'New product alert!', sentiment: 'neutral', postedAt: '2h ago', likes: 50, comments: 2, platform: 'instagram' }
          ]
      } as unknown as T;
  }

  // Placeholders for other endpoints
  return {} as unknown as T;
}

export const apiService = {
  register: (data: any) => apiCall<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => apiCall<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getCurrentUser: () => apiCall<{ user: User }>('/auth/me'),
  completeOnboarding: (data: BusinessProfile) => apiCall<{ success: boolean; user: User }>('/auth/onboarding', { method: 'POST', body: JSON.stringify(data) }),
  
  getDashboardOverview: () => apiCall<DashboardData>('/dashboard/overview'),
  
  getCampaigns: (status?: string) => apiCall<{ campaigns: Campaign[] }>(`/campaigns${status ? `?status=${status}` : ''}`),
  createCampaign: (data: Partial<Campaign>) => apiCall<{ success: boolean; campaign: Campaign }>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  
  generateCaption: (topic: string) => apiCall<{ caption: string }>('/ai/generate-caption', { method: 'POST', body: JSON.stringify({ topic, maxLength: 280 }) }),
  
  getSocials: () => apiCall<{ connections: SocialConnection[] }>('/settings/socials'),
  toggleSocial: (platform: string, connected: boolean, username?: string) => apiCall<{ success: boolean }>('/settings/socials/toggle', { method: 'POST', body: JSON.stringify({ platform, connected, username }) }),
  
  getCompetitors: () => apiCall<any>('/competitors'),
  getInfluencers: () => apiCall<any>('/influencers'),
};