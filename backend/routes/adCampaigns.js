const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const AdCampaign = require('../models/AdCampaign');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { getAdAccounts, boostPost, updateAd } = require('../services/socialMediaAPI');

function getUserId(req) {
  return req.user?._id || req.user?.id || req.user?.userId || null;
}

function toObjectId(value) {
  const raw = String(value || '').trim();
  if (!mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

function normalizePlatformSelection(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'meta') return 'meta';
  if (raw === 'google') return 'google';
  if (raw === 'both') return 'both';
  return '';
}

function normalizeCurrency(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(raw)) return '';
  return raw;
}

function buildFailedPlatformResult(message, errorCode = '') {
  return {
    status: 'failed',
    message: String(message || 'Platform request failed'),
    externalAdId: '',
    errorCode: String(errorCode || ''),
    currency: ''
  };
}

function buildSkippedPlatformResult(message) {
  return {
    status: 'skipped',
    message: String(message || 'Not selected'),
    externalAdId: '',
    errorCode: '',
    currency: ''
  };
}

async function getProfileKey(userId) {
  if (!userId) return '';
  const user = await User.findById(userId).select('ayrshare.profileKey');
  return String(user?.ayrshare?.profileKey || '').trim();
}

function extractAccountList(accountsPayload) {
  if (!accountsPayload) return [];
  const raw = accountsPayload.adAccounts || accountsPayload.data || accountsPayload;
  return Array.isArray(raw) ? raw : [];
}

function selectFirstAdAccount(accounts = []) {
  if (!Array.isArray(accounts) || accounts.length === 0) return null;
  return accounts[0];
}

async function runMetaAdCreation({
  profileKey = '',
  campaignDoc,
  budgetAmount,
  currency,
  startDate,
  endDate
}) {
  if (!profileKey) {
    return buildFailedPlatformResult('Meta Ads not connected. Connect social/ad account first.', 'META_NOT_CONNECTED');
  }

  const postId = String(campaignDoc?.socialPostId || '').trim();
  if (!postId) {
    return buildFailedPlatformResult(
      'Meta ad creation requires a published campaign post. Publish the campaign first.',
      'POST_NOT_PUBLISHED'
    );
  }

  const accountResult = await getAdAccounts(profileKey);
  if (!accountResult?.success) {
    return buildFailedPlatformResult(
      accountResult?.error || 'Failed to load Meta ad accounts.',
      'META_ACCOUNT_FETCH_FAILED'
    );
  }

  const accounts = extractAccountList(accountResult.data);
  const account = selectFirstAdAccount(accounts);
  if (!account) {
    return buildFailedPlatformResult('No Meta ad account found for this user.', 'META_ACCOUNT_MISSING');
  }

  const adAccountId = String(
    account.accountId || account.id || account.account_id || account.adAccountId || ''
  ).trim();
  if (!adAccountId) {
    return buildFailedPlatformResult('Meta ad account identifier is missing.', 'META_ACCOUNT_INVALID');
  }

  const accountCurrency = normalizeCurrency(account.currency || account.accountCurrency || '');
  if (accountCurrency && accountCurrency !== currency) {
    return {
      status: 'failed',
      message: `Currency mismatch: selected ${currency}, but Meta account uses ${accountCurrency}.`,
      externalAdId: '',
      errorCode: 'CURRENCY_MISMATCH',
      currency: accountCurrency
    };
  }

  const metaResult = await boostPost(profileKey, {
    postId,
    adAccountId,
    goal: 'engagement',
    dailyBudget: budgetAmount,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  if (!metaResult?.success) {
    return buildFailedPlatformResult(
      metaResult?.error || 'Meta Ads API call failed.',
      'META_CREATE_FAILED'
    );
  }

  const externalAdId = String(
    metaResult?.data?.adId ||
      metaResult?.data?.id ||
      metaResult?.data?.data?.adId ||
      ''
  ).trim();

  return {
    status: 'success',
    message: 'Meta ad created successfully.',
    externalAdId,
    errorCode: '',
    currency: accountCurrency || currency
  };
}

async function runGoogleAdCreation() {
  // Placeholder for real Google Ads integration.
  if (String(process.env.GOOGLE_ADS_SIMULATE_SUCCESS || '').toLowerCase() === 'true') {
    return {
      status: 'success',
      message: 'Google ad created successfully (simulated).',
      externalAdId: `google-sim-${Date.now()}`,
      errorCode: '',
      currency: ''
    };
  }

  return buildFailedPlatformResult(
    'Google Ads API is not configured for this environment.',
    'GOOGLE_NOT_CONFIGURED'
  );
}

function getSelectedPlatforms(platformSelection) {
  return platformSelection === 'both' ? ['meta', 'google'] : [platformSelection];
}

function deriveOverallStatus({ platformSelection, platformStatus, startDate }) {
  const selectedPlatforms = getSelectedPlatforms(platformSelection);

  const successCount = selectedPlatforms.filter(
    (name) => platformStatus?.[name]?.status === 'success'
  ).length;
  const failedCount = selectedPlatforms.filter(
    (name) => platformStatus?.[name]?.status === 'failed'
  ).length;

  if (successCount === 0 && failedCount > 0) return 'failed';
  if (successCount > 0 && failedCount > 0) return 'partial';

  if (successCount === 0) return 'scheduled';

  const now = new Date();
  if (startDate > now) return 'scheduled';
  return 'active';
}

function getStatusMessage(status) {
  if (status === 'failed') {
    return 'Ad campaign created with platform failures. Check platform status for details.';
  }
  if (status === 'partial') {
    return 'Ad campaign created with partial platform success.';
  }
  return 'Ad campaign created successfully.';
}

/**
 * @route   GET /api/ad-campaigns
 * @desc    List ad campaigns linked to marketing campaigns
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    const items = await AdCampaign.find({ userId })
      .sort({ createdAt: -1 })
      .populate('campaignId', 'name status');

    res.json({
      success: true,
      adCampaigns: items
    });
  } catch (error) {
    console.error('Failed to list ad campaigns:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ad campaigns' });
  }
});

/**
 * @route   GET /api/ad-campaigns/summary
 * @desc    Summary metrics for dashboard cards
 * @access  Private
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    const items = await AdCampaign.find({ userId }).select('status performance');

    const totalAdCampaigns = items.length;
    const activeAdCampaigns = items.filter((item) => item.status === 'active').length;
    const totalClicks = items.reduce((sum, item) => sum + Number(item?.performance?.clicks || 0), 0);
    const totalImpressions = items.reduce(
      (sum, item) => sum + Number(item?.performance?.impressions || 0),
      0
    );
    const totalSpend = items.reduce((sum, item) => sum + Number(item?.performance?.spend || 0), 0);
    const ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    res.json({
      success: true,
      summary: {
        totalAdCampaigns,
        activeAdCampaigns,
        metrics: {
          clicks: totalClicks,
          impressions: totalImpressions,
          ctr,
          spend: totalSpend
        }
      }
    });
  } catch (error) {
    console.error('Failed to get ad campaign summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ad campaign summary' });
  }
});

/**
 * @route   POST /api/ad-campaigns
 * @desc    Create ad campaign from existing campaign context (no standalone creation)
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    const campaignId = toObjectId(req.body?.campaignId);
    const platformSelection = normalizePlatformSelection(req.body?.platformSelection);
    const budgetAmount = Number(req.body?.budget);
    const currency = normalizeCurrency(req.body?.currency);
    const startDate = new Date(req.body?.startDate);
    const endDate = new Date(req.body?.endDate);

    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'Campaign selection is required.' });
    }
    if (!platformSelection) {
      return res
        .status(400)
        .json({ success: false, message: 'Platform must be Meta Ads, Google Ads, or Both.' });
    }
    if (!Number.isFinite(budgetAmount) || budgetAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Budget must be greater than 0.' });
    }
    if (!currency) {
      return res.status(400).json({ success: false, message: 'Currency must be a 3-letter code.' });
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Start date and end date are required.' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ success: false, message: 'End date must be after start date.' });
    }

    const campaignDoc = await Campaign.findOne({ _id: campaignId, userId });
    if (!campaignDoc) {
      return res.status(404).json({ success: false, message: 'Source campaign not found.' });
    }

    const adTitle = String(campaignDoc?.name || '').trim() || 'Campaign Ad';
    const adDescription = String(
      campaignDoc?.creative?.captions || campaignDoc?.creative?.textContent || campaignDoc?.notes || ''
    ).trim();
    const adCreativeUrl = String(
      (Array.isArray(campaignDoc?.creative?.imageUrls) && campaignDoc.creative.imageUrls[0]) ||
        campaignDoc?.creative?.videoUrl ||
        ''
    ).trim();

    const profileKey = await getProfileKey(userId);

    let metaStatus = buildSkippedPlatformResult('Meta platform not selected.');
    let googleStatus = buildSkippedPlatformResult('Google platform not selected.');

    if (platformSelection === 'meta' || platformSelection === 'both') {
      metaStatus = await runMetaAdCreation({
        profileKey,
        campaignDoc,
        budgetAmount,
        currency,
        startDate,
        endDate
      });
    }

    if (platformSelection === 'google' || platformSelection === 'both') {
      googleStatus = await runGoogleAdCreation();
    }

    const platformStatus = {
      meta: metaStatus,
      google: googleStatus
    };

    const status = deriveOverallStatus({
      platformSelection,
      platformStatus,
      startDate
    });

    const adCampaign = await AdCampaign.create({
      userId,
      campaignId,
      adTitle,
      adDescription,
      adCreativeUrl,
      platformSelection,
      budget: {
        amount: budgetAmount,
        currency
      },
      schedule: {
        startDate,
        endDate
      },
      status,
      platformStatus
    });

    const message = getStatusMessage(status);

    res.status(201).json({
      success: true,
      message,
      adCampaign
    });
  } catch (error) {
    console.error('Failed to create ad campaign:', error);
    res.status(500).json({ success: false, message: 'Failed to create ad campaign' });
  }
});

/**
 * @route   POST /api/ad-campaigns/:id/retry
 * @desc    Retry failed platforms for an existing ad campaign
 * @access  Private
 */
router.post('/:id/retry', protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    const adCampaign = await AdCampaign.findOne({ _id: req.params.id, userId });
    if (!adCampaign) {
      return res.status(404).json({ success: false, message: 'Ad campaign not found.' });
    }

    const campaignDoc = await Campaign.findOne({ _id: adCampaign.campaignId, userId });
    if (!campaignDoc) {
      return res.status(404).json({ success: false, message: 'Source campaign not found.' });
    }

    const platformSelection = normalizePlatformSelection(adCampaign.platformSelection);
    if (!platformSelection) {
      return res.status(400).json({ success: false, message: 'Ad campaign platform configuration is invalid.' });
    }

    const selectedPlatforms = getSelectedPlatforms(platformSelection);
    const profileKey = await getProfileKey(userId);

    const budgetAmount = Number(adCampaign?.budget?.amount || 0);
    const currency = normalizeCurrency(adCampaign?.budget?.currency);
    const startDate = new Date(adCampaign?.schedule?.startDate);
    const endDate = new Date(adCampaign?.schedule?.endDate);

    if (!Number.isFinite(budgetAmount) || budgetAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Ad campaign budget is invalid.' });
    }
    if (!currency) {
      return res.status(400).json({ success: false, message: 'Ad campaign currency is invalid.' });
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Ad campaign schedule is invalid.' });
    }

    const currentPlatformStatus = {
      meta: adCampaign?.platformStatus?.meta || buildSkippedPlatformResult('Meta platform not selected.'),
      google: adCampaign?.platformStatus?.google || buildSkippedPlatformResult('Google platform not selected.')
    };

    const retryTargets = selectedPlatforms.filter(
      (name) => currentPlatformStatus?.[name]?.status === 'failed'
    );

    if (retryTargets.length === 0) {
      await adCampaign.populate('campaignId', 'name status');
      return res.json({
        success: true,
        message: 'No failed platforms to retry.',
        adCampaign
      });
    }

    const nextPlatformStatus = {
      meta: currentPlatformStatus.meta,
      google: currentPlatformStatus.google
    };

    if (retryTargets.includes('meta')) {
      nextPlatformStatus.meta = await runMetaAdCreation({
        profileKey,
        campaignDoc,
        budgetAmount,
        currency,
        startDate,
        endDate
      });
    }

    if (retryTargets.includes('google')) {
      nextPlatformStatus.google = await runGoogleAdCreation();
    }

    const nextStatus = deriveOverallStatus({
      platformSelection,
      platformStatus: nextPlatformStatus,
      startDate
    });

    adCampaign.platformStatus = nextPlatformStatus;
    adCampaign.status = nextStatus;
    await adCampaign.save();
    await adCampaign.populate('campaignId', 'name status');

    res.json({
      success: true,
      message: nextStatus === 'failed' ? 'Retry completed, but selected platforms are still failing.' : 'Campaign retry completed.',
      adCampaign
    });
  } catch (error) {
    console.error('Failed to retry ad campaign:', error);
    res.status(500).json({ success: false, message: 'Failed to retry ad campaign' });
  }
});

/**
 * @route   DELETE /api/ad-campaigns/:id
 * @desc    Delete ad campaign
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    const deleted = await AdCampaign.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Ad campaign not found.' });
    }

    res.json({
      success: true,
      message: 'Ad campaign deleted successfully.',
      id: deleted._id
    });
  } catch (error) {
    console.error('Failed to delete ad campaign:', error);
    res.status(500).json({ success: false, message: 'Failed to delete ad campaign' });
  }
});

/**
 * @route   PUT /api/ad-campaigns/:id/status
 * @desc    Pause/resume ad campaign and sync Meta status when possible
 * @access  Private
 */
router.put('/:id/status', protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    const targetStatus = String(req.body?.status || '').trim().toLowerCase();
    if (!['active', 'paused'].includes(targetStatus)) {
      return res.status(400).json({ success: false, message: 'Status must be active or paused.' });
    }

    const adCampaign = await AdCampaign.findOne({ _id: req.params.id, userId });
    if (!adCampaign) {
      return res.status(404).json({ success: false, message: 'Ad campaign not found.' });
    }

    const profileKey = await getProfileKey(userId);
    const metaExternalId = String(adCampaign?.platformStatus?.meta?.externalAdId || '').trim();
    if (profileKey && metaExternalId) {
      try {
        const metaStatus = targetStatus === 'paused' ? 'PAUSED' : 'ACTIVE';
        const syncResult = await updateAd(profileKey, metaExternalId, { status: metaStatus });
        if (!syncResult?.success) {
          adCampaign.platformStatus.meta.message =
            syncResult?.error || `Failed to sync Meta status to ${targetStatus}.`;
        }
      } catch (syncError) {
        adCampaign.platformStatus.meta.message = `Failed to sync Meta status: ${syncError.message}`;
      }
    }

    adCampaign.status = targetStatus;
    await adCampaign.save();

    res.json({
      success: true,
      adCampaign,
      message: `Ad campaign ${targetStatus === 'paused' ? 'paused' : 'resumed'} successfully.`
    });
  } catch (error) {
    console.error('Failed to update ad campaign status:', error);
    res.status(500).json({ success: false, message: 'Failed to update ad campaign status' });
  }
});

module.exports = router;
