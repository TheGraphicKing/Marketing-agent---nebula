/**
 * Analytics Snapshot Model
 * Stores imported/connected analytics data
 */

const mongoose = require('mongoose');

const analyticsSnapshotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Source
  source: {
    type: {
      type: String,
      enum: ['csv_import', 'google_analytics', 'meta_ads', 'linkedin_ads', 'twitter_ads', 'manual'],
      required: true
    },
    name: String,
    accountId: String,
    importedAt: { type: Date, default: Date.now }
  },
  
  // Date Range
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  
  // Traffic Metrics
  traffic: {
    sessions: Number,
    users: Number,
    newUsers: Number,
    pageViews: Number,
    pagesPerSession: Number,
    avgSessionDuration: Number, // seconds
    bounceRate: Number // percentage
  },
  
  // Acquisition Metrics
  acquisition: {
    byChannel: [{
      channel: String, // organic, paid, social, referral, direct, email
      sessions: Number,
      users: Number,
      conversions: Number,
      revenue: Number
    }],
    bySource: [{
      source: String,
      medium: String,
      sessions: Number,
      conversions: Number
    }],
    byCampaign: [{
      campaign: String,
      clicks: Number,
      impressions: Number,
      spend: Number,
      conversions: Number
    }]
  },
  
  // Engagement Metrics
  engagement: {
    likes: Number,
    comments: Number,
    shares: Number,
    saves: Number,
    clicks: Number,
    impressions: Number,
    reach: Number,
    engagementRate: Number // percentage
  },
  
  // Conversion Metrics
  conversions: {
    totalConversions: Number,
    conversionRate: Number, // percentage
    byGoal: [{
      goalName: String,
      completions: Number,
      value: Number
    }],
    leads: Number,
    sales: Number,
    signups: Number
  },
  
  // Revenue Metrics
  revenue: {
    totalRevenue: Number,
    currency: { type: String, default: 'USD' },
    transactions: Number,
    avgOrderValue: Number,
    revenueByChannel: [{
      channel: String,
      revenue: Number
    }]
  },
  
  // Ad Performance
  advertising: {
    totalSpend: Number,
    impressions: Number,
    clicks: Number,
    ctr: Number, // click-through rate
    cpc: Number, // cost per click
    cpm: Number, // cost per mille
    conversions: Number,
    cpa: Number, // cost per acquisition
    roas: Number, // return on ad spend
    byCampaign: [{
      campaignId: String,
      campaignName: String,
      spend: Number,
      impressions: Number,
      clicks: Number,
      conversions: Number,
      revenue: Number
    }]
  },
  
  // Computed KPIs
  kpis: {
    ctr: Number, // Click-through rate
    cac: Number, // Customer acquisition cost
    conversionRate: Number,
    engagementRate: Number,
    roas: Number,
    ltv: Number, // Lifetime value (if available)
    customKpis: [{
      name: String,
      value: Number,
      formula: String
    }]
  },
  
  // AI-Generated Insights
  insights: [{
    type: { type: String, enum: ['observation', 'recommendation', 'warning', 'opportunity'] },
    title: String,
    description: String,
    metric: String,
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    generatedBy: String,
    generatedAt: Date
  }],
  
  // Actions (Grok-generated)
  suggestedActions: [{
    title: String,
    description: String,
    expectedImpact: String,
    effort: { type: String, enum: ['low', 'medium', 'high'] },
    priority: Number,
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'dismissed'], default: 'pending' }
  }],
  
  // Related Campaign
  relatedCampaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  
  // Raw Data (for reference)
  rawData: mongoose.Schema.Types.Mixed,
  
  // Processing Status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: String
  
}, {
  timestamps: true
});

// Indexes
analyticsSnapshotSchema.index({ userId: 1, 'dateRange.start': -1 });
analyticsSnapshotSchema.index({ userId: 1, 'source.type': 1 });
analyticsSnapshotSchema.index({ relatedCampaign: 1 });

// Virtual for date range string
analyticsSnapshotSchema.virtual('dateRangeString').get(function() {
  return `${this.dateRange.start.toISOString().split('T')[0]} to ${this.dateRange.end.toISOString().split('T')[0]}`;
});

module.exports = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
