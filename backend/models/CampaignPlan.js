/**
 * Campaign Plan Model
 * Comprehensive campaign plans with all components
 */

const mongoose = require('mongoose');

const campaignPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Basic Info
  name: {
    type: String,
    required: true
  },
  description: String,
  
  // Campaign Objective
  objective: {
    type: String,
    enum: ['awareness', 'traffic', 'leads', 'sales', 'engagement', 'app_installs', 'video_views'],
    required: true
  },
  
  // Target Audience (AI-generated based on brand + competitors + trends)
  audience: {
    primarySegment: {
      name: String,
      demographics: {
        ageRange: String,
        gender: String,
        location: [String],
        income: String,
        education: String
      },
      psychographics: {
        interests: [String],
        behaviors: [String],
        values: [String],
        painPoints: [String]
      }
    },
    secondarySegments: [{
      name: String,
      description: String,
      size: String
    }],
    excludeSegments: [String]
  },
  
  // Channel Strategy
  channels: [{
    platform: String,
    role: { type: String, enum: ['primary', 'secondary', 'support'] },
    objective: String,
    contentTypes: [String],
    postingFrequency: String,
    budgetAllocation: Number, // percentage
    expectedReach: String,
    kpis: [{
      metric: String,
      target: String
    }]
  }],
  
  // Creative Concepts
  creatives: [{
    name: String,
    type: { type: String, enum: ['image', 'video', 'carousel', 'story', 'text'] },
    platform: String,
    concept: String,
    hook: String,
    cta: String,
    visualDescription: String,
    copyVariants: [String],
    status: { type: String, enum: ['concept', 'in_production', 'ready', 'live'], default: 'concept' }
  }],
  
  // Landing Page Outline
  landingPage: {
    headline: String,
    subheadline: String,
    heroSection: {
      headline: String,
      description: String,
      cta: String,
      visualConcept: String
    },
    sections: [{
      name: String,
      purpose: String,
      content: String,
      elements: [String]
    }],
    ctas: [{
      text: String,
      action: String,
      placement: String
    }],
    socialProof: [String],
    faq: [{
      question: String,
      answer: String
    }]
  },
  
  // Weekly Calendar
  calendar: [{
    week: Number,
    startDate: Date,
    endDate: Date,
    theme: String,
    activities: [{
      day: String,
      platform: String,
      contentType: String,
      description: String,
      time: String,
      status: { type: String, enum: ['planned', 'created', 'scheduled', 'published'], default: 'planned' }
    }],
    goals: [String],
    budget: Number
  }],
  
  // Budget Breakdown
  budget: {
    total: {
      type: Number,
      required: true
    },
    currency: { type: String, default: 'USD' },
    allocation: {
      paid_ads: { amount: Number, percentage: Number },
      content_creation: { amount: Number, percentage: Number },
      influencer: { amount: Number, percentage: Number },
      tools: { amount: Number, percentage: Number },
      other: { amount: Number, percentage: Number }
    },
    weeklyBudget: Number,
    dailyBudget: Number
  },
  
  // Duration
  duration: {
    startDate: Date,
    endDate: Date,
    totalWeeks: Number,
    phases: [{
      name: String,
      startDate: Date,
      endDate: Date,
      focus: String
    }]
  },
  
  // KPIs & Targets
  kpis: [{
    metric: String,
    target: String,
    current: String,
    status: { type: String, enum: ['on_track', 'at_risk', 'behind', 'exceeded'], default: 'on_track' }
  }],
  
  // A/B Testing Ideas
  abTests: [{
    name: String,
    hypothesis: String,
    variableA: String,
    variableB: String,
    metric: String,
    duration: String,
    status: { type: String, enum: ['planned', 'running', 'completed'], default: 'planned' }
  }],
  
  // Related Brand Profile
  relatedBrand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BrandProfile'
  },
  
  // Sources (grounded recommendations)
  groundedIn: {
    brandProfile: Boolean,
    competitorInsights: Boolean,
    trendData: Boolean,
    analyticsData: Boolean,
    sources: [{
      type: String,
      description: String,
      url: String,
      fetchedAt: Date
    }]
  },
  
  // AI Generation Info
  generatedBy: {
    provider: String,
    generatedAt: Date,
    regenerationCount: { type: Number, default: 0 }
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'reviewing', 'approved', 'active', 'paused', 'completed', 'archived'],
    default: 'draft'
  }
  
}, {
  timestamps: true
});

// Indexes
campaignPlanSchema.index({ userId: 1, status: 1 });
campaignPlanSchema.index({ relatedBrand: 1 });

module.exports = mongoose.model('CampaignPlan', campaignPlanSchema);
