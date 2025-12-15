export interface BusinessProfile {
  name: string;
  website: string;
  industry: string;
  niche: string;
  businessType: 'B2B' | 'B2C' | 'Both' | '';
  targetAudience: string;
  brandVoice: string; // e.g., Professional, Witty, Empathetic
  marketingGoals: string[]; // e.g., Brand Awareness, Sales, Leads
  description: string;
}

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  onboardingCompleted: boolean;
  businessProfile?: BusinessProfile;
  brandScore?: {
    score: number;
    metrics: {
      engagement: number;
      consistency: number;
      authenticity: number;
    };
  };
  preferences?: {
    emailNotifications: boolean;
  };
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface Campaign {
  _id: string;
  name: string;
  objective: 'awareness' | 'traffic' | 'sales' | 'engagement' | 'conversion';
  platforms: string[];
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived' | 'posted';
  creative: {
    type: 'text' | 'image' | 'video' | 'carousel';
    textContent: string;
    imageUrls: string[];
    captions?: string;
    aiGenerated?: boolean;
  };
  scheduling: {
    startDate: string;
    endDate?: string;
    postTime?: string;
  };
  budget?: {
    type: 'daily' | 'lifetime';
    amount: number;
  };
  audience?: string;
  performance?: {
    impressions: number;
    clicks: number;
    ctr: number;
    engagement: number;
    spend: number;
  };
  createdAt: string;
}

export interface CompetitorPost {
  id: string;
  competitorName: string;
  competitorLogo?: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  postedAt: string;
  likes: number;
  comments: number;
  platform: string;
}

export interface Competitor {
  _id: string;
  name: string;
  industry: string;
  website: string;
  analysisScore: number;
  strengths: string[];
  weaknesses: string[];
  lastAnalyzed: string;
  posts?: CompetitorPost[];
}

export interface Influencer {
  _id: string;
  name: string;
  platform: 'instagram' | 'linkedin' | 'tiktok' | 'youtube' | 'twitter';
  handle: string;
  followerCount: number;
  reach: number;
  engagementRate: number;
  niche: string[];
  type: 'Nano' | 'Micro' | 'Mid-Tier' | 'Macro' | 'Mega';
  aiMatchScore: {
    score: number;
    reason: string;
  };
  profileImage?: string;
}

export interface SocialConnection {
  platform: string;
  connected: boolean;
  username?: string;
  profileId?: string;
  lastSync?: string;
  status: 'active' | 'expired' | 'connecting' | 'disconnected';
}

export interface Trend {
  id: string;
  title: string;
  description: string;
  category: string;
}

export interface DashboardMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpent: number;
  brandScore: number;
  brandScoreChange: number;
  activeCampaignsChange: number;
  engagementRate: number;
}

export interface DashboardData {
  overview: DashboardMetrics;
  trends: Trend[];
  recentCampaigns: Campaign[];
  suggestedActions: { id: string; title: string; type: 'campaign' | 'social' }[];
  competitorActivity: CompetitorPost[];
}