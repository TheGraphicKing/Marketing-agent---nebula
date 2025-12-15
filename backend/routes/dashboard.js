/**
 * Dashboard Routes
 * Provides AI-powered personalized dashboard data with REAL metrics from database
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Competitor = require('../models/Competitor');
const Influencer = require('../models/Influencer');
const { 
  generatePersonalizedDashboard, 
  generateCompetitorAnalysis,
  generateCampaignSuggestions,
  generateSectionSynopsis,
  getSectionInfo
} = require('../services/aiDashboard');

/**
 * GET /api/dashboard/overview
 * Get personalized dashboard overview with REAL data from database
 */
router.get('/overview', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get REAL campaign data from database
    const allCampaigns = await Campaign.find({ userId }).sort({ createdAt: -1 });
    const activeCampaigns = allCampaigns.filter(c => ['active', 'posted', 'scheduled'].includes(c.status));
    const recentCampaigns = allCampaigns.slice(0, 10);
    
    // Calculate REAL spend from campaigns
    const totalSpent = allCampaigns.reduce((sum, c) => sum + (c.budget?.spent || 0), 0);
    
    // Calculate REAL daily spend for the graph (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySpend = allCampaigns
        .filter(c => c.createdAt && c.createdAt.toISOString().split('T')[0] === dateStr)
        .reduce((sum, c) => sum + (c.budget?.spent || 0), 0);
      
      last7Days.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        spend: daySpend
      });
    }
    
    // Calculate REAL performance metrics
    const totalImpressions = allCampaigns.reduce((sum, c) => sum + (c.performance?.impressions || 0), 0);
    const totalClicks = allCampaigns.reduce((sum, c) => sum + (c.performance?.clicks || 0), 0);
    const totalEngagement = allCampaigns.reduce((sum, c) => sum + (c.performance?.engagement || 0), 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
    
    // Get REAL competitor data
    const competitors = await Competitor.find({ userId }).limit(10);
    const competitorPosts = [];
    for (const comp of competitors) {
      if (comp.posts && comp.posts.length > 0) {
        comp.posts.slice(0, 3).forEach(post => {
          competitorPosts.push({
            id: post._id?.toString() || Math.random().toString(),
            competitorName: comp.name,
            competitorLogo: comp.name?.charAt(0) || 'C',
            content: post.content || 'No content available',
            sentiment: post.sentiment || 'neutral',
            postedAt: post.postedAt ? getRelativeTime(post.postedAt) : 'Recently',
            likes: post.likes || 0,
            comments: post.comments || 0,
            platform: post.platform || comp.platforms?.[0] || 'unknown',
            sourceUrl: post.sourceUrl
          });
        });
      }
    }

    // Get REAL influencer count
    const influencerCount = await Influencer.countDocuments({ userId });
    
    // Generate AI-powered insights (but with real context)
    const aiData = await generatePersonalizedDashboard(user);
    
    // Calculate brand score based on REAL data
    const brandScore = calculateRealBrandScore({
      campaignCount: allCampaigns.length,
      activeCampaignCount: activeCampaigns.length,
      totalSpent,
      totalImpressions,
      totalEngagement,
      avgCTR,
      competitorCount: competitors.length,
      influencerCount
    });
    
    // Build response with REAL data
    const dashboardData = {
      success: true,
      data: {
        overview: {
          totalCampaigns: allCampaigns.length,
          activeCampaigns: activeCampaigns.length,
          activeCampaignsChange: calculateChange(activeCampaigns.length, 0), // Would compare to previous period
          totalSpent: totalSpent,
          dailySpend: last7Days,
          brandScore: brandScore,
          brandScoreChange: 0, // Would compare to previous period
          engagementRate: totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(2) : 0,
          totalImpressions,
          totalClicks,
          avgCTR,
          connectedPlatforms: (user.connectedSocials || []).filter(s => s.accessToken).length,
          influencerCount
        },
        trends: aiData.trendingTopics || [],
        recentCampaigns: recentCampaigns.map(c => ({
          _id: c._id,
          name: c.name,
          objective: c.objective,
          platforms: c.platforms,
          status: c.status,
          scheduling: c.scheduling,
          performance: c.performance,
          creative: c.creative,
          createdAt: c.createdAt
        })),
        suggestedActions: (aiData.suggestedActions || []).map(action => ({
          id: action.id,
          title: action.title,
          description: action.description,
          type: action.type || 'campaign',
          priority: action.priority || 'medium'
        })),
        competitorActivity: competitorPosts.length > 0 ? competitorPosts : (aiData.competitorInsights || []).map(insight => ({
          id: insight.id,
          competitorName: insight.competitorName,
          competitorLogo: insight.competitorName?.charAt(0) || 'C',
          content: insight.content,
          sentiment: insight.sentiment || 'neutral',
          postedAt: 'AI Generated',
          likes: insight.likes || 0,
          comments: insight.comments || 0,
          platform: insight.platform || 'instagram',
          insight: insight.insight,
          isAIGenerated: true
        })),
        campaignIdeas: aiData.campaignIdeas || [],
        brandScoreFactors: aiData.brandScoreFactors || {},
        personalizedTips: aiData.personalizedTips || [],
        businessContext: {
          name: user.businessProfile?.name,
          industry: user.businessProfile?.industry,
          niche: user.businessProfile?.niche
        },
        generatedAt: new Date().toISOString(),
        dataSource: 'real' // Indicates this is real data, not mock
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard', error: error.message });
  }
});

/**
 * GET /api/dashboard/competitors
 * Get AI-powered competitor analysis
 */
router.get('/competitors', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const competitors = req.query.competitors 
      ? req.query.competitors.split(',') 
      : (user.businessProfile?.competitors || []);

    const analysis = await generateCompetitorAnalysis(user, competitors);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Competitor analysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze competitors', error: error.message });
  }
});

/**
 * GET /api/dashboard/campaign-suggestions
 * Get AI-powered campaign suggestions
 */
router.get('/campaign-suggestions', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const count = parseInt(req.query.count) || 3;
    const suggestions = await generateCampaignSuggestions(user, count);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Campaign suggestions error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate suggestions', error: error.message });
  }
});

/**
 * POST /api/dashboard/refresh
 * Force refresh AI-generated dashboard data
 */
router.post('/refresh', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate fresh AI data
    const aiData = await generatePersonalizedDashboard(user);

    res.json({
      success: true,
      message: 'Dashboard refreshed',
      data: aiData
    });
  } catch (error) {
    console.error('Dashboard refresh error:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh dashboard', error: error.message });
  }
});

/**
 * POST /api/dashboard/synopsis
 * Get AI-powered synopsis for a specific dashboard section
 */
router.post('/synopsis', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { section, data } = req.body;
    
    if (!section) {
      return res.status(400).json({ success: false, message: 'Section is required' });
    }

    const synopsis = await generateSectionSynopsis({
      section,
      data: data || {},
      businessProfile: user.businessProfile
    });

    res.json({
      success: true,
      ...synopsis
    });
  } catch (error) {
    console.error('Synopsis generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate synopsis', error: error.message });
  }
});

/**
 * GET /api/dashboard/section-info/:section
 * Get static info about a dashboard section
 */
router.get('/section-info/:section', (req, res) => {
  const { section } = req.params;
  const info = getSectionInfo(section);
  
  res.json({
    success: true,
    ...info
  });
});

// Helper functions

/**
 * Calculate brand score based on REAL metrics
 */
function calculateRealBrandScore(metrics) {
  let score = 30; // Base score
  
  // Add points for campaigns
  if (metrics.campaignCount > 0) score += 10;
  if (metrics.campaignCount >= 5) score += 10;
  if (metrics.activeCampaignCount > 0) score += 10;
  
  // Add points for engagement
  if (metrics.totalImpressions > 100) score += 5;
  if (metrics.totalImpressions > 1000) score += 5;
  if (parseFloat(metrics.avgCTR) > 1) score += 5;
  if (parseFloat(metrics.avgCTR) > 3) score += 5;
  
  // Add points for competitor tracking
  if (metrics.competitorCount > 0) score += 5;
  if (metrics.competitorCount >= 3) score += 5;
  
  // Add points for influencer discovery
  if (metrics.influencerCount > 0) score += 5;
  if (metrics.influencerCount >= 5) score += 5;
  
  return Math.min(100, score);
}

/**
 * Calculate percentage change
 */
function calculateChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function calculateBrandScore(factors) {
  if (!factors) return 50;
  
  const weights = {
    engagement: 0.3,
    consistency: 0.25,
    audienceGrowth: 0.25,
    contentQuality: 0.2
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, value] of Object.entries(factors)) {
    if (weights[key] && value?.score) {
      totalScore += value.score * weights[key];
      totalWeight += weights[key];
    }
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
}

/**
 * Get relative time from a date
 */
function getRelativeTime(date) {
  if (!date) return 'Recently';
  
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

module.exports = router;
