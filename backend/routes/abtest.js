const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ABTest = require('../models/ABTest');
const User = require('../models/User');
const { generateABTestVariations, analyzeABTestVariations, selectABTestWinner } = require('../services/geminiAI');

// Get all A/B tests for user
router.get('/', protect, async (req, res) => {
  try {
    const tests = await ABTest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ success: true, tests });
  } catch (error) {
    console.error('Get A/B tests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch A/B tests' });
  }
});

// Get single A/B test
router.get('/:id', protect, async (req, res) => {
  try {
    const test = await ABTest.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!test) {
      return res.status(404).json({ success: false, message: 'A/B test not found' });
    }
    
    res.json({ success: true, test });
  } catch (error) {
    console.error('Get A/B test error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch A/B test' });
  }
});

// Create new A/B test with AI variations
router.post('/create', protect, async (req, res) => {
  try {
    const { name, description, contentType, platform, baseContent, variationCount = 3 } = req.body;
    
    if (!name || !baseContent) {
      return res.status(400).json({ success: false, message: 'Name and base content are required' });
    }
    
    // Get user's business profile for context
    const user = await User.findById(req.user._id);
    const businessProfile = user?.businessProfile || {};
    
    // Generate AI variations
    console.log('🔄 Generating A/B test variations with AI...');
    const variations = await generateABTestVariations(
      baseContent,
      businessProfile,
      variationCount,
      contentType,
      platform
    );
    
    // Create the A/B test
    const abTest = new ABTest({
      userId: req.user._id,
      name,
      description,
      contentType: contentType || 'full',
      platform: platform || 'all',
      baseContent,
      variations,
      status: 'draft',
      settings: {
        maxVariations: variationCount
      }
    });
    
    await abTest.save();
    
    res.json({ 
      success: true, 
      test: abTest,
      message: `Created ${variations.length} variations for testing`
    });
  } catch (error) {
    console.error('Create A/B test error:', error);
    res.status(500).json({ success: false, message: 'Failed to create A/B test' });
  }
});

// Analyze variations and get AI recommendation
router.post('/:id/analyze', protect, async (req, res) => {
  try {
    const test = await ABTest.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!test) {
      return res.status(404).json({ success: false, message: 'A/B test not found' });
    }
    
    // Get user's business profile for context
    const user = await User.findById(req.user._id);
    const businessProfile = user?.businessProfile || {};
    
    console.log('🔍 Analyzing A/B test variations...');
    const analysis = await analyzeABTestVariations(
      test.variations,
      businessProfile,
      test.settings?.evaluationCriteria || 'balanced'
    );
    
    // Update variations with analysis
    if (analysis.variations) {
      test.variations = test.variations.map(v => {
        const analysisData = analysis.variations.find(a => a.id === v.id);
        if (analysisData) {
          return {
            ...v.toObject(),
            predictedMetrics: analysisData.predictedMetrics || v.predictedMetrics,
            aiAnalysis: analysisData.aiAnalysis || v.aiAnalysis
          };
        }
        return v;
      });
    }
    
    test.status = 'running';
    await test.save();
    
    res.json({ 
      success: true, 
      test,
      recommendation: analysis.recommendation,
      message: 'Variations analyzed successfully'
    });
  } catch (error) {
    console.error('Analyze A/B test error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze variations' });
  }
});

// Select winner (AI or manual)
router.post('/:id/select-winner', protect, async (req, res) => {
  try {
    const { variationId, selectionType = 'user' } = req.body;
    
    const test = await ABTest.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!test) {
      return res.status(404).json({ success: false, message: 'A/B test not found' });
    }
    
    let winnerId = variationId;
    let reason = 'Selected by user';
    
    // If AI selection, use Gemini to pick winner
    if (selectionType === 'ai') {
      const user = await User.findById(req.user._id);
      const businessProfile = user?.businessProfile || {};
      
      console.log('🏆 AI selecting A/B test winner...');
      const result = await selectABTestWinner(
        test.variations,
        businessProfile,
        test.settings?.evaluationCriteria || 'balanced'
      );
      
      winnerId = result.winnerId;
      reason = result.reason;
    }
    
    // Update winner status
    test.variations = test.variations.map(v => ({
      ...v.toObject(),
      isWinner: v.id === winnerId
    }));
    
    test.winner = {
      variationId: winnerId,
      selectedAt: new Date(),
      selectedBy: selectionType,
      reason
    };
    
    test.status = 'completed';
    test.completedAt = new Date();
    
    await test.save();
    
    res.json({ 
      success: true, 
      test,
      winner: test.variations.find(v => v.id === winnerId),
      message: `Winner selected: ${reason}`
    });
  } catch (error) {
    console.error('Select winner error:', error);
    res.status(500).json({ success: false, message: 'Failed to select winner' });
  }
});

// Regenerate a specific variation
router.post('/:id/regenerate/:variationId', protect, async (req, res) => {
  try {
    const test = await ABTest.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!test) {
      return res.status(404).json({ success: false, message: 'A/B test not found' });
    }
    
    const user = await User.findById(req.user._id);
    const businessProfile = user?.businessProfile || {};
    
    // Generate single new variation
    const newVariations = await generateABTestVariations(
      test.baseContent,
      businessProfile,
      1,
      test.contentType,
      test.platform
    );
    
    if (newVariations.length > 0) {
      const newVar = newVariations[0];
      newVar.id = req.params.variationId; // Keep same ID
      
      // Replace the variation
      test.variations = test.variations.map(v => 
        v.id === req.params.variationId ? newVar : v
      );
      
      await test.save();
    }
    
    res.json({ 
      success: true, 
      test,
      message: 'Variation regenerated'
    });
  } catch (error) {
    console.error('Regenerate variation error:', error);
    res.status(500).json({ success: false, message: 'Failed to regenerate variation' });
  }
});

// Delete A/B test
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await ABTest.deleteOne({ _id: req.params.id, userId: req.user._id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'A/B test not found' });
    }
    
    res.json({ success: true, message: 'A/B test deleted' });
  } catch (error) {
    console.error('Delete A/B test error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete A/B test' });
  }
});

module.exports = router;
