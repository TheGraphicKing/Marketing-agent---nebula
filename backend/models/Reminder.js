/**
 * Reminder Model
 * Stores scheduled reminders for campaigns and events
 */

const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // What the reminder is for
  type: {
    type: String,
    enum: ['campaign', 'post', 'meeting', 'task', 'custom'],
    default: 'campaign'
  },
  
  // Reference to campaign if applicable
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  
  // Reminder details
  title: {
    type: String,
    required: true,
    maxLength: 200
  },
  
  description: {
    type: String,
    maxLength: 500
  },
  
  // When to remind
  scheduledFor: {
    type: Date,
    required: true
  },
  
  // When to send reminder (before scheduled time)
  reminderTime: {
    type: Date,
    required: true
  },
  
  // How far in advance to remind (in minutes)
  reminderOffset: {
    type: Number,
    default: 30 // 30 minutes before
  },
  
  // Reminder status
  status: {
    type: String,
    enum: ['pending', 'sent', 'dismissed', 'snoozed'],
    default: 'pending'
  },
  
  // If snoozed, when to remind again
  snoozedUntil: {
    type: Date
  },
  
  // Notification preferences
  notificationChannels: [{
    type: String,
    enum: ['in-app', 'email', 'push']
  }],
  
  // Was notification sent
  notificationSentAt: {
    type: Date
  },
  
  // Recurring reminder settings
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'none'],
    default: 'none'
  },
  
  // Platform/context
  platform: {
    type: String
  },
  
  // Color coding for calendar display
  color: {
    type: String,
    default: '#6366f1' // Indigo
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
reminderSchema.index({ userId: 1, scheduledFor: 1 });
reminderSchema.index({ userId: 1, status: 1, reminderTime: 1 });

// Update timestamp on save
reminderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get pending reminders that should be sent
reminderSchema.statics.getPendingReminders = async function(userId) {
  const now = new Date();
  return this.find({
    userId,
    status: 'pending',
    reminderTime: { $lte: now }
  }).populate('campaignId');
};

// Static method to get upcoming reminders for a date range
reminderSchema.statics.getUpcomingReminders = async function(userId, startDate, endDate) {
  return this.find({
    userId,
    scheduledFor: {
      $gte: startDate,
      $lte: endDate
    },
    status: { $in: ['pending', 'snoozed'] }
  }).populate('campaignId').sort({ scheduledFor: 1 });
};

module.exports = mongoose.model('Reminder', reminderSchema);
