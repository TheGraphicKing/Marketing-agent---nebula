/**
 * Competitor Routes
 * Add, fetch, and analyze competitors
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Competitor = require('../models/Competitor');
const User = require('../models/User');

/**
 * GET /api/competitors
 * Get all competitors for the user
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { active } = req.query;
    
    const query = { userId };
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    const competitors = await Competitor.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      competitors
    });
  } catch (error) {
    console.error('Get competitors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch competitors', error: error.message });
  }
});

/**
 * GET /api/competitors/posts
 * Get all competitor posts (for the feed)
 */
router.get('/posts', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { platform, sentiment, days = 7 } = req.query;
    
    const competitors = await Competitor.find({ userId, isActive: true });
    
    // Flatten all posts from all competitors
    let allPosts = [];
    competitors.forEach(competitor => {
      if (competitor.posts && competitor.posts.length > 0) {
        competitor.posts.forEach(post => {
          allPosts.push({
            id: post._id,
            competitorId: competitor._id,
            competitorName: competitor.name,
            competitorLogo: competitor.logo || competitor.name.charAt(0).toUpperCase(),
            platform: post.platform,
            content: post.content,
            imageUrl: post.imageUrl,
            postUrl: post.postUrl,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            sentiment: post.sentiment,
            postedAt: post.postedAt,
            fetchedAt: post.fetchedAt
          });
        });
      }
    });
    
    // Filter by platform if specified
    if (platform) {
      allPosts = allPosts.filter(p => p.platform === platform);
    }
    
    // Filter by sentiment if specified
    if (sentiment) {
      allPosts = allPosts.filter(p => p.sentiment === sentiment);
    }
    
    // Sort by posted date (most recent first)
    allPosts.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    
    // Format postedAt for display
    allPosts = allPosts.map(post => ({
      ...post,
      postedAt: formatTimeAgo(post.postedAt)
    }));
    
    res.json({
      success: true,
      posts: allPosts
    });
  } catch (error) {
    console.error('Get competitor posts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts', error: error.message });
  }
});

/**
 * POST /api/competitors
 * Add a new competitor
 */
router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const competitorData = {
      ...req.body,
      userId
    };
    
    const competitor = new Competitor(competitorData);
    await competitor.save();
    
    // Also add to user's businessProfile competitors list
    await User.findByIdAndUpdate(userId, {
      $addToSet: { 'businessProfile.competitors': req.body.name }
    });
    
    res.status(201).json({ success: true, competitor });
  } catch (error) {
    console.error('Add competitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to add competitor', error: error.message });
  }
});

/**
 * POST /api/competitors/:id/posts
 * Add a post to a competitor (manual entry)
 */
router.post('/:id/posts', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const competitor = await Competitor.findOne({ _id: req.params.id, userId });
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    const postData = {
      ...req.body,
      fetchedAt: new Date()
    };
    
    competitor.posts.push(postData);
    await competitor.save();
    
    res.json({ success: true, competitor });
  } catch (error) {
    console.error('Add post error:', error);
    res.status(500).json({ success: false, message: 'Failed to add post', error: error.message });
  }
});

/**
 * PUT /api/competitors/:id
 * Update a competitor
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const competitor = await Competitor.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    res.json({ success: true, competitor });
  } catch (error) {
    console.error('Update competitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to update competitor', error: error.message });
  }
});

/**
 * DELETE /api/competitors/:id
 * Delete a competitor
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const competitor = await Competitor.findOneAndDelete({ _id: req.params.id, userId });
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    res.json({ success: true, message: 'Competitor deleted' });
  } catch (error) {
    console.error('Delete competitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete competitor', error: error.message });
  }
});

/**
 * POST /api/competitors/seed-sample
 * Seed sample competitor data for demo purposes
 */
router.post('/seed-sample', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    // Check if user already has competitors
    const existingCount = await Competitor.countDocuments({ userId });
    if (existingCount > 0) {
      return res.json({ success: true, message: 'Sample data already exists' });
    }
    
    // Sample competitors with posts
    const sampleCompetitors = [
      {
        userId,
        name: 'TechFlow AI',
        industry: 'Technology',
        website: 'https://techflow.ai',
        socialHandles: {
          instagram: '@techflow_ai',
          twitter: '@techflowai',
          linkedin: 'techflow-ai'
        },
        logo: 'T',
        posts: [
          {
            platform: 'twitter',
            content: 'Excited to announce our new AI-powered analytics dashboard! 📊 Transform your data into actionable insights. #AI #Analytics',
            likes: 245,
            comments: 32,
            sentiment: 'positive',
            postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            platform: 'instagram',
            content: 'Behind the scenes at our product launch event 🚀 Thank you to everyone who joined us!',
            likes: 892,
            comments: 67,
            sentiment: 'positive',
            postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        userId,
        name: 'MarketPro Solutions',
        industry: 'Marketing',
        website: 'https://marketpro.io',
        socialHandles: {
          instagram: '@marketpro',
          twitter: '@marketprohq',
          linkedin: 'marketpro-solutions'
        },
        logo: 'M',
        posts: [
          {
            platform: 'instagram',
            content: 'New case study: How we helped a startup increase conversions by 340% in just 3 months! Link in bio 📈',
            likes: 567,
            comments: 45,
            sentiment: 'positive',
            postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
          },
          {
            platform: 'twitter',
            content: 'Marketing tip: Focus on customer pain points, not features. Your audience wants solutions! #MarketingTips',
            likes: 189,
            comments: 23,
            sentiment: 'neutral',
            postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
          }
        ]
      },
      {
        userId,
        name: 'Growth Labs',
        industry: 'Business',
        website: 'https://growthlabs.co',
        socialHandles: {
          instagram: '@growthlabs',
          twitter: '@growth_labs',
          linkedin: 'growth-labs'
        },
        logo: 'G',
        posts: [
          {
            platform: 'linkedin',
            content: 'We\'re hiring! Looking for passionate marketers to join our growing team. DM us for details. #Hiring #Marketing',
            likes: 324,
            comments: 56,
            sentiment: 'neutral',
            postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
          }
        ]
      }
    ];
    
    await Competitor.insertMany(sampleCompetitors);
    
    res.json({ success: true, message: 'Sample competitors added', count: sampleCompetitors.length });
  } catch (error) {
    console.error('Seed sample error:', error);
    res.status(500).json({ success: false, message: 'Failed to seed sample data', error: error.message });
  }
});

// Helper function to format time ago
function formatTimeAgo(date) {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

module.exports = router;
