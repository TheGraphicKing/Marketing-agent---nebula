/**
 * Insight Model
 * Stores all AI-generated insights with citations
 */

const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Insight Type
  type: {
    type: String,
    enum: [
      'brand_analysis',
      'competitor_comparison',
      'trend_discovery',
      'content_suggestion',
      'strategy_recommendation',
      'performance_insight',
      'opportunity',
      'warning',
      'action_item'
    ],
    required: true
  },
  
  // Category/Topic
  category: String,
  topic: String,
  
  // Content
  title: {
    type: String,
    required: true
  },
  summary: String,
  content: mongoose.Schema.Types.Mixed, // Can be string or structured object
  
  // Priority/Importance
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.7
  },
  
  // Citations - IMPORTANT: Every insight must have sources
  citations: [{
    url: { type: String, required: true },
    title: String,
    snippet: String,
    sourceId: String,
    fetchedAt: Date
  }],
  
  // Related Entities
  relatedBrand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BrandProfile'
  },
  relatedCompetitors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Competitor'
  }],
  relatedCampaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  
  // AI Generation Info
  generatedBy: {
    provider: { type: String, enum: ['gemini', 'grok'] },
    taskType: String,
    promptHash: String // For deduplication
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'dismissed', 'actioned', 'expired'],
    default: 'active'
  },
  dismissedAt: Date,
  actionedAt: Date,
  expiresAt: Date,
  
  // User Feedback
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    helpful: Boolean,
    comment: String
  },
  
  // Data Freshness
  dataFreshness: {
    generatedAt: { type: Date, default: Date.now },
    basedOnDataFrom: Date,
    staleAfterDays: { type: Number, default: 7 }
  }
  
}, {
  timestamps: true
});

// Indexes
insightSchema.index({ userId: 1, type: 1, status: 1 });
insightSchema.index({ userId: 1, createdAt: -1 });
insightSchema.index({ 'dataFreshness.generatedAt': 1 });
insightSchema.index({ relatedBrand: 1 });

// Virtual for checking if stale
insightSchema.virtual('isStale').get(function() {
  const staleMs = this.dataFreshness.staleAfterDays * 24 * 60 * 60 * 1000;
  return Date.now() - this.dataFreshness.generatedAt > staleMs;
});

module.exports = mongoose.model('Insight', insightSchema);
