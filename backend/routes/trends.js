/**
 * Trend Discovery Routes
 * Real trend discovery from public sources + SearchAPI
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Trend = require('../models/Trend');
const BrandProfile = require('../models/BrandProfile');
const { searchNews, fetchRSS } = require('../services/scraper');
const { clusterTopics, brainstormIdeas, generateWithLLM } = require('../services/llmRouter');

// Import SearchAPI for real-time trends
const { searchGoogle, getGoogleTrends, getTrendingTopics, searchIndustryNews } = require('../services/socialMediaAPI');

// RSS feeds for different industries
const INDUSTRY_FEEDS = {
  technology: [
    'https://techcrunch.com/feed/',
    'https://feeds.arstechnica.com/arstechnica/technology-lab',
    'https://www.theverge.com/rss/index.xml'
  ],
  marketing: [
    'https://feeds.feedburner.com/Mashable',
    'https://contentmarketinginstitute.com/feed/'
  ],
  business: [
    'https://feeds.bloomberg.com/markets/news.rss',
    'https://www.entrepreneur.com/latest.rss'
  ],
  ecommerce: [
    'https://www.shopify.com/blog.atom',
    'https://www.practicalecommerce.com/feed'
  ],
  health: [
    'https://www.health.harvard.edu/blog/feed',
    'https://www.medicalnewstoday.com/rss/news'
  ],
  finance: [
    'https://feeds.bloomberg.com/markets/news.rss',
    'https://www.cnbc.com/id/100003114/device/rss/rss.html'
  ]
};

/**
 * GET /api/trends/real-time
 * Get real-time trends using SearchAPI (priority endpoint)
 */
router.get('/real-time', protect, async (req, res) => {
  try {
    const { query, category = 'marketing', location = 'us' } = req.query;
    
    // Use SearchAPI for real-time trend data
    const searchQuery = query || `${category} trends 2025`;
    
    const [trendsResult, trendingTopics] = await Promise.all([
      searchGoogle(searchQuery, { num: 10 }),
      getTrendingTopics(category)
    ]);
    
    // Process the results
    const formattedTrends = [];
    
    // Add search-based trends
    if (trendsResult.results) {
      trendsResult.results.forEach((item, idx) => {
        formattedTrends.push({
          id: `search-${idx}`,
          title: item.title,
          description: item.snippet || item.description,
          source: item.source || item.displayLink,
          url: item.link,
          type: 'search',
          relevanceScore: 100 - (idx * 5),
          fetchedAt: new Date()
        });
      });
    }
    
    // Add trending topics
    if (trendingTopics.topics) {
      trendingTopics.topics.forEach((topic, idx) => {
        formattedTrends.push({
          id: `trending-${idx}`,
          title: topic.title || topic.query,
          description: topic.description || `Trending in ${category}`,
          source: 'Google Trends',
          url: topic.link || `https://trends.google.com/trends/explore?q=${encodeURIComponent(topic.query || topic.title)}`,
          type: 'trending',
          trendScore: topic.formattedTraffic || topic.traffic,
          fetchedAt: new Date()
        });
      });
    }
    
    res.json({
      success: true,
      query: searchQuery,
      category,
      location,
      trends: formattedTrends,
      raw: {
        search: trendsResult,
        trending: trendingTopics
      },
      fetchedAt: new Date()
    });
  } catch (error) {
    console.error('Real-time trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time trends',
      error: error.message
    });
  }
});

/**
 * GET /api/trends/social-search
 * Search for trends on social media platforms
 */
router.get('/social-search', protect, async (req, res) => {
  try {
    const { query, platform = 'twitter' } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
    }
    
    // Use searchGoogle as a fallback for now
    const results = await searchGoogle(`${query} ${platform} social media`, { num: 10 });
    
    res.json({
      success: true,
      query,
      platform,
      results,
      fetchedAt: new Date()
    });
  } catch (error) {
    console.error('Social search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search social media',
      error: error.message
    });
  }
});

/**
 * GET /api/trends/discover
 * Discover trends based on industry/keywords
 */
router.get('/discover', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { industry, keywords, brandId } = req.query;
    
    let searchTerms = [];
    let brandProfile = null;
    
    // Get brand context if provided
    if (brandId) {
      brandProfile = await BrandProfile.findOne({ _id: brandId, userId });
      if (brandProfile) {
        searchTerms.push(brandProfile.industry);
        searchTerms.push(brandProfile.niche);
        searchTerms.push(...(brandProfile.marketingGoals || []));
      }
    }
    
    // Add explicit search terms
    if (industry) searchTerms.push(industry);
    if (keywords) searchTerms.push(...keywords.split(',').map(k => k.trim()));
    
    // Default to marketing trends
    if (searchTerms.length === 0) {
      searchTerms = ['marketing trends 2025', 'digital marketing', 'social media marketing'];
    }
    
    const allTrends = [];
    const sources = [];
    
    // Fetch from Google News RSS for each term
    for (const term of searchTerms.slice(0, 3)) { // Limit to 3 terms
      const newsResult = await searchNews(term, { limit: 10 });
      
      if (newsResult.success) {
        sources.push({
          type: 'news_search',
          query: term,
          sourceId: newsResult.sourceId,
          fetchedAt: newsResult.fetchedAt
        });
        
        for (const item of newsResult.items) {
          allTrends.push({
            title: item.title,
            source: item.source,
            url: item.link,
            publishedAt: item.publishedAt,
            searchTerm: term
          });
        }
      }
    }
    
    // Try RSS feeds for the industry
    const industryKey = (industry || brandProfile?.industry || 'marketing').toLowerCase();
    const feeds = INDUSTRY_FEEDS[industryKey] || INDUSTRY_FEEDS.marketing;
    
    for (const feedUrl of feeds.slice(0, 2)) { // Limit to 2 feeds
      try {
        const rssResult = await fetchRSS(feedUrl);
        
        if (rssResult.success) {
          sources.push({
            type: 'rss',
            url: feedUrl,
            sourceId: rssResult.sourceId,
            fetchedAt: rssResult.fetchedAt
          });
          
          for (const item of rssResult.items.slice(0, 5)) {
            allTrends.push({
              title: item.title,
              description: item.description,
              source: new URL(feedUrl).hostname,
              url: item.link,
              publishedAt: item.publishedAt
            });
          }
        }
      } catch (err) {
        console.error(`RSS fetch failed for ${feedUrl}:`, err.message);
      }
    }
    
    if (allTrends.length === 0) {
      return res.json({
        success: true,
        trends: [],
        clusters: [],
        sources: [],
        message: 'No trends found. Try different keywords.'
      });
    }
    
    // Cluster the trends using Gemini
    const clusterResult = await clusterTopics(allTrends.map(t => ({
      title: t.title,
      source: t.source
    })));
    
    // Generate content angles using Grok
    const contentAngles = await brainstormIdeas(
      `Industry: ${industryKey}\nTrending topics: ${allTrends.slice(0, 10).map(t => t.title).join(', ')}`,
      5
    );
    
    // Save trends to database
    const savedTrends = [];
    const clusters = clusterResult.clusters || [];
    
    for (let i = 0; i < Math.min(allTrends.length, 20); i++) {
      const t = allTrends[i];
      const clusterIndex = i % (clusters.length || 1);
      
      const trend = new Trend({
        userId,
        title: t.title,
        description: t.description || '',
        category: industryKey,
        industry: industryKey,
        cluster: clusters[clusterIndex]?.name || 'General',
        sources: [{
          url: t.url,
          title: t.title,
          source: t.source,
          publishedAt: t.publishedAt ? new Date(t.publishedAt) : new Date(),
          fetchedAt: new Date()
        }],
        analysis: {
          contentAngles: contentAngles.ideas?.slice(0, 3) || [],
          analyzedAt: new Date(),
          generatedBy: 'gemini'
        },
        relatedBrand: brandProfile?._id,
        status: 'active'
      });
      
      try {
        await trend.save();
        savedTrends.push(trend);
      } catch (err) {
        // Might be duplicate, skip
      }
    }
    
    // Generate "what to post this week" plan
    const weekPlan = await generateWithLLM({
      provider: 'gemini',
      taskType: 'content_planning',
      prompt: `Based on these trending topics, create a "what to post this week" content plan:

Trends: ${allTrends.slice(0, 10).map(t => t.title).join('\n')}
Industry: ${industryKey}
${brandProfile ? `Brand: ${brandProfile.name}` : ''}

Create a 5-day posting plan with specific content ideas for each day.`,
      jsonSchema: {
        required: ['weekPlan'],
        properties: {
          weekPlan: { type: 'array' }
        }
      }
    });
    
    res.json({
      success: true,
      trends: savedTrends.map(t => ({
        id: t._id,
        title: t.title,
        description: t.description,
        category: t.category,
        cluster: t.cluster,
        sources: t.sources,
        contentAngles: t.analysis.contentAngles
      })),
      clusters: clusters,
      contentPillars: clusters.map(c => c.name || c),
      weekPlan: weekPlan.weekPlan || [],
      sources: sources,
      dataFreshness: {
        fetchedAt: new Date().toISOString(),
        expiresIn: '24 hours'
      }
    });
    
  } catch (error) {
    console.error('Trend discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorType: 'discovery_failed'
    });
  }
});

/**
 * GET /api/trends/list
 * Get saved trends for user
 */
router.get('/list', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status = 'active', category, limit = 50 } = req.query;
    
    const query = { userId, status };
    if (category) query.category = category;
    
    const trends = await Trend.find(query)
      .sort({ lastSeenAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      trends: trends.map(t => ({
        id: t._id,
        title: t.title,
        description: t.description,
        category: t.category,
        cluster: t.cluster,
        sources: t.sources,
        contentIdeas: t.contentIdeas,
        firstSeenAt: t.firstSeenAt,
        lastSeenAt: t.lastSeenAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends/:id
 * Get single trend with full details
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const trend = await Trend.findOne({ _id: req.params.id, userId });
    
    if (!trend) {
      return res.status(404).json({ success: false, error: 'Trend not found' });
    }
    
    res.json({ success: true, trend });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trends/:id/content-ideas
 * Generate content ideas for a trend (using Grok)
 */
router.post('/:id/content-ideas', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { platform, count = 5 } = req.body;
    
    const trend = await Trend.findOne({ _id: req.params.id, userId });
    
    if (!trend) {
      return res.status(404).json({ success: false, error: 'Trend not found' });
    }
    
    // Generate creative content ideas with Grok
    const ideas = await brainstormIdeas(
      `Trend: ${trend.title}
Description: ${trend.description}
Category: ${trend.category}
Platform: ${platform || 'multiple platforms'}

Generate bold, creative content ideas that capitalize on this trend.`,
      count
    );
    
    // Save ideas to trend
    const newIdeas = (ideas.ideas || []).map(idea => ({
      idea: typeof idea === 'string' ? idea : idea.title || idea.idea,
      platform: platform || 'multiple',
      format: idea.format || 'post',
      hook: idea.hook || '',
      generatedAt: new Date()
    }));
    
    trend.contentIdeas = [...(trend.contentIdeas || []), ...newIdeas];
    await trend.save();
    
    res.json({
      success: true,
      contentIdeas: newIdeas,
      generatedBy: 'grok'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trends/:id/dismiss
 * Dismiss/archive a trend
 */
router.post('/:id/dismiss', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const trend = await Trend.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status: 'archived' },
      { new: true }
    );
    
    if (!trend) {
      return res.status(404).json({ success: false, error: 'Trend not found' });
    }
    
    res.json({ success: true, message: 'Trend dismissed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/trends/:id
 * Delete a trend
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const result = await Trend.findOneAndDelete({ _id: req.params.id, userId });
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Trend not found' });
    }
    
    res.json({ success: true, message: 'Trend deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
