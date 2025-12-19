/**
 * Trend Model
 * Stores discovered trends from real sources
 */

const mongoose = require('mongoose');

const trendSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Can be global (no userId) or user-specific
  isGlobal: {
    type: Boolean,
    default: false
  },
  
  // Trend Info
  title: {
    type: String,
    required: true
  },
  description: String,
  
  // Categorization
  category: String,
  industry: String,
  cluster: String, // AI-assigned cluster
  
  // Sources (REQUIRED - no fake trends)
  sources: [{
    url: {
      type: String,
      required: true
    },
    title: String,
    snippet: String,
    source: String, // e.g., "TechCrunch", "Google News"
    publishedAt: Date,
    fetchedAt: { type: Date, default: Date.now },
    sourceId: String
  }],
  
  // Metrics
  metrics: {
    sourceCount: { type: Number, default: 1 },
    mentionCount: Number,
    growthRate: Number, // percentage
    peakDate: Date
  },
  
  // AI Analysis
  analysis: {
    relevanceScore: { type: Number, min: 0, max: 100 },
    sentimentScore: { type: Number, min: -1, max: 1 },
    contentAngles: [String],
    targetAudiences: [String],
    recommendedActions: [String],
    generatedBy: String,
    analyzedAt: Date
  },
  
  // Content Ideas (Grok-generated)
  contentIdeas: [{
    idea: String,
    platform: String,
    format: String,
    hook: String,
    generatedAt: Date
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'stale', 'archived'],
    default: 'active'
  },
  
  // Freshness
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: Date,
  
  // Related Brand (if user-specific)
  relatedBrand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BrandProfile'
  }
  
}, {
  timestamps: true
});

// Indexes
trendSchema.index({ category: 1, status: 1 });
trendSchema.index({ industry: 1, status: 1 });
trendSchema.index({ lastSeenAt: -1 });
trendSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Trend', trendSchema);
