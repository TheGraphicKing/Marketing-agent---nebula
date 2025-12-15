const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
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
  objective: {
    type: String,
    enum: ['awareness', 'engagement', 'traffic', 'sales', 'conversion'],
    default: 'awareness'
  },
  platforms: [{
    type: String,
    enum: ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest']
  }],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'posted', 'paused', 'archived'],
    default: 'draft'
  },
  creative: {
    type: {
      type: String,
      enum: ['image', 'video', 'carousel', 'story', 'text'],
      default: 'image'
    },
    textContent: String,
    imageUrls: [String],
    videoUrl: String,
    captions: String,
    hashtags: [String]
  },
  scheduling: {
    startDate: Date,
    endDate: Date,
    postTime: String,
    timezone: {
      type: String,
      default: 'UTC'
    },
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'custom'],
      default: 'once'
    }
  },
  targeting: {
    ageRange: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 65 }
    },
    gender: {
      type: String,
      enum: ['all', 'male', 'female'],
      default: 'all'
    },
    locations: [String],
    interests: [String]
  },
  budget: {
    total: { type: Number, default: 0 },
    daily: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  performance: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    spend: { type: Number, default: 0 }
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiSuggestions: {
    caption: String,
    hashtags: [String],
    bestTime: String,
    estimatedReach: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
campaignSchema.index({ userId: 1, status: 1 });
campaignSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Campaign', campaignSchema);
