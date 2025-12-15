const mongoose = require('mongoose');

const competitorPostSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok'],
    required: true
  },
  postUrl: String,
  content: String,
  imageUrl: String,
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral'
  },
  postedAt: Date,
  fetchedAt: {
    type: Date,
    default: Date.now
  }
});

const competitorSchema = new mongoose.Schema({
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
  website: String,
  industry: String,
  socialHandles: {
    instagram: String,
    facebook: String,
    twitter: String,
    linkedin: String,
    youtube: String,
    tiktok: String
  },
  logo: String,
  description: String,
  posts: [competitorPostSchema],
  analysis: {
    strengths: [String],
    weaknesses: [String],
    opportunities: [String],
    threats: [String],
    lastAnalyzedAt: Date
  },
  metrics: {
    avgEngagement: { type: Number, default: 0 },
    postFrequency: String,
    topPerformingContent: String,
    audienceSize: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
competitorSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Competitor', competitorSchema);
