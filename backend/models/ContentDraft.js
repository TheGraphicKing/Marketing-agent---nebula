/**
 * Content Draft Model
 * Stores AI-generated content with variants
 */

const mongoose = require('mongoose');

const contentDraftSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Content Info
  title: {
    type: String,
    required: true
  },
  
  // Platform
  platform: {
    type: String,
    enum: ['linkedin', 'instagram', 'twitter', 'facebook', 'tiktok', 'youtube', 'blog', 'email'],
    required: true
  },
  
  // Content Type
  contentType: {
    type: String,
    enum: ['post', 'story', 'reel', 'article', 'thread', 'carousel', 'video_script', 'email'],
    default: 'post'
  },
  
  // Topic & Objective
  topic: {
    type: String,
    required: true
  },
  objective: {
    type: String,
    enum: ['awareness', 'engagement', 'leads', 'sales', 'traffic', 'community'],
    default: 'engagement'
  },
  
  // Tone & Style
  tone: {
    type: String,
    default: 'professional'
  },
  cta: String, // Call to action
  
  // Variants (Grok-generated)
  variants: [{
    content: String,
    version: Number,
    provider: { type: String, enum: ['gemini', 'grok'] },
    modifiers: [String], // e.g., ['shorten', 'add_humor']
    createdAt: { type: Date, default: Date.now },
    selected: { type: Boolean, default: false },
    feedback: {
      rating: Number,
      comment: String
    }
  }],
  
  // Long-form version (Gemini-generated)
  longFormContent: {
    content: String,
    wordCount: Number,
    sections: [{
      heading: String,
      content: String
    }],
    generatedAt: Date
  },
  
  // Hashtags (Gemini-generated)
  hashtags: {
    suggested: [String],
    categories: {
      highVolume: [String],
      niche: [String],
      trending: [String],
      branded: [String]
    },
    generatedAt: Date
  },
  
  // Compliance Check
  compliance: {
    isCompliant: Boolean,
    issues: [{
      type: String,
      description: String,
      severity: { type: String, enum: ['critical', 'warning', 'info'] }
    }],
    suggestions: [String],
    riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
    checkedAt: Date
  },
  
  // Selected/Final Content
  selectedVariantIndex: Number,
  finalContent: String,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'reviewing', 'approved', 'scheduled', 'published', 'archived'],
    default: 'draft'
  },
  
  // Related Entities
  relatedBrand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BrandProfile'
  },
  relatedCampaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  
  // Citations for any facts/claims
  citations: [{
    claim: String,
    source: String,
    url: String,
    verified: Boolean
  }],
  
  // Scheduling
  scheduledFor: Date,
  publishedAt: Date
  
}, {
  timestamps: true
});

// Indexes
contentDraftSchema.index({ userId: 1, status: 1 });
contentDraftSchema.index({ userId: 1, platform: 1 });
contentDraftSchema.index({ relatedCampaign: 1 });

module.exports = mongoose.model('ContentDraft', contentDraftSchema);
