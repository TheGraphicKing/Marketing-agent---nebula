/**
 * Reachouts Routes
 * 
 * Backend API routes for the Reachouts CRM module.
 * Handles leads, outreach generation, sequences, and onboarding context.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Lead = require('../models/Lead');
const OnboardingContext = require('../models/OnboardingContext');
const OutreachSequence = require('../models/OutreachSequence');
const outreachAI = require('../services/outreachAI');
const contextBuilder = require('../services/contextBuilder');

// ============================================
// ONBOARDING CONTEXT ROUTES
// ============================================

/**
 * GET /api/reachouts/context
 * Get user's onboarding context
 */
router.get('/context', protect, async (req, res) => {
  try {
    let context = await OnboardingContext.findOne({ userId: req.user._id });
    
    if (!context) {
      // Create new context if doesn't exist
      context = new OnboardingContext({ userId: req.user._id });
      await context.save();
    }
    
    const readiness = context.isReadyForOutreach();
    
    res.json({
      success: true,
      data: {
        context,
        isReady: readiness.isReady,
        missingFields: readiness.missingFields
      }
    });
  } catch (error) {
    console.error('GET /context error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch onboarding context'
    });
  }
});

/**
 * PUT /api/reachouts/context
 * Update onboarding context
 */
router.put('/context', protect, async (req, res) => {
  try {
    let context = await OnboardingContext.findOne({ userId: req.user._id });
    
    if (!context) {
      context = new OnboardingContext({ userId: req.user._id });
    }
    
    // Update fields from request body
    const updateFields = [
      'company', 'targetCustomer', 'geography', 'pricing',
      'primaryGoal', 'secondaryGoals', 'brandTone',
      'valueProposition', 'competitors', 'outreachPreferences'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        context[field] = req.body[field];
      }
    });
    
    await context.save();
    
    const readiness = context.isReadyForOutreach();
    
    res.json({
      success: true,
      data: {
        context,
        isReady: readiness.isReady,
        missingFields: readiness.missingFields
      }
    });
  } catch (error) {
    console.error('PUT /context error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update onboarding context'
    });
  }
});

/**
 * GET /api/reachouts/readiness
 * Check if user is ready for AI outreach
 */
router.get('/readiness', protect, async (req, res) => {
  try {
    const result = await outreachAI.validateReadiness(req.user._id);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('GET /readiness error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check readiness'
    });
  }
});

// ============================================
// LEADS ROUTES
// ============================================

/**
 * GET /api/reachouts/leads
 * Get all leads for user with optional filters
 */
router.get('/leads', protect, async (req, res) => {
  try {
    const { status, source, search, page = 1, limit = 50, sort = '-createdAt' } = req.query;
    
    const query = { userId: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (source) {
      query.source = source;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'company.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Lead.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('GET /leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads'
    });
  }
});

/**
 * GET /api/reachouts/leads/stats
 * Get lead statistics
 */
router.get('/leads/stats', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [statusCounts, sourceCounts, totalStats] = await Promise.all([
      Lead.aggregate([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { userId } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalEmails: { $sum: '$outreachStatus.emailsSent' },
            totalOpened: { $sum: '$outreachStatus.emailsOpened' },
            totalReplied: { $sum: '$outreachStatus.emailsReplied' }
          }
        }
      ])
    ]);
    
    const stats = totalStats[0] || { total: 0, totalEmails: 0, totalOpened: 0, totalReplied: 0 };
    
    res.json({
      success: true,
      data: {
        total: stats.total,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        bySource: sourceCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        outreach: {
          emailsSent: stats.totalEmails,
          emailsOpened: stats.totalOpened,
          emailsReplied: stats.totalReplied,
          openRate: stats.totalEmails > 0 ? ((stats.totalOpened / stats.totalEmails) * 100).toFixed(1) : 0,
          replyRate: stats.totalEmails > 0 ? ((stats.totalReplied / stats.totalEmails) * 100).toFixed(1) : 0
        }
      }
    });
  } catch (error) {
    console.error('GET /leads/stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead stats'
    });
  }
});

/**
 * GET /api/reachouts/leads/:id
 * Get single lead with full details
 */
router.get('/leads/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('GET /leads/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead'
    });
  }
});

/**
 * POST /api/reachouts/leads
 * Create a new lead
 */
router.post('/leads', protect, async (req, res) => {
  try {
    const lead = new Lead({
      userId: req.user._id,
      ...req.body
    });
    
    // Add creation activity
    lead.activities.push({
      type: 'lead_created',
      description: 'Lead was created',
      performedBy: req.user._id
    });
    
    await lead.save();
    
    res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('POST /leads error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A lead with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create lead'
    });
  }
});

/**
 * PUT /api/reachouts/leads/:id
 * Update a lead
 */
router.put('/leads/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    // Track status changes
    const oldStatus = lead.status;
    
    // Update allowed fields
    const updateFields = [
      'firstName', 'lastName', 'email', 'phone', 'linkedinUrl',
      'role', 'seniority', 'department', 'company', 'source',
      'sourceDetails', 'score', 'status', 'notes', 'tags',
      'personalizationContext', 'customFields', 'automation'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        lead[field] = req.body[field];
      }
    });
    
    // Add activity for status change
    if (oldStatus !== lead.status) {
      lead.activities.push({
        type: 'status_changed',
        description: `Status changed from ${oldStatus} to ${lead.status}`,
        metadata: {
          previousStatus: oldStatus,
          newStatus: lead.status
        },
        performedBy: req.user._id
      });
    }
    
    await lead.save();
    
    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('PUT /leads/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead'
    });
  }
});

/**
 * DELETE /api/reachouts/leads/:id
 * Delete a lead
 */
router.delete('/leads/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /leads/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead'
    });
  }
});

/**
 * POST /api/reachouts/leads/:id/activity
 * Add activity to lead
 */
router.post('/leads/:id/activity', protect, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    await lead.addActivity({
      ...req.body,
      performedBy: req.user._id
    });
    
    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('POST /leads/:id/activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add activity'
    });
  }
});

/**
 * POST /api/reachouts/leads/import
 * Bulk import leads
 */
router.post('/leads/import', protect, async (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of leads'
      });
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const leadData of leads) {
      try {
        const lead = new Lead({
          userId: req.user._id,
          source: 'import',
          ...leadData
        });
        
        lead.activities.push({
          type: 'lead_created',
          description: 'Lead imported',
          performedBy: req.user._id
        });
        
        await lead.save();
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: leadData.email,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('POST /leads/import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import leads'
    });
  }
});

// ============================================
// AI GENERATION ROUTES
// ============================================

/**
 * POST /api/reachouts/generate/email
 * Generate an email for a lead
 */
router.post('/generate/email', protect, async (req, res) => {
  try {
    const { leadId, type = 'cold_email', options = {} } = req.body;
    
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'Lead ID is required'
      });
    }
    
    let result;
    
    switch (type) {
      case 'cold_email':
        result = await outreachAI.generateColdEmail(req.user._id, leadId, options);
        break;
      case 'follow_up':
        result = await outreachAI.generateFollowUpEmail(req.user._id, leadId, options.followUpNumber || 1, options);
        break;
      case 'breakup':
        result = await outreachAI.generateBreakupEmail(req.user._id, leadId, options);
        break;
      case 'value_add':
        result = await outreachAI.generateValueAddEmail(req.user._id, leadId, options);
        break;
      case 'meeting_request':
        result = await outreachAI.generateMeetingRequest(req.user._id, leadId, options);
        break;
      default:
        result = await outreachAI.generateColdEmail(req.user._id, leadId, options);
    }
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('POST /generate/email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate email'
    });
  }
});

/**
 * POST /api/reachouts/generate/call-script
 * Generate a call script for a lead
 */
router.post('/generate/call-script', protect, async (req, res) => {
  try {
    const { leadId, options = {} } = req.body;
    
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'Lead ID is required'
      });
    }
    
    const result = await outreachAI.generateCallScript(req.user._id, leadId, options);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('POST /generate/call-script error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate call script'
    });
  }
});

/**
 * POST /api/reachouts/generate/linkedin
 * Generate LinkedIn content for a lead
 */
router.post('/generate/linkedin', protect, async (req, res) => {
  try {
    const { leadId, type = 'connection', options = {} } = req.body;
    
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'Lead ID is required'
      });
    }
    
    let result;
    
    if (type === 'connection') {
      result = await outreachAI.generateLinkedInConnection(req.user._id, leadId, options);
    } else {
      result = await outreachAI.generateLinkedInMessage(req.user._id, leadId, options);
    }
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('POST /generate/linkedin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate LinkedIn content'
    });
  }
});

/**
 * POST /api/reachouts/generate/objections
 * Generate objection handling responses
 */
router.post('/generate/objections', protect, async (req, res) => {
  try {
    const { leadId, options = {} } = req.body;
    
    const result = await outreachAI.generateObjectionHandling(req.user._id, leadId, options);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('POST /generate/objections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate objection handling'
    });
  }
});

/**
 * POST /api/reachouts/generate/variations
 * Generate multiple content variations
 */
router.post('/generate/variations', protect, async (req, res) => {
  try {
    const { leadId, contentType = 'cold_email', variations = 3, options = {} } = req.body;
    
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'Lead ID is required'
      });
    }
    
    const result = await outreachAI.generateVariations(
      req.user._id,
      leadId,
      contentType,
      variations,
      options
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('POST /generate/variations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate variations'
    });
  }
});

/**
 * POST /api/reachouts/generate/regenerate
 * Regenerate content with feedback
 */
router.post('/generate/regenerate', protect, async (req, res) => {
  try {
    const { leadId, contentType, previousContent, feedback } = req.body;
    
    if (!leadId || !contentType || !previousContent || !feedback) {
      return res.status(400).json({
        success: false,
        error: 'Lead ID, content type, previous content, and feedback are required'
      });
    }
    
    const result = await outreachAI.regenerateWithFeedback(
      req.user._id,
      leadId,
      contentType,
      previousContent,
      feedback
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('POST /generate/regenerate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate content'
    });
  }
});

// ============================================
// SEQUENCE ROUTES
// ============================================

/**
 * GET /api/reachouts/sequences
 * Get all sequences for user
 */
router.get('/sequences', protect, async (req, res) => {
  try {
    const sequences = await OutreachSequence.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: sequences
    });
  } catch (error) {
    console.error('GET /sequences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sequences'
    });
  }
});

/**
 * POST /api/reachouts/sequences
 * Create a new sequence
 */
router.post('/sequences', protect, async (req, res) => {
  try {
    const sequence = new OutreachSequence({
      userId: req.user._id,
      ...req.body
    });
    
    await sequence.save();
    
    res.status(201).json({
      success: true,
      data: sequence
    });
  } catch (error) {
    console.error('POST /sequences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sequence'
    });
  }
});

/**
 * PUT /api/reachouts/sequences/:id
 * Update a sequence
 */
router.put('/sequences/:id', protect, async (req, res) => {
  try {
    const sequence = await OutreachSequence.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    
    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: 'Sequence not found'
      });
    }
    
    res.json({
      success: true,
      data: sequence
    });
  } catch (error) {
    console.error('PUT /sequences/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sequence'
    });
  }
});

/**
 * DELETE /api/reachouts/sequences/:id
 * Delete a sequence
 */
router.delete('/sequences/:id', protect, async (req, res) => {
  try {
    const sequence = await OutreachSequence.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: 'Sequence not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Sequence deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /sequences/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sequence'
    });
  }
});

/**
 * POST /api/reachouts/sequences/:id/enroll
 * Enroll leads in a sequence
 */
router.post('/sequences/:id/enroll', protect, async (req, res) => {
  try {
    const { leadIds } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide lead IDs to enroll'
      });
    }
    
    const sequence = await OutreachSequence.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: 'Sequence not found'
      });
    }
    
    // Update leads with sequence info
    const result = await Lead.updateMany(
      { _id: { $in: leadIds }, userId: req.user._id },
      {
        $set: {
          'automation.isActive': true,
          'automation.sequenceId': sequence._id,
          'automation.currentStep': 0
        }
      }
    );
    
    // Update sequence stats
    sequence.stats.totalLeadsEnrolled += result.modifiedCount;
    sequence.stats.activeLeads += result.modifiedCount;
    await sequence.save();
    
    res.json({
      success: true,
      data: {
        enrolled: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('POST /sequences/:id/enroll error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enroll leads'
    });
  }
});

module.exports = router;
