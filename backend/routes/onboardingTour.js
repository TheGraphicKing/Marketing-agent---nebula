const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const OnboardingProgress = require('../models/OnboardingProgress');

// Tour configuration
const TOUR_STEPS = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Welcome to Gravity! 🚀',
    content: 'Your AI-powered marketing command center. Let\'s take a quick tour to get you started.',
    placement: 'center',
    page: '/dashboard'
  },
  {
    id: 'dashboard-overview',
    target: '[data-tour="dashboard-cards"]',
    title: 'Your Marketing Overview',
    content: 'See your key metrics at a glance - campaigns, engagement, brand score, and budget spent.',
    placement: 'bottom',
    page: '/dashboard'
  },
  {
    id: 'brand-score',
    target: '[data-tour="brand-score"]',
    title: 'AI Brand Score',
    content: 'Your brand health score, calculated by AI based on engagement, consistency, and audience growth.',
    placement: 'left',
    page: '/dashboard'
  },
  {
    id: 'competitor-activity',
    target: '[data-tour="competitor-activity"]',
    title: 'Competitor Insights',
    content: 'Monitor what your competitors are posting and get AI-generated response suggestions.',
    placement: 'top',
    page: '/dashboard'
  },
  {
    id: 'campaigns-page',
    target: '[data-tour="nav-campaigns"]',
    title: 'Campaign Builder',
    content: 'Create AI-powered marketing campaigns. Our AI generates captions, hashtags, and images for you.',
    placement: 'right',
    page: '/campaigns'
  },
  {
    id: 'create-campaign',
    target: '[data-tour="create-campaign"]',
    title: 'AI Campaign Creation',
    content: 'Click here to create a new campaign. Answer a few questions and let AI do the heavy lifting.',
    placement: 'bottom',
    page: '/campaigns'
  },
  {
    id: 'influencers-page',
    target: '[data-tour="nav-influencers"]',
    title: 'Influencer Discovery',
    content: 'Find the perfect influencers for your brand using AI matching and social media analysis.',
    placement: 'right',
    page: '/influencers'
  },
  {
    id: 'competitors-page',
    target: '[data-tour="nav-competitors"]',
    title: 'Competitor Analysis',
    content: 'Track competitors, analyze their strategies, and get actionable insights.',
    placement: 'right',
    page: '/competitors'
  },
  {
    id: 'chatbot',
    target: '[data-tour="chatbot"]',
    title: 'AI Marketing Assistant',
    content: 'Need help? Chat with our AI assistant for marketing advice, campaign ideas, or any questions.',
    placement: 'left',
    page: 'any'
  },
  {
    id: 'complete',
    target: 'body',
    title: 'You\'re All Set! 🎉',
    content: 'You now know the basics. Start by creating your first campaign or exploring your dashboard.',
    placement: 'center',
    page: '/dashboard'
  }
];

// Get tour configuration
router.get('/tour-config', protect, async (req, res) => {
  try {
    let progress = await OnboardingProgress.findOne({ userId: req.user._id });
    
    if (!progress) {
      progress = new OnboardingProgress({ userId: req.user._id });
      await progress.save();
    }
    
    res.json({ 
      success: true, 
      steps: TOUR_STEPS,
      progress: {
        tourCompleted: progress.tourCompleted,
        currentStep: progress.currentStep,
        completedSteps: progress.completedSteps,
        preferences: progress.preferences
      }
    });
  } catch (error) {
    console.error('Get tour config error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tour config' });
  }
});

// Update tour progress
router.post('/tour-progress', protect, async (req, res) => {
  try {
    const { stepId, currentStep, completed } = req.body;
    
    let progress = await OnboardingProgress.findOne({ userId: req.user._id });
    
    if (!progress) {
      progress = new OnboardingProgress({ userId: req.user._id });
    }
    
    if (stepId && !progress.completedSteps.find(s => s.stepId === stepId)) {
      progress.completedSteps.push({
        stepId,
        completedAt: new Date()
      });
    }
    
    if (typeof currentStep === 'number') {
      progress.currentStep = currentStep;
    }
    
    if (completed) {
      progress.tourCompleted = true;
      progress.tourCompletedAt = new Date();
    }
    
    await progress.save();
    
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Update tour progress error:', error);
    res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
});

// Mark feature as discovered
router.post('/feature-discovered', protect, async (req, res) => {
  try {
    const { feature } = req.body;
    
    let progress = await OnboardingProgress.findOne({ userId: req.user._id });
    
    if (!progress) {
      progress = new OnboardingProgress({ userId: req.user._id });
    }
    
    if (feature && !progress.featuresDiscovered.find(f => f.feature === feature)) {
      progress.featuresDiscovered.push({
        feature,
        discoveredAt: new Date()
      });
    }
    
    await progress.save();
    
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Feature discovered error:', error);
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
});

// Dismiss tooltip
router.post('/dismiss-tooltip', protect, async (req, res) => {
  try {
    const { tooltipId } = req.body;
    
    let progress = await OnboardingProgress.findOne({ userId: req.user._id });
    
    if (!progress) {
      progress = new OnboardingProgress({ userId: req.user._id });
    }
    
    if (tooltipId && !progress.dismissedTooltips.includes(tooltipId)) {
      progress.dismissedTooltips.push(tooltipId);
    }
    
    await progress.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Dismiss tooltip error:', error);
    res.status(500).json({ success: false, message: 'Failed to dismiss' });
  }
});

// Reset tour (for testing or user request)
router.post('/reset-tour', protect, async (req, res) => {
  try {
    await OnboardingProgress.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          tourCompleted: false,
          tourCompletedAt: null,
          completedSteps: [],
          currentStep: 0
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true, message: 'Tour reset successfully' });
  } catch (error) {
    console.error('Reset tour error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset tour' });
  }
});

// Submit tour feedback
router.post('/tour-feedback', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    await OnboardingProgress.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          feedback: {
            rating,
            comment,
            submittedAt: new Date()
          }
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true, message: 'Feedback submitted' });
  } catch (error) {
    console.error('Tour feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

// Update preferences
router.put('/preferences', protect, async (req, res) => {
  try {
    const { showHints, autoPlayTour } = req.body;
    
    await OnboardingProgress.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          'preferences.showHints': showHints,
          'preferences.autoPlayTour': autoPlayTour
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, message: 'Failed to update preferences' });
  }
});

module.exports = router;
