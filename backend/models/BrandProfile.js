/**
 * Brand Profile Model
 * Stores analyzed brand data from website scraping
 */

const mongoose = require('mongoose');

const brandProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Source Information
  websiteUrl: {
    type: String,
    required: true
  },
  
  // Basic Info
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  tagline: String,
  
  // Categorization
  industry: String,
  niche: String,
  category: String,
  
  // Target
  targetRegion: String,
  targetCustomer: String,
  targetAudience: {
    demographics: [String],
    psychographics: [String],
    painPoints: [String],
    goals: [String]
  },
  
  // Brand Identity
  brandVoice: {
    type: String,
    default: 'Professional'
  },
  brandPersonality: [String],
  valuePropositions: [String],
  uniqueSellingPoints: [String],
  
  // Products/Services
  products: [{
    name: String,
    description: String,
    category: String
  }],
  services: [{
    name: String,
    description: String
  }],
  
  // Pricing
  pricingModel: String,
  pricingTiers: [{
    name: String,
    price: String,
    features: [String]
  }],
  
  // Social Presence
  socialHandles: {
    instagram: String,
    facebook: String,
    twitter: String,
    linkedin: String,
    youtube: String,
    tiktok: String
  },
  
  // Competitors
  competitors: [{
    name: String,
    url: String,
    analyzed: { type: Boolean, default: false }
  }],
  
  // Budget & Goals
  marketingBudget: {
    monthly: Number,
    currency: { type: String, default: 'USD' }
  },
  marketingGoals: [String],
  
  // Analysis Metadata
  scrapedPages: [{
    url: String,
    page: String,
    scrapedAt: Date,
    sourceId: String
  }],
  
  analysisStatus: {
    type: String,
    enum: ['pending', 'analyzing', 'completed', 'failed'],
    default: 'pending'
  },
  analysisError: String,
  lastAnalyzedAt: Date,
  
  // AI Analysis Results
  aiInsights: {
    strengths: [String],
    weaknesses: [String],
    opportunities: [String],
    threats: [String],
    recommendations: [String]
  },
  
  // Data freshness
  dataFreshness: {
    lastUpdated: { type: Date, default: Date.now },
    staleDays: { type: Number, default: 7 }
  }
}, {
  timestamps: true
});

// Indexes
brandProfileSchema.index({ userId: 1, websiteUrl: 1 }, { unique: true });
brandProfileSchema.index({ 'dataFreshness.lastUpdated': 1 });

module.exports = mongoose.model('BrandProfile', brandProfileSchema);
