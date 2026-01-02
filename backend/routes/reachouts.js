/**
 * Reachouts Routes
 * 
 * Backend API routes for the Reachouts CRM module.
 * Handles leads, outreach generation, sequences, and onboarding context.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const Lead = require('../models/Lead');
const User = require('../models/User');
const OnboardingContext = require('../models/OnboardingContext');
const OutreachSequence = require('../models/OutreachSequence');
const outreachAI = require('../services/outreachAI');
const contextBuilder = require('../services/contextBuilder');
const leadImporter = require('../services/leadImporter');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

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
      // Try to create from user's businessProfile if they completed onboarding
      const user = await User.findById(req.user._id);
      
      if (user && user.onboardingCompleted && user.businessProfile) {
        const bp = user.businessProfile;
        
        context = new OnboardingContext({
          userId: req.user._id,
          company: {
            name: bp.name || bp.companyName || user.companyName || '',
            website: bp.website || '',
            industry: bp.industry || '',
            description: bp.niche || bp.description || bp.tagline || 'A company providing quality products and services'
          },
          targetCustomer: {
            description: bp.targetAudience || bp.goals || 'Businesses and individuals seeking our solutions',
            roles: [],
            companySize: 'any',
            industries: [bp.industry || ''].filter(Boolean)
          },
          geography: {
            isGlobal: true,
            regions: [],
            countries: []
          },
          primaryGoal: bp.goals?.toLowerCase()?.includes('lead') ? 'leads' 
            : bp.goals?.toLowerCase()?.includes('sale') ? 'sales'
            : bp.goals?.toLowerCase()?.includes('awareness') ? 'awareness'
            : 'leads',
          brandTone: bp.tone || 'professional',
          valueProposition: {
            main: bp.tagline || bp.niche || '',
            keyBenefits: [],
            differentiators: []
          },
          completionStatus: {
            isComplete: true,
            completedAt: new Date()
          }
        });
        
        await context.save();
        console.log('✅ Created OnboardingContext from existing businessProfile');
      } else {
        // Create empty context
        context = new OnboardingContext({ userId: req.user._id });
        await context.save();
      }
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
    
    // Get userId from authenticated user
    console.log('=== GET /leads REQUEST ===');
    console.log('req.user:', req.user ? { _id: req.user._id, email: req.user.email } : 'NO USER');
    
    if (!req.user || !req.user._id) {
      console.log('ERROR: No user in request!');
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const userIdStr = req.user._id.toString();
    console.log('userId string:', userIdStr);
    
    // Use raw MongoDB collection to bypass Mongoose issues
    const db = mongoose.connection.db;
    const leadsCollection = db.collection('leads');
    
    // First check total in collection for this user
    const debugTotal = await leadsCollection.countDocuments({});
    console.log('Total leads in collection:', debugTotal);
    
    // Build query with ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userIdStr);
    const query = { userId: userObjectId };
    
    console.log('Query userId ObjectId:', userObjectId.toString());
    
    // Test simple count first
    const simpleCount = await leadsCollection.countDocuments({ userId: userObjectId });
    console.log('Simple count for userId:', simpleCount);
    
    // Apply optional filters
    if (status) query.status = status;
    if (source) query.source = source;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'company.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Parse sort field
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    
    // Execute raw MongoDB query
    const [leads, total] = await Promise.all([
      leadsCollection.find(query)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      leadsCollection.countDocuments(query)
    ]);
    
    console.log('Final result: found', leads.length, 'leads, total:', total);
    
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
 * GET /api/reachouts/debug-db
 * Debug endpoint to check database connection
 */
router.get('/debug-db', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    const leadsCollection = db.collection('leads');
    
    const totalLeads = await leadsCollection.countDocuments({});
    const groups = await leadsCollection.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]).toArray();
    
    res.json({
      success: true,
      database: dbName,
      totalLeads,
      leadsByUser: groups.map(g => ({ userId: g._id?.toString(), count: g.count }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/reachouts/debug-leads
 * Debug endpoint - NO AUTH - to test leads retrieval
 */
router.get('/debug-leads/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Use raw MongoDB
    const db = mongoose.connection.db;
    const leadsCollection = db.collection('leads');
    
    const total = await leadsCollection.countDocuments({ userId: userObjectId });
    const leads = await leadsCollection.find({ userId: userObjectId }).limit(5).toArray();
    
    res.json({
      success: true,
      userId,
      total,
      sampleLeads: leads.map(l => ({ name: l.firstName + ' ' + l.lastName, email: l.email }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/reachouts/leads/stats
 * Get lead statistics
 */
router.get('/leads/stats', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    const [statusCounts, sourceCounts, totalStats] = await Promise.all([
      Lead.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { userId: userObjectId } },
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
// EXCEL/CSV FILE UPLOAD ROUTES
// ============================================

/**
 * POST /api/reachouts/leads/upload/preview
 * Preview Excel/CSV file before importing - AI filters unnecessary data
 */
router.post('/leads/upload/preview', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }
    
    const result = await leadImporter.previewImport(req.file.buffer, req.file.originalname);
    
    res.json(result);
  } catch (error) {
    console.error('POST /leads/upload/preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to preview file'
    });
  }
});

/**
 * POST /api/reachouts/leads/upload
 * Upload and import Excel/CSV file with AI-powered filtering
 */
router.post('/leads/upload', protect, upload.single('file'), async (req, res) => {
  try {
    console.log('=== LEAD IMPORT START ===');
    console.log('User:', req.user._id.toString());
    console.log('File:', req.file?.originalname);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }
    
    // Process the file with AI filtering
    console.log('Processing file...');
    const processResult = await leadImporter.processLeadImport(
      req.file.buffer, 
      req.file.originalname,
      { useAI: true }
    );
    
    console.log('Process result:', {
      success: processResult.success,
      leadsCount: processResult.data?.leads?.length,
      stats: processResult.data?.stats
    });
    
    if (!processResult.success) {
      return res.status(400).json(processResult);
    }
    
    // Save leads to database
    const importResults = {
      success: 0,
      failed: 0,
      errors: [],
      duplicates: 0
    };
    
    // Check for existing emails to avoid duplicates
    const existingEmails = await Lead.find({
      userId: req.user._id,
      email: { $in: processResult.data.leads.map(l => l.email).filter(Boolean) }
    }).select('email').lean();
    
    const existingEmailSet = new Set(existingEmails.map(l => l.email));
    console.log('Existing emails in DB:', existingEmailSet.size);
    
    for (const leadData of processResult.data.leads) {
      try {
        // Skip if email already exists
        if (leadData.email && existingEmailSet.has(leadData.email)) {
          importResults.duplicates++;
          continue;
        }
        
        const lead = new Lead({
          userId: req.user._id,
          source: 'import',
          sourceDetails: `Imported from ${req.file.originalname}`,
          ...leadData
        });
        
        lead.activities.push({
          type: 'lead_created',
          description: `Imported from file: ${req.file.originalname}`,
          performedBy: req.user._id
        });
        
        await lead.save();
        importResults.success++;
        console.log('✅ Saved lead:', leadData.email || leadData.firstName);
        
        // Add to existing set to avoid duplicates within same file
        if (leadData.email) {
          existingEmailSet.add(leadData.email);
        }
      } catch (error) {
        importResults.failed++;
        console.log('❌ Failed to save lead:', leadData.email, error.message);
        importResults.errors.push({
          email: leadData.email || 'Unknown',
          error: error.message
        });
      }
    }
    
    console.log('=== IMPORT COMPLETE ===');
    console.log('Success:', importResults.success);
    console.log('Failed:', importResults.failed);
    console.log('Duplicates:', importResults.duplicates);
    
    res.json({
      success: true,
      data: {
        imported: importResults.success,
        failed: importResults.failed,
        duplicates: importResults.duplicates,
        totalProcessed: processResult.data.stats.totalRows,
        skippedByAI: processResult.data.stats.skipped,
        columnMappings: processResult.data.columnMappings,
        errors: importResults.errors.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('POST /leads/upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload and import file'
    });
  }
});

/**
 * GET /api/reachouts/integrations
 * Get available integrations and their connection status
 */
router.get('/integrations', protect, async (req, res) => {
  try {
    // For now, return static integration options
    // In the future, this will check actual OAuth connections
    const integrations = [
      {
        id: 'meta_ads',
        name: 'Meta Ads',
        description: 'Import leads from Facebook & Instagram ads',
        icon: 'facebook',
        category: 'ads',
        connected: false,
        available: false, // Will be true when API is configured
        requiredConfig: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET']
      },
      {
        id: 'google_ads',
        name: 'Google Ads',
        description: 'Import leads from Google Ads campaigns',
        icon: 'google',
        category: 'ads',
        connected: false,
        available: false,
        requiredConfig: ['GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET']
      },
      {
        id: 'hubspot',
        name: 'HubSpot CRM',
        description: 'Sync leads with HubSpot CRM',
        icon: 'hubspot',
        category: 'crm',
        connected: false,
        available: false,
        requiredConfig: ['HUBSPOT_API_KEY']
      },
      {
        id: 'zoho_crm',
        name: 'Zoho CRM',
        description: 'Sync leads with Zoho CRM',
        icon: 'zoho',
        category: 'crm',
        connected: false,
        available: false,
        requiredConfig: ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET']
      },
      {
        id: 'salesforce',
        name: 'Salesforce',
        description: 'Sync leads with Salesforce CRM',
        icon: 'salesforce',
        category: 'crm',
        connected: false,
        available: false,
        requiredConfig: ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET']
      },
      {
        id: 'pipedrive',
        name: 'Pipedrive',
        description: 'Sync leads with Pipedrive CRM',
        icon: 'pipedrive',
        category: 'crm',
        connected: false,
        available: false,
        requiredConfig: ['PIPEDRIVE_API_KEY']
      },
      {
        id: 'excel_upload',
        name: 'Excel/CSV Upload',
        description: 'Import leads from spreadsheets',
        icon: 'file-spreadsheet',
        category: 'manual',
        connected: true,
        available: true,
        requiredConfig: []
      }
    ];
    
    res.json({
      success: true,
      data: {
        integrations,
        categories: [
          { id: 'ads', name: 'Ad Platforms', description: 'Import leads from advertising platforms' },
          { id: 'crm', name: 'CRM Systems', description: 'Sync with customer relationship management tools' },
          { id: 'manual', name: 'Manual Import', description: 'Upload leads manually' }
        ]
      }
    });
  } catch (error) {
    console.error('GET /integrations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrations'
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

// ============================================
// EMAIL CAMPAIGN ROUTES
// ============================================

const EmailCampaign = require('../models/EmailCampaign');
const emailService = require('../services/emailService');

/**
 * POST /api/reachouts/campaigns/generate-sequence
 * Generate AI email sequence for selected leads
 */
router.post('/campaigns/generate-sequence', protect, async (req, res) => {
  try {
    const { leadIds, campaignType = 'cold_outreach', numFollowUps = 3, customInstructions } = req.body;
    
    if (!leadIds || !leadIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Please select at least one lead'
      });
    }
    
    // Fetch leads
    const leads = await Lead.find({
      _id: { $in: leadIds },
      userId: req.user._id
    });
    
    if (!leads.length) {
      return res.status(404).json({
        success: false,
        error: 'No leads found'
      });
    }
    
    // Generate sequence using AI
    const result = await outreachAI.generateEmailSequence(
      req.user._id,
      leads,
      { campaignType, numFollowUps, customInstructions }
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: {
        sequence: result.sequence,
        campaignType,
        leadCount: leads.length,
        leads: leads.map(l => ({
          _id: l._id,
          firstName: l.firstName,
          lastName: l.lastName,
          email: l.email,
          company: l.company?.name
        })),
        generatedAt: result.generatedAt
      }
    });
    
  } catch (error) {
    console.error('POST /campaigns/generate-sequence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate email sequence'
    });
  }
});

/**
 * POST /api/reachouts/campaigns
 * Create a new email campaign
 */
router.post('/campaigns', protect, async (req, res) => {
  try {
    const { name, campaignType, messages, leadIds, sender } = req.body;
    
    if (!messages || !messages.length) {
      return res.status(400).json({
        success: false,
        error: 'Campaign must have at least one message'
      });
    }
    
    // Fetch leads
    const leads = await Lead.find({
      _id: { $in: leadIds },
      userId: req.user._id
    });
    
    // Create recipients from leads
    const recipients = leads.map(lead => ({
      leadId: lead._id,
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      companyName: lead.company?.name,
      currentStage: 'pending',
      status: 'active'
    }));
    
    // Create campaign
    const campaign = new EmailCampaign({
      userId: req.user._id,
      name: name || `Campaign ${new Date().toLocaleDateString()}`,
      campaignType,
      messages,
      recipients,
      sender: {
        email: sender.email,
        name: sender.name || req.user.name,
        replyTo: sender.replyTo || sender.email
      },
      filterCriteria: {
        leadIds
      },
      stats: {
        totalRecipients: recipients.length
      }
    });
    
    await campaign.save();
    
    res.json({
      success: true,
      data: campaign
    });
    
  } catch (error) {
    console.error('POST /campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign'
    });
  }
});

/**
 * GET /api/reachouts/campaigns
 * Get all campaigns for user
 */
router.get('/campaigns', protect, async (req, res) => {
  try {
    const campaigns = await EmailCampaign.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-recipients');
    
    res.json({
      success: true,
      data: campaigns
    });
    
  } catch (error) {
    console.error('GET /campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

/**
 * GET /api/reachouts/campaigns/:id
 * Get campaign details
 */
router.get('/campaigns/:id', protect, async (req, res) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.json({
      success: true,
      data: campaign
    });
    
  } catch (error) {
    console.error('GET /campaigns/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign'
    });
  }
});

/**
 * PUT /api/reachouts/campaigns/:id
 * Update campaign (messages, etc.)
 */
router.put('/campaigns/:id', protect, async (req, res) => {
  try {
    const { messages, name, sender } = req.body;
    
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    if (messages) campaign.messages = messages;
    if (name) campaign.name = name;
    if (sender) campaign.sender = { ...campaign.sender, ...sender };
    
    await campaign.save();
    
    res.json({
      success: true,
      data: campaign
    });
    
  } catch (error) {
    console.error('PUT /campaigns/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign'
    });
  }
});

/**
 * POST /api/reachouts/email/configure
 * Configure email sending credentials
 */
router.post('/email/configure', protect, async (req, res) => {
  try {
    const { provider, email, apiKey, appPassword, password, host, port } = req.body;
    
    const config = { provider };
    
    if (provider === 'sendgrid') {
      config.apiKey = apiKey;
    } else if (provider === 'gmail') {
      config.email = email;
      config.appPassword = appPassword;
    } else if (provider === 'outlook') {
      config.email = email;
      config.password = password;
    } else if (provider === 'smtp') {
      config.host = host;
      config.port = port;
      config.user = email;
      config.password = password;
    }
    
    const result = await emailService.initialize(config);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        hint: result.hint
      });
    }
    
    res.json({
      success: true,
      message: `Email configured successfully with ${provider}`,
      provider
    });
    
  } catch (error) {
    console.error('POST /email/configure error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure email'
    });
  }
});

/**
 * POST /api/reachouts/email/test
 * Send a test email
 */
router.post('/email/test', protect, async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email address'
      });
    }
    
    const result = await emailService.sendTestEmail(to);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully' : result.error,
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('POST /email/test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email'
    });
  }
});

/**
 * POST /api/reachouts/campaigns/:id/send
 * Send campaign emails
 */
router.post('/campaigns/:id/send', protect, async (req, res) => {
  try {
    const { stage = 'initial' } = req.body;
    
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    // Prepare emails
    const prepResult = emailService.prepareBulkFromCampaign(campaign, stage);
    
    if (!prepResult.success) {
      return res.status(400).json(prepResult);
    }
    
    // Send emails
    const sendResult = await emailService.sendBulkEmails(prepResult.emails);
    
    // Update campaign stats and recipient statuses
    for (const detail of sendResult.details) {
      const recipient = campaign.recipients.find(r => r.email === detail.to);
      if (recipient) {
        if (detail.success) {
          recipient.currentStage = stage;
          recipient.sentAt.push({
            stage,
            timestamp: new Date(),
            messageId: detail.messageId
          });
        } else {
          recipient.status = 'failed';
        }
      }
    }
    
    campaign.stats.sent += sendResult.sent;
    campaign.status = 'active';
    if (!campaign.startedAt) campaign.startedAt = new Date();
    
    await campaign.save();
    
    // Update lead outreach stats
    const sentLeadIds = sendResult.details
      .filter(d => d.success)
      .map(d => prepResult.emails.find(e => e.to === d.to)?.leadId)
      .filter(Boolean);
    
    if (sentLeadIds.length > 0) {
      await Lead.updateMany(
        { _id: { $in: sentLeadIds } },
        { $inc: { 'outreachStatus.emailsSent': 1 } }
      );
    }
    
    res.json({
      success: true,
      data: {
        sent: sendResult.sent,
        failed: sendResult.failed,
        total: sendResult.total,
        details: sendResult.details
      }
    });
    
  } catch (error) {
    console.error('POST /campaigns/:id/send error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send campaign'
    });
  }
});

/**
 * POST /api/reachouts/email/send-direct
 * Send emails directly without creating a campaign
 */
router.post('/email/send-direct', protect, async (req, res) => {
  try {
    const { recipients, subject, body, senderEmail, senderName } = req.body;
    
    if (!recipients || !recipients.length) {
      return res.status(400).json({
        success: false,
        error: 'No recipients specified'
      });
    }
    
    // Prepare personalized emails
    const emails = recipients.map(recipient => {
      const personalized = emailService.personalizeEmail(
        { subject, body },
        recipient
      );
      
      return {
        to: recipient.email,
        from: senderName ? `${senderName} <${senderEmail}>` : senderEmail,
        subject: personalized.subject,
        body: personalized.body,
        replyTo: senderEmail
      };
    });
    
    // Send emails
    const result = await emailService.sendBulkEmails(emails, {
      delayBetween: 200 // 200ms between emails
    });
    
    // Update lead stats for successful sends
    const successfulEmails = result.details.filter(d => d.success).map(d => d.to);
    if (successfulEmails.length > 0) {
      await Lead.updateMany(
        { email: { $in: successfulEmails }, userId: req.user._id },
        { $inc: { 'outreachStatus.emailsSent': 1 } }
      );
    }
    
    res.json({
      success: result.success,
      data: {
        sent: result.sent,
        failed: result.failed,
        total: result.total,
        details: result.details
      }
    });
    
  } catch (error) {
    console.error('POST /email/send-direct error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send emails'
    });
  }
});

module.exports = router;
