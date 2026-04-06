const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateImageFromCustomPrompt, refineImageWithPrompt } = require('../services/geminiAI');
const { uploadBase64Image } = require('../services/imageUploader');
const { deductCredits } = require('../middleware/trialGuard');
const { ensureCreditCycle } = require('../middleware/creditGuard');
const { composeImageToVideoWithAudio } = require('../services/mediaComposer');
const {
  downloadAndInspectVideoFromUrl,
  streamRemoteVideoAsDownload
} = require('../services/videoDownload');
const User = require('../models/User');

/**
 * @route   POST /api/content/regenerate-image
 * @desc    Refine/edit an existing image using Nano Banana 2
 * @access  Private
 */
router.post('/regenerate-image', protect, async (req, res) => {
  try {
    const { prompt, style, campaignId, industry, platform, currentImageUrl } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // Credit check (3 for image refinement)
    const user = await User.findById(req.user.userId || req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    await ensureCreditCycle(user);
    if (user.credits.balance < 3) {
      return res.status(403).json({ success: false, error: 'Insufficient credits', creditsRemaining: user.credits.balance, required: 3 });
    }

    const { originalImagePrompt, caption } = req.body;

    console.log(`🎨 Refine image request - prompt: "${prompt.substring(0, 80)}...", platform: ${platform || 'instagram'}`);

    const contextPrompt = originalImagePrompt || caption || 'marketing image';

    // Use refineImageWithPrompt (Nano Banana 2) for editing
    const result = await refineImageWithPrompt(contextPrompt, prompt, style || 'professional', currentImageUrl);

    if (!result.success || !result.imageUrl) {
      return res.status(500).json({ success: false, error: result.error || 'Failed to refine image' });
    }

    // Deduct 3 credits for image refinement
    const creditResult = await deductCredits(user._id, 'refine_image', 1, 'Refine image with AI');

    res.json({
      success: true,
      imageUrl: result.imageUrl,
      prompt,
      creditsRemaining: creditResult.creditsRemaining
    });
  } catch (error) {
    console.error('❌ Refine image error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Failed to refine image' });
  }
});

/**
 * @route   POST /api/content/generate
 * @desc    Generate content (caption, hashtags, etc.) for a given topic/platform
 * @access  Private
 */
router.post('/generate', protect, async (req, res) => {
  try {
    const { type, platform, topic, tone, keywords } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    // Placeholder — wire up to a dedicated content generation function if needed
    res.json({
      success: true,
      message: 'Content generation endpoint — not yet implemented',
      params: { type, platform, topic, tone, keywords }
    });
  } catch (error) {
    console.error('Content generate error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/content/modify
 * @desc    Modify existing content draft
 * @access  Private
 */
router.post('/modify', protect, async (req, res) => {
  try {
    const { draftId, modifications } = req.body;

    // Placeholder — wire up to a content modification function if needed
    res.json({
      success: true,
      message: 'Content modification endpoint — not yet implemented',
      params: { draftId, modifications }
    });
  } catch (error) {
    console.error('Content modify error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/content/image-audio-to-video
 * @desc    Convert image + audio into MP4 video for Instagram
 * @access  Private
 */
router.post('/image-audio-to-video', protect, async (req, res) => {
  try {
    const { imageUrl, audioUrl } = req.body;

    // Validate inputs
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid imageUrl is required' });
    }
    if (!audioUrl || typeof audioUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid audioUrl is required' });
    }

    // Get user for credit check
    const user = await User.findById(req.user.userId || req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Ensure credit cycle is up to date
    await ensureCreditCycle(user);

    // Check if user has sufficient credits (2 credits for video composition)
    if (user.credits.balance < 2) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient credits for video composition',
        creditsRemaining: user.credits.balance,
        required: 2
      });
    }

    console.log(`🎬 [VIDEO COMPOSITION] Starting image + audio to video conversion`);
    console.log(`   User: ${user._id}`);
    console.log(`   Image URL: ${imageUrl.substring(0, 80)}...`);
    console.log(`   Audio URL: ${audioUrl.substring(0, 80)}...`);

    const requestedDurationSeconds = Number(req.body.durationSeconds || req.body.requestedDurationSeconds || 0);

    // Compose video
    const result = await composeImageToVideoWithAudio({
      imageUrl,
      audioUrl,
      requestedDurationSeconds: Number.isFinite(requestedDurationSeconds) ? requestedDurationSeconds : null,
      cloudinaryFolder: 'nebula-instagram-audio-posts'
    });

    if (!result.success) {
      console.error(`❌ [VIDEO COMPOSITION FAILED] ${result.error}`);
      return res.status(400).json({
        success: false,
        error: result.error,
        validation: result.validation,
        metadata: result.metadata,
        audioValidation: result.audioValidation
      });
    }

    // Deduct 2 credits for video composition
    const creditResult = await deductCredits(
      user._id,
      'compose_video',
      1,
      'Convert image + audio to video'
    );

    console.log(`✅ [VIDEO COMPOSITION SUCCESS]`);
    console.log(`   Video URL: ${result.videoUrl.substring(0, 100)}...`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Size: ${(result.bytes / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Credits deducted: 2, Remaining: ${creditResult.creditsRemaining}`);

    return res.json({
      success: true,
      videoUrl: result.videoUrl,
      publicId: result.publicId,
      duration: result.duration,
      bytes: result.bytes,
      metadata: result.metadata,
      validation: result.validation,
      creditsRemaining: creditResult.creditsRemaining
    });
  } catch (error) {
    console.error('❌ [VIDEO COMPOSITION ERROR]', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to compose video',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/content/download-video
 * @desc    Download a generated Cloudinary MP4 to the backend downloads folder and inspect it
 * @access  Private
 */
router.post('/download-video', protect, async (req, res) => {
  try {
    const { videoUrl, fileName, inspect = true } = req.body;

    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid videoUrl is required' });
    }

    console.log('[VIDEO DOWNLOAD] Saving generated video locally...');
    console.log(`   - URL: ${videoUrl.substring(0, 120)}${videoUrl.length > 120 ? '...' : ''}`);
    console.log(`   - Requested file name: ${fileName || '(auto)'}`);

    const result = await downloadAndInspectVideoFromUrl(videoUrl, {
      fileName,
      inspect: inspect !== false
    });

    console.log('[VIDEO DOWNLOAD] Saved successfully');
    console.log(`   - Local path: ${result.filePath}`);
    console.log(`   - Size: ${(result.bytes / 1024 / 1024).toFixed(2)} MB`);
    if (result.inspection?.summary) {
      console.log(`   - Audio present: ${result.inspection.summary.hasAudio}`);
      console.log(`   - Duration: ${result.inspection.summary.durationSeconds || 'unknown'}s`);
      console.log(`   - Resolution: ${result.inspection.summary.resolution || 'unknown'}`);
    }

    return res.json({
      success: true,
      download: {
        filePath: result.filePath,
        fileName: result.fileName,
        bytes: result.bytes,
        contentType: result.contentType
      },
      inspection: result.inspection
    });
  } catch (error) {
    console.error('[VIDEO DOWNLOAD] Failed:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to download video'
    });
  }
});

/**
 * @route   GET /api/content/download-video
 * @desc    Proxy a generated Cloudinary MP4 as a browser download
 * @access  Private
 */
router.get('/download-video', protect, async (req, res) => {
  try {
    const { url: videoUrl, fileName } = req.query;

    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Query parameter "url" is required' });
    }

    console.log('[VIDEO DOWNLOAD] Streaming video to browser download...');
    console.log(`   - URL: ${videoUrl.substring(0, 120)}${videoUrl.length > 120 ? '...' : ''}`);

    await streamRemoteVideoAsDownload(videoUrl, res, { fileName });
  } catch (error) {
    console.error('[VIDEO DOWNLOAD] Browser download failed:', error.message);
    if (!res.headersSent) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to stream video download'
      });
    }
    res.end();
  }
});

/**
 * @route   POST /api/content/:draftId/compliance-check
 * @desc    Check content draft for compliance issues
 * @access  Private
 */
router.post('/:draftId/compliance-check', protect, async (req, res) => {
  try {
    const { draftId } = req.params;

    // Placeholder — wire up to a compliance checking function if needed
    res.json({
      success: true,
      compliant: true,
      issues: [],
      draftId
    });
  } catch (error) {
    console.error('Compliance check error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
