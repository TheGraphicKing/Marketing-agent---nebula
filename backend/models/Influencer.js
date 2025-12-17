const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  handle: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'linkedin'],
    default: 'instagram'
  },
  profileImage: String,
  profileUrl: String,
  bio: String,
  type: {
    type: String,
    enum: ['nano', 'micro', 'mid-tier', 'macro', 'mega', 'celebrity'],
    default: 'micro'
  },
  niche: [String],
  followerCount: {
    type: Number,
    default: 0
  },
  reach: {
    type: Number,
    default: 0
  },
  engagementRate: {
    type: Number,
    default: 0
  },
  avgLikes: {
    type: Number,
    default: 0
  },
  avgComments: {
    type: Number,
    default: 0
  },
  avgViews: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  priceRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  contactEmail: String,
  aiMatchScore: {
    score: { type: Number, default: 0 },
    reason: String,
    factors: [{
      name: String,
      score: Number,
      max: Number
    }],
    calculatedAt: Date
  },
  pastCollaborations: [{
    brandName: String,
    campaignName: String,
    date: Date,
    performance: {
      reach: Number,
      engagement: Number,
      conversions: Number
    }
  }],
  status: {
    type: String,
    enum: ['discovered', 'contacted', 'negotiating', 'confirmed', 'completed', 'rejected'],
    default: 'discovered'
  },
  notes: String,
  isFavorite: {
    type: Boolean,
    default: false
  },
  // New fields for scraped influencers
  scrapedFromSocial: {
    type: Boolean,
    default: false
  },
  scrapedAt: Date
}, {
  timestamps: true
});

// Index for efficient queries
influencerSchema.index({ userId: 1, status: 1 });
influencerSchema.index({ userId: 1, 'aiMatchScore.score': -1 });
influencerSchema.index({ userId: 1, scrapedFromSocial: 1 });
influencerSchema.index({ userId: 1, followerCount: -1 });
influencerSchema.index({ userId: 1, engagementRate: -1 });

module.exports = mongoose.model('Influencer', influencerSchema);
