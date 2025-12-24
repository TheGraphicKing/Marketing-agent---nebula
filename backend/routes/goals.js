const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Goal = require('../models/Goal');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const { analyzeGoalProgress, generateGoalRecommendations } = require('../services/geminiAI');

// Get all goals for user
router.get('/', protect, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id })
      .sort({ endDate: 1 });
    
    // Calculate progress for each goal
    const goalsWithProgress = goals.map(goal => {
      const obj = goal.toObject();
      obj.progressPercentage = goal.progressPercentage;
      obj.daysRemaining = goal.daysRemaining;
      return obj;
    });
    
    res.json({ success: true, goals: goalsWithProgress });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch goals' });
  }
});

// Get single goal
router.get('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    
    const goalObj = goal.toObject();
    goalObj.progressPercentage = goal.progressPercentage;
    goalObj.daysRemaining = goal.daysRemaining;
    
    res.json({ success: true, goal: goalObj });
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch goal' });
  }
});

// Create new goal
router.post('/create', protect, async (req, res) => {
  try {
    const { name, type, platform, period, target, startValue, unit, startDate, endDate, color, icon, priority, notes } = req.body;
    
    if (!name || !type || !target || !endDate) {
      return res.status(400).json({ success: false, message: 'Name, type, target, and end date are required' });
    }
    
    const goal = new Goal({
      userId: req.user._id,
      name,
      type,
      platform: platform || 'all',
      period: period || 'monthly',
      target: Number(target),
      startValue: Number(startValue) || 0,
      currentValue: Number(startValue) || 0,
      unit: unit || '',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      color: color || '#ffcc29',
      icon: icon || 'target',
      priority: priority || 'medium',
      notes,
      progressHistory: [{
        date: new Date(),
        value: Number(startValue) || 0,
        note: 'Goal created'
      }]
    });
    
    await goal.save();
    
    const goalObj = goal.toObject();
    goalObj.progressPercentage = goal.progressPercentage;
    goalObj.daysRemaining = goal.daysRemaining;
    
    res.json({ success: true, goal: goalObj, message: 'Goal created successfully' });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ success: false, message: 'Failed to create goal' });
  }
});

// Update goal progress
router.put('/:id/progress', protect, async (req, res) => {
  try {
    const { currentValue, note } = req.body;
    
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    
    goal.currentValue = Number(currentValue);
    
    // Add to progress history
    goal.progressHistory.push({
      date: new Date(),
      value: Number(currentValue),
      note: note || ''
    });
    
    // Check and update milestones
    const progress = ((currentValue - goal.startValue) / (goal.target - goal.startValue)) * 100;
    const milestoneThresholds = [25, 50, 75, 100];
    
    for (const threshold of milestoneThresholds) {
      if (progress >= threshold && !goal.milestones.find(m => m.percentage === threshold)) {
        goal.milestones.push({
          percentage: threshold,
          reachedAt: new Date(),
          value: currentValue
        });
      }
    }
    
    // Update status if completed
    if (currentValue >= goal.target) {
      goal.status = 'completed';
    }
    
    await goal.save();
    
    const goalObj = goal.toObject();
    goalObj.progressPercentage = goal.progressPercentage;
    goalObj.daysRemaining = goal.daysRemaining;
    
    res.json({ success: true, goal: goalObj, message: 'Progress updated' });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
});

// Get AI insights for a goal
router.get('/:id/insights', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    
    const user = await User.findById(req.user._id);
    const businessProfile = user?.businessProfile || {};
    
    // Get campaign data for context
    const campaigns = await Campaign.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('🔮 Generating AI insights for goal...');
    const insights = await analyzeGoalProgress(goal.toObject(), businessProfile, campaigns);
    
    // Update goal with AI insights
    goal.aiInsights = {
      projectedCompletion: insights.projectedCompletion,
      onTrack: insights.onTrack,
      recommendation: insights.recommendation,
      confidence: insights.confidence,
      analyzedAt: new Date()
    };
    
    await goal.save();
    
    res.json({ success: true, insights, goal: goal.toObject() });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ success: false, message: 'Failed to get insights' });
  }
});

// Get all goals summary with AI recommendations
router.get('/summary/all', protect, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id, status: 'active' });
    
    const user = await User.findById(req.user._id);
    const businessProfile = user?.businessProfile || {};
    
    // Calculate summary stats
    const summary = {
      totalGoals: goals.length,
      completed: goals.filter(g => g.status === 'completed').length,
      onTrack: goals.filter(g => {
        const progress = g.progressPercentage;
        const daysPassed = Math.ceil((new Date() - new Date(g.startDate)) / (1000 * 60 * 60 * 24));
        const totalDays = Math.ceil((new Date(g.endDate) - new Date(g.startDate)) / (1000 * 60 * 60 * 24));
        const expectedProgress = (daysPassed / totalDays) * 100;
        return progress >= expectedProgress * 0.8;
      }).length,
      atRisk: 0,
      averageProgress: 0
    };
    
    summary.atRisk = goals.length - summary.onTrack - summary.completed;
    
    if (goals.length > 0) {
      summary.averageProgress = goals.reduce((acc, g) => acc + g.progressPercentage, 0) / goals.length;
    }
    
    // Get AI recommendations if goals exist
    let recommendations = [];
    if (goals.length > 0) {
      console.log('💡 Generating goal recommendations...');
      try {
        recommendations = await generateGoalRecommendations(
          goals.map(g => g.toObject()),
          businessProfile
        );
      } catch (e) {
        console.log('Recommendations skipped:', e.message);
      }
    }
    
    res.json({ 
      success: true, 
      summary,
      goals: goals.map(g => {
        const obj = g.toObject();
        obj.progressPercentage = g.progressPercentage;
        obj.daysRemaining = g.daysRemaining;
        return obj;
      }),
      recommendations 
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to get summary' });
  }
});

// Update goal
router.put('/:id', protect, async (req, res) => {
  try {
    const updates = req.body;
    
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: updates },
      { new: true }
    );
    
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    
    const goalObj = goal.toObject();
    goalObj.progressPercentage = goal.progressPercentage;
    goalObj.daysRemaining = goal.daysRemaining;
    
    res.json({ success: true, goal: goalObj });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ success: false, message: 'Failed to update goal' });
  }
});

// Delete goal
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await Goal.deleteOne({ _id: req.params.id, userId: req.user._id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    
    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
});

module.exports = router;
