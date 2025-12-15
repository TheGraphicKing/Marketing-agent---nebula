/**
 * Campaign Routes
 * Full CRUD for marketing campaigns
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Campaign = require('../models/Campaign');

/**
 * GET /api/campaigns
 * Get all campaigns for the user with optional filters
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, platform, startDate, endDate, limit = 50 } = req.query;
    const userId = req.user.userId || req.user.id;
    
    // Build query
    const query = { userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (platform) {
      query.platforms = { $in: [platform] };
    }
    
    if (startDate || endDate) {
      query['scheduling.startDate'] = {};
      if (startDate) query['scheduling.startDate'].$gte = new Date(startDate);
      if (endDate) query['scheduling.startDate'].$lte = new Date(endDate);
    }
    
    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Get counts by status
    const mongoose = require('mongoose');
    const statusCounts = await Campaign.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const counts = {
      all: 0,
      draft: 0,
      scheduled: 0,
      active: 0,
      posted: 0,
      archived: 0
    };
    
    statusCounts.forEach(s => {
      counts[s._id] = s.count;
      counts.all += s.count;
    });
    
    res.json({
      success: true,
      campaigns,
      counts
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns', error: error.message });
  }
});

/**
 * GET /api/campaigns/:id
 * Get a single campaign by ID
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const campaign = await Campaign.findOne({ _id: req.params.id, userId });
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    res.json({ success: true, campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch campaign', error: error.message });
  }
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const campaignData = {
      ...req.body,
      userId
    };
    
    const campaign = new Campaign(campaignData);
    await campaign.save();
    
    res.status(201).json({ success: true, campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to create campaign', error: error.message });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update an existing campaign
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    res.json({ success: true, campaign });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to update campaign', error: error.message });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, userId });
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete campaign', error: error.message });
  }
});

/**
 * POST /api/campaigns/:id/post
 * Post/publish a campaign
 */
router.post('/:id/post', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, userId },
      { 
        $set: { 
          status: 'posted',
          'scheduling.startDate': new Date()
        } 
      },
      { new: true }
    );
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    res.json({ success: true, campaign, message: 'Campaign posted successfully' });
  } catch (error) {
    console.error('Post campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to post campaign', error: error.message });
  }
});

/**
 * POST /api/campaigns/:id/archive
 * Archive a campaign
 */
router.post('/:id/archive', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: { status: 'archived' } },
      { new: true }
    );
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    res.json({ success: true, campaign, message: 'Campaign archived' });
  } catch (error) {
    console.error('Archive campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to archive campaign', error: error.message });
  }
});

/**
 * POST /api/campaigns/:id/schedule
 * Schedule a campaign
 */
router.post('/:id/schedule', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { startDate, postTime } = req.body;
    
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, userId },
      { 
        $set: { 
          status: 'scheduled',
          'scheduling.startDate': new Date(startDate),
          'scheduling.postTime': postTime
        } 
      },
      { new: true }
    );
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    res.json({ success: true, campaign, message: 'Campaign scheduled' });
  } catch (error) {
    console.error('Schedule campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule campaign', error: error.message });
  }
});

/**
 * GET /api/campaigns/analytics/overview
 * Get campaign analytics overview
 */
router.get('/analytics/overview', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { startDate, endDate } = req.query;
    
    const query = { userId };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const campaigns = await Campaign.find(query);
    
    // Aggregate performance metrics
    const totals = campaigns.reduce((acc, c) => {
      acc.impressions += c.performance?.impressions || 0;
      acc.clicks += c.performance?.clicks || 0;
      acc.engagement += c.performance?.engagement || 0;
      acc.reach += c.performance?.reach || 0;
      acc.spend += c.performance?.spend || 0;
      acc.conversions += c.performance?.conversions || 0;
      return acc;
    }, { impressions: 0, clicks: 0, engagement: 0, reach: 0, spend: 0, conversions: 0 });
    
    // Calculate averages
    const count = campaigns.length || 1;
    const avgCtr = totals.clicks / (totals.impressions || 1) * 100;
    const avgEngagementRate = totals.engagement / (totals.reach || 1) * 100;
    
    // Generate daily data for charts
    const dailyData = [];
    const days = 7;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyData.push({
        date: date.toISOString().split('T')[0],
        impressions: Math.floor(Math.random() * 1000) + (totals.impressions / days),
        clicks: Math.floor(Math.random() * 50) + (totals.clicks / days),
        spend: Math.floor(Math.random() * 100) + (totals.spend / days)
      });
    }
    
    res.json({
      success: true,
      analytics: {
        totals,
        averages: {
          ctr: avgCtr.toFixed(2),
          engagementRate: avgEngagementRate.toFixed(2)
        },
        campaignCount: campaigns.length,
        dailyData
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
});

module.exports = router;
