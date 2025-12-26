/**
 * OutreachSequence Model
 * 
 * Defines automated outreach sequences/cadences.
 * Each sequence contains multiple steps with timing and content templates.
 */

const mongoose = require('mongoose');

const sequenceStepSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'linkedin_message', 'linkedin_connection', 'call', 'task'],
    required: true
  },
  delayDays: {
    type: Number,
    default: 0,
    min: 0
  },
  delayHours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Content template (can contain variables like {{firstName}}, {{company}})
  subject: {
    type: String,
    trim: true,
    default: ''
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  
  // AI Generation settings
  useAI: {
    type: Boolean,
    default: true
  },
  aiPromptType: {
    type: String,
    enum: ['cold_email', 'follow_up', 'breakup', 'value_add', 'meeting_request', 'custom'],
    default: 'cold_email'
  },
  aiInstructions: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Step-specific settings
  settings: {
    // For calls
    callScript: {
      type: String,
      trim: true
    },
    // For tasks
    taskDescription: {
      type: String,
      trim: true
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
});

const outreachSequenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  name: {
    type: String,
    required: [true, 'Sequence name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Target persona for this sequence
  targetPersona: {
    roles: [{
      type: String,
      trim: true
    }],
    industries: [{
      type: String,
      trim: true
    }],
    description: {
      type: String,
      trim: true
    }
  },
  
  // Sequence steps
  steps: [sequenceStepSchema],
  
  // Settings
  settings: {
    sendOnWeekends: {
      type: Boolean,
      default: false
    },
    sendTimeWindow: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
      timezone: { type: String, default: 'UTC' }
    },
    stopOnReply: {
      type: Boolean,
      default: true
    },
    stopOnBounce: {
      type: Boolean,
      default: true
    },
    maxEmailsPerDay: {
      type: Number,
      default: 50
    }
  },
  
  // Statistics
  stats: {
    totalLeadsEnrolled: { type: Number, default: 0 },
    activeLeads: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    replied: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 }
  },
  
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft'
  },
  
  tags: [{
    type: String,
    trim: true
  }]
  
}, {
  timestamps: true
});

// Index for efficient queries
outreachSequenceSchema.index({ userId: 1, status: 1 });

// Method to get next step for a lead
outreachSequenceSchema.methods.getNextStep = function(currentStep) {
  const activeSteps = this.steps.filter(s => s.isActive).sort((a, b) => a.order - b.order);
  const nextStepIndex = activeSteps.findIndex(s => s.order > currentStep);
  return nextStepIndex !== -1 ? activeSteps[nextStepIndex] : null;
};

// Method to calculate total sequence duration
outreachSequenceSchema.methods.getTotalDuration = function() {
  return this.steps.reduce((total, step) => {
    return total + (step.delayDays * 24) + step.delayHours;
  }, 0);
};

const OutreachSequence = mongoose.model('OutreachSequence', outreachSequenceSchema);

module.exports = OutreachSequence;
