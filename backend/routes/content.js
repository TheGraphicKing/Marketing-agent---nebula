/**
 * Content Studio Routes
 * AI-powered content generation with Gemini + Grok
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ContentDraft = require('../models/ContentDraft');
const BrandProfile = require('../models/BrandProfile');
const {
  generatePostVariants,
  generateLongForm,
  generateHashtags,
  checkCompliance,
  generateWithLLM
} = require('../services/llmRouter');

/**
 * POST /api/content/generate
 * Generate content with variants
 */
router.post('/generate', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      platform,
      topic,
      tone = 'professional',
      objective = 'engagement',
      cta,
      brandId,
      contentType = 'post'
    } = req.body;
    
    if (!platform || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Platform and topic are required'
      });
    }
    
    // Get brand context if provided
    let brandContext = '';
    let brandProfile = null;
    if (brandId) {
      brandProfile = await BrandProfile.findOne({ _id: brandId, userId });
      if (brandProfile) {
        brandContext = `
Brand: ${brandProfile.name}
Industry: ${brandProfile.industry}
Voice: ${brandProfile.brandVoice}
Target: ${brandProfile.targetCustomer || brandProfile.targetAudience?.demographics?.join(', ')}
USPs: ${brandProfile.uniqueSellingPoints?.join(', ')}`;
      }
    }
    
    // Generate short-form variants with Grok (creative/punchy)
    const variantsResult = await generatePostVariants(
      topic,
      platform,
      tone,
      cta || 'Learn more',
      5
    );
    
    const variants = (variantsResult.variants || []).map((v, i) => ({
      content: typeof v === 'string' ? v : v.content || v.text || JSON.stringify(v),
      version: i + 1,
      provider: 'grok',
      modifiers: [],
      createdAt: new Date(),
      selected: i === 0
    }));
    
    // Generate long-form version with Gemini
    const longFormResult = await generateLongForm(
      `${topic}${brandContext ? `\n\nContext:${brandContext}` : ''}`,
      platform,
      tone
    );
    
    // Generate hashtags with Gemini
    const hashtagResult = await generateHashtags(
      `Topic: ${topic}\nPlatform: ${platform}${brandContext}`,
      platform,
      15
    );
    
    // Run compliance check
    const complianceResult = await checkCompliance(
      variants[0]?.content || longFormResult
    );
    
    // Create content draft
    const draft = new ContentDraft({
      userId,
      title: `${topic.substring(0, 50)}...`,
      platform,
      contentType,
      topic,
      objective,
      tone,
      cta,
      variants,
      longFormContent: {
        content: typeof longFormResult === 'string' ? longFormResult : JSON.stringify(longFormResult),
        wordCount: (typeof longFormResult === 'string' ? longFormResult : '').split(/\s+/).length,
        generatedAt: new Date()
      },
      hashtags: {
        suggested: hashtagResult.hashtags || [],
        categories: hashtagResult.categories || {},
        generatedAt: new Date()
      },
      compliance: {
        isCompliant: complianceResult.isCompliant !== false,
        issues: complianceResult.issues || [],
        suggestions: complianceResult.suggestions || [],
        riskLevel: complianceResult.riskLevel || 'low',
        checkedAt: new Date()
      },
      relatedBrand: brandProfile?._id,
      status: 'draft'
    });
    
    await draft.save();
    
    res.json({
      success: true,
      draft: {
        id: draft._id,
        title: draft.title,
        platform: draft.platform,
        topic: draft.topic,
        variants: draft.variants,
        longFormContent: draft.longFormContent,
        hashtags: draft.hashtags,
        compliance: draft.compliance
      },
      generatedBy: {
        variants: 'grok',
        longForm: 'gemini',
        hashtags: 'gemini',
        compliance: 'gemini'
      }
    });
    
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorType: 'generation_failed'
    });
  }
});

/**
 * POST /api/content/:id/regenerate
 * Regenerate variants with modifier
 */
router.post('/:id/regenerate', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { modifier } = req.body; // 'shorten', 'add_humor', 'more_premium', 'more_direct'
    
    const draft = await ContentDraft.findOne({ _id: req.params.id, userId });
    
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Content draft not found' });
    }
    
    // Build modifier prompt
    const modifierPrompts = {
      'shorten': 'Make it shorter and more concise. Maximum 2 sentences.',
      'add_humor': 'Add wit, humor, and personality. Make it fun and engaging.',
      'more_premium': 'Make it more sophisticated, premium, and exclusive-feeling.',
      'more_direct': 'Be more direct, bold, and action-oriented. Cut the fluff.',
      'add_emoji': 'Add relevant emojis to make it more engaging.',
      'make_casual': 'Make it more casual and conversational.',
      'add_urgency': 'Add urgency and FOMO elements.'
    };
    
    const modifierInstruction = modifierPrompts[modifier] || modifier;
    
    // Get the current best variant or selected one
    const currentContent = draft.variants.find(v => v.selected)?.content || 
                          draft.variants[0]?.content || 
                          draft.topic;
    
    // Generate new variants with Grok
    const newVariants = await generateWithLLM({
      provider: 'grok',
      taskType: 'content_regeneration',
      prompt: `Regenerate this ${draft.platform} content with this modification:
      
Original: "${currentContent}"

Modification: ${modifierInstruction}

Generate 3 new creative variants.`,
      jsonSchema: {
        required: ['variants'],
        properties: { variants: { type: 'array' } }
      }
    });
    
    // Add new variants
    const addedVariants = (newVariants.variants || []).map((v, i) => ({
      content: typeof v === 'string' ? v : v.content || v.text || JSON.stringify(v),
      version: draft.variants.length + i + 1,
      provider: 'grok',
      modifiers: [modifier],
      createdAt: new Date(),
      selected: false
    }));
    
    draft.variants.push(...addedVariants);
    await draft.save();
    
    res.json({
      success: true,
      newVariants: addedVariants,
      totalVariants: draft.variants.length
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/content/:id/select
 * Select a variant as the final content
 */
router.put('/:id/select', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { variantIndex } = req.body;
    
    const draft = await ContentDraft.findOne({ _id: req.params.id, userId });
    
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Content draft not found' });
    }
    
    if (variantIndex < 0 || variantIndex >= draft.variants.length) {
      return res.status(400).json({ success: false, error: 'Invalid variant index' });
    }
    
    // Unselect all, select the chosen one
    draft.variants.forEach((v, i) => {
      v.selected = i === variantIndex;
    });
    
    draft.selectedVariantIndex = variantIndex;
    draft.finalContent = draft.variants[variantIndex].content;
    await draft.save();
    
    res.json({
      success: true,
      selectedVariant: draft.variants[variantIndex],
      finalContent: draft.finalContent
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/content/:id/compliance-check
 * Re-run compliance check on content
 */
router.post('/:id/compliance-check', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { content } = req.body;
    
    const draft = await ContentDraft.findOne({ _id: req.params.id, userId });
    
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Content draft not found' });
    }
    
    const contentToCheck = content || draft.finalContent || draft.variants[0]?.content;
    
    const complianceResult = await checkCompliance(contentToCheck);
    
    draft.compliance = {
      isCompliant: complianceResult.isCompliant !== false,
      issues: complianceResult.issues || [],
      suggestions: complianceResult.suggestions || [],
      riskLevel: complianceResult.riskLevel || 'low',
      checkedAt: new Date()
    };
    
    await draft.save();
    
    res.json({
      success: true,
      compliance: draft.compliance
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content/drafts
 * Get all content drafts
 */
router.get('/drafts', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, platform, limit = 50 } = req.query;
    
    const query = { userId };
    if (status) query.status = status;
    if (platform) query.platform = platform;
    
    const drafts = await ContentDraft.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      drafts: drafts.map(d => ({
        id: d._id,
        title: d.title,
        platform: d.platform,
        topic: d.topic,
        status: d.status,
        variantCount: d.variants.length,
        compliance: d.compliance,
        createdAt: d.createdAt
      }))
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content/:id
 * Get single content draft
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const draft = await ContentDraft.findOne({ _id: req.params.id, userId });
    
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Content draft not found' });
    }
    
    res.json({ success: true, draft });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/content/:id
 * Update content draft
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const draft = await ContentDraft.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true }
    );
    
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Content draft not found' });
    }
    
    res.json({ success: true, draft });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/content/:id
 * Delete content draft
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const result = await ContentDraft.findOneAndDelete({ _id: req.params.id, userId });
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Content draft not found' });
    }
    
    res.json({ success: true, message: 'Content draft deleted' });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/content/:id/approve
 * Approve content for publishing
 */
router.post('/:id/approve', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const draft = await ContentDraft.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status: 'approved' },
      { new: true }
    );
    
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Content draft not found' });
    }
    
    res.json({ success: true, draft });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
