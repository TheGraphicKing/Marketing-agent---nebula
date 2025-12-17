/**
 * Campaign Builder Routes
 * AI-powered complete campaign planning
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const CampaignPlan = require('../models/CampaignPlan');
const BrandProfile = require('../models/BrandProfile');
const Trend = require('../models/Trend');
const Insight = require('../models/Insight');
const { generateCampaignPlan, generateWithLLM, brainstormIdeas } = require('../services/llmRouter');

/**
 * POST /api/campaign-builder/generate
 * Generate a complete campaign plan
 */
router.post('/generate', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      brandId,
      objective,
      budget,
      duration = '4 weeks',
      targetAudience,
      channels = []
    } = req.body;
    
    if (!objective || !budget) {
      return res.status(400).json({
        success: false,
        error: 'Objective and budget are required'
      });
    }
    
    // Get brand profile
    let brandProfile = null;
    let brandContext = {};
    
    if (brandId) {
      brandProfile = await BrandProfile.findOne({ _id: brandId, userId });
      if (brandProfile) {
        brandContext = {
          name: brandProfile.name,
          industry: brandProfile.industry,
          niche: brandProfile.niche,
          targetAudience: brandProfile.targetAudience,
          brandVoice: brandProfile.brandVoice,
          uniqueSellingPoints: brandProfile.uniqueSellingPoints,
          valuePropositions: brandProfile.valuePropositions
        };
      }
    }
    
    // Get competitor insights
    const competitorInsights = await Insight.find({
      userId,
      type: 'competitor_comparison',
      status: 'active'
    }).limit(5);
    
    // Get recent trends
    const trends = await Trend.find({
      userId,
      status: 'active'
    }).sort({ lastSeenAt: -1 }).limit(10);
    
    // Generate campaign plan with Gemini
    const planResult = await generateCampaignPlan(
      {
        ...brandContext,
        targetAudience: targetAudience || brandContext.targetAudience
      },
      objective,
      budget,
      duration
    );
    
    const campaign = planResult.campaign || planResult;
    
    // Generate creative concepts with Grok (more creative)
    const creativeIdeas = await brainstormIdeas(
      `Campaign: ${objective}
Brand: ${brandContext.name || 'Brand'}
Industry: ${brandContext.industry || 'General'}
Budget: $${budget}
Duration: ${duration}

Generate bold, attention-grabbing creative concepts.`,
      5
    );
    
    // Build the campaign plan
    const campaignPlan = new CampaignPlan({
      userId,
      name: `${objective.charAt(0).toUpperCase() + objective.slice(1)} Campaign - ${new Date().toLocaleDateString()}`,
      description: `AI-generated ${objective} campaign for ${brandContext.name || 'your brand'}`,
      objective,
      
      audience: campaign.audience || {
        primarySegment: {
          name: targetAudience || 'Target Audience',
          demographics: {},
          psychographics: {}
        }
      },
      
      channels: (campaign.channels || channels.map(c => ({ platform: c }))).map(ch => ({
        platform: ch.platform || ch,
        role: ch.role || 'primary',
        objective: ch.objective || objective,
        contentTypes: ch.contentTypes || ['post', 'story'],
        postingFrequency: ch.postingFrequency || '3x per week',
        budgetAllocation: ch.budgetAllocation || Math.round(100 / (channels.length || 3)),
        expectedReach: ch.expectedReach || 'TBD',
        kpis: ch.kpis || []
      })),
      
      creatives: (creativeIdeas.ideas || []).map((idea, i) => ({
        name: `Creative ${i + 1}`,
        type: 'image',
        concept: typeof idea === 'string' ? idea : idea.title || idea.idea,
        hook: typeof idea === 'object' ? idea.hook : '',
        cta: 'Learn More',
        status: 'concept'
      })),
      
      landingPage: campaign.landingPage || {
        headline: `${brandContext.name || 'Brand'} - ${objective}`,
        subheadline: brandContext.valuePropositions?.[0] || 'Discover more',
        heroSection: {
          headline: 'Main headline',
          description: 'Hero description',
          cta: 'Get Started'
        },
        sections: [],
        ctas: []
      },
      
      calendar: campaign.calendar || generateDefaultCalendar(duration, objective),
      
      budget: {
        total: budget,
        currency: 'USD',
        allocation: {
          paid_ads: { amount: budget * 0.6, percentage: 60 },
          content_creation: { amount: budget * 0.2, percentage: 20 },
          influencer: { amount: budget * 0.1, percentage: 10 },
          tools: { amount: budget * 0.05, percentage: 5 },
          other: { amount: budget * 0.05, percentage: 5 }
        },
        weeklyBudget: budget / parseInt(duration),
        dailyBudget: budget / (parseInt(duration) * 7)
      },
      
      duration: {
        startDate: new Date(),
        endDate: new Date(Date.now() + parseInt(duration) * 7 * 24 * 60 * 60 * 1000),
        totalWeeks: parseInt(duration),
        phases: [
          { name: 'Launch', focus: 'Initial awareness push' },
          { name: 'Scale', focus: 'Optimize and scale winning creatives' },
          { name: 'Sustain', focus: 'Maintain momentum and retarget' }
        ]
      },
      
      kpis: campaign.kpis || [
        { metric: 'Impressions', target: `${Math.round(budget * 100)}+`, status: 'on_track' },
        { metric: 'Clicks', target: `${Math.round(budget * 5)}+`, status: 'on_track' },
        { metric: 'CTR', target: '2%+', status: 'on_track' },
        { metric: 'Conversions', target: `${Math.round(budget / 50)}+`, status: 'on_track' }
      ],
      
      abTests: [
        {
          name: 'Headline Test',
          hypothesis: 'Benefit-focused headlines outperform feature-focused',
          variableA: 'Feature headline',
          variableB: 'Benefit headline',
          metric: 'CTR',
          duration: '1 week',
          status: 'planned'
        }
      ],
      
      relatedBrand: brandProfile?._id,
      
      groundedIn: {
        brandProfile: !!brandProfile,
        competitorInsights: competitorInsights.length > 0,
        trendData: trends.length > 0,
        analyticsData: false,
        sources: [
          ...(brandProfile?.scrapedPages || []).map(p => ({
            type: 'brand_website',
            description: `${p.page} page`,
            url: p.url,
            fetchedAt: p.scrapedAt
          })),
          ...competitorInsights.map(i => ({
            type: 'competitor_insight',
            description: i.title,
            fetchedAt: i.createdAt
          })),
          ...trends.slice(0, 3).map(t => ({
            type: 'trend',
            description: t.title,
            url: t.sources?.[0]?.url,
            fetchedAt: t.lastSeenAt
          }))
        ]
      },
      
      generatedBy: {
        provider: 'gemini',
        generatedAt: new Date()
      },
      
      status: 'draft'
    });
    
    await campaignPlan.save();
    
    res.json({
      success: true,
      campaignPlan: {
        id: campaignPlan._id,
        name: campaignPlan.name,
        objective: campaignPlan.objective,
        audience: campaignPlan.audience,
        channels: campaignPlan.channels,
        creatives: campaignPlan.creatives,
        landingPage: campaignPlan.landingPage,
        calendar: campaignPlan.calendar,
        budget: campaignPlan.budget,
        duration: campaignPlan.duration,
        kpis: campaignPlan.kpis,
        abTests: campaignPlan.abTests,
        groundedIn: campaignPlan.groundedIn
      },
      generatedBy: {
        plan: 'gemini',
        creatives: 'grok'
      }
    });
    
  } catch (error) {
    console.error('Campaign generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorType: 'generation_failed'
    });
  }
});

/**
 * Generate default calendar
 */
function generateDefaultCalendar(duration, objective) {
  const weeks = parseInt(duration) || 4;
  const calendar = [];
  const today = new Date();
  
  const themes = {
    awareness: ['Introduction', 'Value Prop', 'Social Proof', 'Engagement'],
    traffic: ['Curiosity', 'Value', 'Action', 'Retarget'],
    leads: ['Problem', 'Solution', 'Proof', 'Offer'],
    sales: ['Attention', 'Interest', 'Desire', 'Action'],
    engagement: ['Connect', 'Educate', 'Entertain', 'Community']
  };
  
  const weekThemes = themes[objective] || themes.awareness;
  
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(today.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    calendar.push({
      week: w + 1,
      startDate: weekStart,
      endDate: weekEnd,
      theme: weekThemes[w % weekThemes.length],
      activities: [
        { day: 'Monday', platform: 'LinkedIn', contentType: 'post', description: 'Educational content', time: '9:00 AM', status: 'planned' },
        { day: 'Wednesday', platform: 'Instagram', contentType: 'reel', description: 'Behind the scenes', time: '12:00 PM', status: 'planned' },
        { day: 'Friday', platform: 'Twitter', contentType: 'thread', description: 'Industry insights', time: '10:00 AM', status: 'planned' }
      ],
      goals: [`Complete week ${w + 1} content`, 'Monitor engagement'],
      budget: 100
    });
  }
  
  return calendar;
}

/**
 * GET /api/campaign-builder/plans
 * Get all campaign plans
 */
router.get('/plans', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, limit = 50 } = req.query;
    
    const query = { userId };
    if (status) query.status = status;
    
    const plans = await CampaignPlan.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      plans: plans.map(p => ({
        id: p._id,
        name: p.name,
        objective: p.objective,
        budget: p.budget,
        duration: p.duration,
        status: p.status,
        createdAt: p.createdAt
      }))
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/campaign-builder/:id
 * Get single campaign plan
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const plan = await CampaignPlan.findOne({ _id: req.params.id, userId })
      .populate('relatedBrand', 'name industry websiteUrl');
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Campaign plan not found' });
    }
    
    res.json({ success: true, plan });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/campaign-builder/:id
 * Update campaign plan
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const plan = await CampaignPlan.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true }
    );
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Campaign plan not found' });
    }
    
    res.json({ success: true, plan });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/campaign-builder/:id/regenerate
 * Regenerate specific section of campaign
 */
router.post('/:id/regenerate', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { section } = req.body; // 'creatives', 'calendar', 'kpis', etc.
    
    const plan = await CampaignPlan.findOne({ _id: req.params.id, userId });
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Campaign plan not found' });
    }
    
    if (section === 'creatives') {
      const newCreatives = await brainstormIdeas(
        `Campaign: ${plan.objective}
Budget: $${plan.budget.total}
Channels: ${plan.channels.map(c => c.platform).join(', ')}

Generate fresh, bold creative concepts.`,
        5
      );
      
      plan.creatives = (newCreatives.ideas || []).map((idea, i) => ({
        name: `Creative ${i + 1}`,
        type: 'image',
        concept: typeof idea === 'string' ? idea : idea.title || idea.idea,
        status: 'concept'
      }));
      
      plan.generatedBy.regenerationCount++;
    }
    
    await plan.save();
    
    res.json({ success: true, plan });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/campaign-builder/:id/activate
 * Activate/approve campaign plan
 */
router.post('/:id/activate', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const plan = await CampaignPlan.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status: 'active' },
      { new: true }
    );
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Campaign plan not found' });
    }
    
    res.json({ success: true, plan });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/campaign-builder/:id
 * Delete campaign plan
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const result = await CampaignPlan.findOneAndDelete({ _id: req.params.id, userId });
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Campaign plan not found' });
    }
    
    res.json({ success: true, message: 'Campaign plan deleted' });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
