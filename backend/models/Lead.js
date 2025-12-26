/**
 * Lead Model
 * 
 * Represents a potential customer/contact for outreach.
 * Part of the Reachouts CRM system.
 */

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'email_sent', 
      'email_opened', 
      'email_clicked',
      'email_replied',
      'email_bounced',
      'call_attempted',
      'call_connected',
      'call_voicemail',
      'linkedin_connection_sent',
      'linkedin_connection_accepted',
      'linkedin_message_sent',
      'linkedin_message_replied',
      'meeting_scheduled',
      'meeting_completed',
      'note_added',
      'status_changed',
      'lead_created',
      'lead_qualified',
      'lead_disqualified'
    ],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  metadata: {
    // For emails
    emailSubject: String,
    emailContent: String,
    emailId: String,
    
    // For calls
    callDuration: Number,
    callNotes: String,
    
    // For meetings
    meetingLink: String,
    meetingNotes: String,
    
    // For status changes
    previousStatus: String,
    newStatus: String,
    
    // AI generated content reference
    aiGenerated: Boolean,
    promptUsed: String
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Contact Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  linkedinUrl: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Professional Information
  role: {
    type: String,
    trim: true,
    default: ''
  },
  seniority: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'director', 'vp', 'c-level', 'founder', ''],
    default: ''
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Company Information
  company: {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    industry: {
      type: String,
      trim: true,
      default: ''
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', ''],
      default: ''
    },
    location: {
      type: String,
      trim: true,
      default: ''
    }
  },
  
  // Lead Source & Scoring
  source: {
    type: String,
    enum: ['manual', 'linkedin', 'website', 'referral', 'event', 'cold_list', 'import', 'other'],
    default: 'manual'
  },
  sourceDetails: {
    type: String,
    trim: true,
    default: ''
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Status & Pipeline
  status: {
    type: String,
    enum: [
      'new',
      'contacted',
      'engaged',
      'qualified',
      'meeting_scheduled',
      'proposal_sent',
      'negotiating',
      'won',
      'lost',
      'unresponsive',
      'not_interested',
      'do_not_contact'
    ],
    default: 'new',
    index: true
  },
  
  // Outreach Status
  outreachStatus: {
    emailsSent: { type: Number, default: 0 },
    emailsOpened: { type: Number, default: 0 },
    emailsReplied: { type: Number, default: 0 },
    callsAttempted: { type: Number, default: 0 },
    callsConnected: { type: Number, default: 0 },
    linkedinMessagesSent: { type: Number, default: 0 },
    lastContactedAt: { type: Date },
    lastResponseAt: { type: Date },
    nextFollowUpAt: { type: Date }
  },
  
  // Automation
  automation: {
    isActive: {
      type: Boolean,
      default: false
    },
    sequenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutreachSequence'
    },
    currentStep: {
      type: Number,
      default: 0
    },
    pausedAt: {
      type: Date
    },
    pauseReason: {
      type: String,
      trim: true
    }
  },
  
  // Activity Timeline
  activities: [activitySchema],
  
  // Notes & Tags
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Custom Fields (for flexibility)
  customFields: {
    type: Map,
    of: String,
    default: {}
  },
  
  // Personalization context (for AI)
  personalizationContext: {
    painPoints: [{
      type: String,
      trim: true
    }],
    interests: [{
      type: String,
      trim: true
    }],
    recentNews: {
      type: String,
      trim: true,
      default: ''
    },
    commonConnections: [{
      type: String,
      trim: true
    }],
    customNotes: {
      type: String,
      trim: true,
      default: ''
    }
  }
  
}, {
  timestamps: true
});

// Indexes for common queries
leadSchema.index({ userId: 1, status: 1 });
leadSchema.index({ userId: 1, 'company.name': 1 });
leadSchema.index({ userId: 1, email: 1 }, { unique: true });
leadSchema.index({ userId: 1, createdAt: -1 });

// Method to add activity
leadSchema.methods.addActivity = async function(activityData) {
  this.activities.push({
    ...activityData,
    createdAt: new Date()
  });
  
  // Update outreach stats based on activity type
  switch (activityData.type) {
    case 'email_sent':
      this.outreachStatus.emailsSent += 1;
      this.outreachStatus.lastContactedAt = new Date();
      break;
    case 'email_opened':
      this.outreachStatus.emailsOpened += 1;
      break;
    case 'email_replied':
      this.outreachStatus.emailsReplied += 1;
      this.outreachStatus.lastResponseAt = new Date();
      if (this.status === 'new' || this.status === 'contacted') {
        this.status = 'engaged';
      }
      break;
    case 'call_attempted':
      this.outreachStatus.callsAttempted += 1;
      this.outreachStatus.lastContactedAt = new Date();
      break;
    case 'call_connected':
      this.outreachStatus.callsConnected += 1;
      this.outreachStatus.lastResponseAt = new Date();
      break;
    case 'linkedin_message_sent':
      this.outreachStatus.linkedinMessagesSent += 1;
      this.outreachStatus.lastContactedAt = new Date();
      break;
  }
  
  await this.save();
  return this;
};

// Method to get full name
leadSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`.trim();
};

// Static method to get leads by status
leadSchema.statics.getByStatus = function(userId, status) {
  return this.find({ userId, status }).sort({ createdAt: -1 });
};

// Static method to get leads needing follow-up
leadSchema.statics.getNeedingFollowUp = function(userId) {
  return this.find({
    userId,
    'outreachStatus.nextFollowUpAt': { $lte: new Date() },
    status: { $nin: ['won', 'lost', 'do_not_contact'] }
  }).sort({ 'outreachStatus.nextFollowUpAt': 1 });
};

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
