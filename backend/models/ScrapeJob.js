/**
 * Scrape Job Model
 * Tracks all scraping operations with status and results
 */

const mongoose = require('mongoose');

const scrapeJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Job Type
  jobType: {
    type: String,
    enum: ['brand_analysis', 'competitor_analysis', 'news_search', 'trend_discovery', 'rss_fetch', 'content_research'],
    required: true
  },
  
  // URLs to scrape
  urls: [{
    url: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'blocked'],
      default: 'pending'
    },
    error: String,
    errorType: String,
    scrapedAt: Date,
    sourceId: String,
    cached: Boolean,
    durationMs: Number
  }],
  
  // Overall Status
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'partial', 'failed'],
    default: 'queued'
  },
  
  // Progress
  progress: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  
  // Timing
  startedAt: Date,
  completedAt: Date,
  
  // Results Summary
  results: {
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    blockedCount: { type: Number, default: 0 },
    cachedCount: { type: Number, default: 0 },
    totalDurationMs: Number,
    dataSourceIds: [String]
  },
  
  // Error Info
  error: String,
  
  // Related Entity
  relatedEntity: {
    type: { type: String, enum: ['brand', 'competitor', 'campaign', 'content'] },
    id: mongoose.Schema.Types.ObjectId
  },
  
  // Retry Info
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  nextRetryAt: Date
  
}, {
  timestamps: true
});

// Indexes
scrapeJobSchema.index({ userId: 1, status: 1 });
scrapeJobSchema.index({ createdAt: 1 });
scrapeJobSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });

module.exports = mongoose.model('ScrapeJob', scrapeJobSchema);
