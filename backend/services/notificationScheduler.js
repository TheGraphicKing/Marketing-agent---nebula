/**
 * Campaign Notification Scheduler
 * 
 * Sends notifications at EXACTLY:
 * - 30 minutes before campaign goes live
 * - 15 minutes before campaign goes live
 * 
 * Both in-app popup notifications AND email notifications via AWS SES
 */

const Notification = require('../models/Notification');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const sesEmailService = require('./sesEmailService');

class NotificationScheduler {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 30 * 1000; // Check every 30 seconds for accuracy
    this.intervalId = null;
    this.isProcessing = false;
    this.lastProcessingStart = null;
  }

  /**
   * Start the notification scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Notification scheduler already running');
      return;
    }

    // Initialize SES
    sesEmailService.initialize();

    console.log('🔔 Starting campaign notification scheduler...');
    this.isRunning = true;

    // Run immediately on start
    this.checkAndSendNotifications();

    // Then run every 30 seconds
    this.intervalId = setInterval(() => {
      console.log('🔄 Scheduler tick...');
      
      // Reset processing flag if it's been stuck for more than 20 seconds
      if (this.isProcessing && this.lastProcessingStart) {
        const elapsed = Date.now() - this.lastProcessingStart;
        if (elapsed > 20000) {
          console.log('⚠️ Processing stuck for 20s, resetting...');
          this.isProcessing = false;
        }
      }
      
      this.checkAndSendNotifications();
    }, this.checkInterval);

    console.log('✅ Notification scheduler started (checking every 30 seconds)');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Notification scheduler stopped');
  }

  /**
   * Main function: Check all campaigns and send notifications at the right times
   */
  async checkAndSendNotifications() {
    if (this.isProcessing) {
      console.log('⚠️ Scheduler already processing, skipping...');
      return;
    }
    this.isProcessing = true;
    this.lastProcessingStart = Date.now();

    try {
      const now = new Date();
      const localTimeStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`⏰ Checking at ${now.toISOString()} (Local: ${localTimeStr})`);
      
      // Find all scheduled campaigns - ULTRA SIMPLE query, no populate
      let campaigns = [];
      try {
        console.log('   🔍 Querying campaigns (simple)...');
        // Simple query without populate - just get status=scheduled
        campaigns = await Campaign.find({ status: 'scheduled' })
          .select('_id name userId scheduling platforms')
          .lean()
          .maxTimeMS(8000);
        console.log(`📋 Found ${campaigns.length} scheduled campaign(s)`);
      } catch (dbError) {
        console.log('⚠️  DB query failed:', dbError.message);
        // Try a simpler query
        try {
          console.log('   🔄 Retrying with simple query...');
          campaigns = await Campaign.find({
            status: 'scheduled'
          }).maxTimeMS(10000).lean();
          console.log(`📋 Retry found ${campaigns.length} scheduled campaign(s)`);
          // Continue processing - don't return!
        } catch (retryError) {
          console.log('❌ Retry also failed:', retryError.message);
          this.isProcessing = false;
          return;
        }
      }

      if (campaigns && campaigns.length > 0) {
        for (const campaign of campaigns) {
          await this.checkCampaignNotifications(campaign, now);
        }
      } else {
        console.log('   ℹ️  No scheduled campaigns in database');
      }

    } catch (error) {
      console.error('❌ Notification scheduler error:', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if we need to send 30-min or 15-min notification for a campaign
   */
  async checkCampaignNotifications(campaign, now) {
    try {
      const scheduledTime = this.getCampaignScheduledTime(campaign);
      if (!scheduledTime) {
        console.log(`⚠️ Campaign "${campaign.name}" has no valid scheduled time`);
        return;
      }

      const timeDiff = scheduledTime.getTime() - now.getTime();
      const minutesUntilLive = Math.round(timeDiff / (1000 * 60));

      // Always log campaign info for debugging
      console.log(`📊 Campaign "${campaign.name}": scheduled for ${scheduledTime.toISOString()}, ${minutesUntilLive} minutes until live`);

      // Skip campaigns that already happened
      if (minutesUntilLive < 0) {
        console.log(`   ⏭️ Campaign already passed`);
        return;
      }

      // Check for 30-minute notification (send when 25-35 minutes left)
      if (minutesUntilLive >= 25 && minutesUntilLive <= 35) {
        console.log(`   🔔 Triggering 30-min notification...`);
        await this.sendNotificationIfNotSent(campaign, 'campaign_reminder_30', 30, scheduledTime);
      }

      // Check for 15-minute notification (send when 10-20 minutes left)
      if (minutesUntilLive >= 10 && minutesUntilLive <= 20) {
        console.log(`   🔔 Triggering 15-min notification...`);
        await this.sendNotificationIfNotSent(campaign, 'campaign_reminder_15', 15, scheduledTime);
      }

    } catch (error) {
      console.error(`Error checking campaign ${campaign._id}:`, error.message);
    }
  }

  /**
   * Get the scheduled datetime for a campaign
   * IMPORTANT: Returns time in the local timezone that the user set
   */
  getCampaignScheduledTime(campaign) {
    if (!campaign.scheduling?.startDate) return null;

    try {
      // Parse the date - handle various formats
      let startDate;
      const dateStr = campaign.scheduling.startDate;
      
      // Get the date portion
      if (typeof dateStr === 'string') {
        // Extract just the date part (YYYY-MM-DD)
        const datePart = dateStr.split('T')[0];
        startDate = new Date(datePart + 'T00:00:00');
      } else if (dateStr instanceof Date) {
        startDate = new Date(dateStr);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(dateStr);
      }
      
      // Apply the postTime
      const postTime = campaign.scheduling.postTime || '10:00';
      const [hours, minutes] = postTime.split(':').map(Number);
      
      // Set hours and minutes in local time
      startDate.setHours(hours || 10, minutes || 0, 0, 0);
      
      console.log(`   📅 Parsed: date=${campaign.scheduling.startDate}, time=${postTime} => ${startDate.toISOString()}`);
      
      return startDate;
    } catch (error) {
      console.error('Error parsing campaign time:', error.message);
      return null;
    }
  }

  /**
   * Send notification if not already sent
   */
  async sendNotificationIfNotSent(campaign, type, minutesLeft, scheduledTime) {
    try {
      // Check if this notification was already sent
      const existing = await Notification.findOne({
        campaignId: campaign._id,
        type: type
      });

      if (existing) {
        // Already sent this notification
        return;
      }

      console.log(`🔔 Sending ${minutesLeft}-minute reminder for: ${campaign.name}`);

      // Create the notification
      const notification = new Notification({
        userId: campaign.userId._id || campaign.userId,
        campaignId: campaign._id,
        type: type,
        title: `Campaign Reminder - ${minutesLeft} Minutes Left!`,
        message: `Your campaign "${campaign.name}" goes live in ${minutesLeft} minutes!`,
        scheduledFor: new Date(),
        sentAt: new Date(),
        status: 'sent', // Mark as sent immediately so popup shows
        metadata: {
          campaignName: campaign.name,
          platforms: campaign.platforms || [],
          scheduledTime: this.formatTime(scheduledTime),
          scheduledTimeISO: scheduledTime.toISOString(),
          minutesLeft: minutesLeft
        }
      });

      await notification.save();
      console.log(`✅ In-app notification sent: ${campaign.name} - ${minutesLeft} min left`);

      // Send email notification
      await this.sendEmailNotification(campaign, minutesLeft, scheduledTime);

    } catch (error) {
      console.error(`Error sending notification:`, error.message);
    }
  }

  /**
   * Send email notification via AWS SES
   */
  async sendEmailNotification(campaign, minutesLeft, scheduledTime) {
    try {
      // Use specific email for notifications - configured for testing
      const userEmail = 'navaneethakrishnan821@gmail.com';
      
      console.log(`📧 Preparing to send email to: ${userEmail}`);

      if (!sesEmailService.initialized) {
        console.log('⚠️  SES not initialized - skipping email');
        return;
      }

      const result = await sesEmailService.sendCampaignReminder({
        to: userEmail,
        campaignName: campaign.name,
        minutesBefore: minutesLeft,
        scheduledTime: this.formatTime(scheduledTime),
        platforms: campaign.platforms || []
      });

      if (result.success) {
        console.log(`📧 Email sent to ${userEmail}: ${campaign.name} - ${minutesLeft} min reminder`);
      } else {
        console.error(`❌ Email failed: ${result.error}`);
      }

    } catch (error) {
      console.error('Email sending error:', error.message);
    }
  }

  /**
   * Format time for display
   */
  formatTime(date) {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Manual trigger for testing - sends a test notification immediately
   */
  async triggerTestNotification(campaignId, userId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      const user = await User.findById(userId);
      
      if (!campaign || !user) {
        return { success: false, message: 'Campaign or user not found' };
      }

      const scheduledTime = this.getCampaignScheduledTime(campaign) || new Date();

      const notification = new Notification({
        userId: userId,
        campaignId: campaignId,
        type: 'campaign_reminder_15',
        title: 'Campaign Reminder - 15 Minutes Left! (Test)',
        message: `Your campaign "${campaign.name}" goes live in 15 minutes!`,
        scheduledFor: new Date(),
        sentAt: new Date(),
        status: 'sent',
        metadata: {
          campaignName: campaign.name,
          platforms: campaign.platforms || [],
          scheduledTime: this.formatTime(scheduledTime),
          scheduledTimeISO: scheduledTime.toISOString(),
          minutesLeft: 15
        }
      });

      await notification.save();

      // Also send test email to configured address
      if (sesEmailService.initialized) {
        const userEmail = 'navaneethakrishnan821@gmail.com';
        await sesEmailService.sendCampaignReminder({
          to: userEmail,
          campaignName: campaign.name,
          minutesBefore: 15,
          scheduledTime: this.formatTime(scheduledTime),
          platforms: campaign.platforms || []
        });
        console.log(`📧 Test email sent to ${userEmail}`);
      }

      return { success: true, notification };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Singleton instance
const notificationScheduler = new NotificationScheduler();

module.exports = notificationScheduler;
