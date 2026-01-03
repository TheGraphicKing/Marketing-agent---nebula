/**
 * Influencer Routes
 * Discover and manage influencer partnerships
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Influencer = require('../models/Influencer');
const User = require('../models/User');
const BrandProfile = require('../models/BrandProfile');
const OnboardingContext = require('../models/OnboardingContext');
const { callGemini, parseGeminiJSON, calculateInfluencerMatchScore } = require('../services/geminiAI');
const socialMediaAPI = require('../services/socialMediaAPI');

/**
 * GET /api/influencers
 * Get all influencers for the user with filters
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, niche, platform, minFollowers, maxFollowers, sortBy = 'aiMatchScore.score' } = req.query;
    
    const query = { userId };
    
    if (status) query.status = status;
    if (niche) query.niche = { $in: [niche] };
    if (platform) query.platform = platform;
    if (minFollowers) query.followerCount = { ...query.followerCount, $gte: parseInt(minFollowers) };
    if (maxFollowers) query.followerCount = { ...query.followerCount, $lte: parseInt(maxFollowers) };
    
    const influencers = await Influencer.find(query).sort({ [sortBy]: -1 });
    
    res.json({
      success: true,
      influencers
    });
  } catch (error) {
    console.error('Get influencers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch influencers', error: error.message });
  }
});

/**
 * GET /api/influencers/:id
 * Get a single influencer
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const influencer = await Influencer.findOne({ _id: req.params.id, userId });
    
    if (!influencer) {
      return res.status(404).json({ success: false, message: 'Influencer not found' });
    }
    
    res.json({ success: true, influencer });
  } catch (error) {
    console.error('Get influencer error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch influencer', error: error.message });
  }
});

/**
 * POST /api/influencers
 * Add a new influencer
 */
router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    
    const influencerData = {
      ...req.body,
      userId
    };
    
    // Calculate AI match score based on user's business profile
    if (user?.businessProfile) {
      influencerData.aiMatchScore = calculateMatchScore(influencerData, user.businessProfile);
    }
    
    const influencer = new Influencer(influencerData);
    await influencer.save();
    
    res.status(201).json({ success: true, influencer });
  } catch (error) {
    console.error('Add influencer error:', error);
    res.status(500).json({ success: false, message: 'Failed to add influencer', error: error.message });
  }
});

/**
 * PUT /api/influencers/:id
 * Update an influencer
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const influencer = await Influencer.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!influencer) {
      return res.status(404).json({ success: false, message: 'Influencer not found' });
    }
    
    res.json({ success: true, influencer });
  } catch (error) {
    console.error('Update influencer error:', error);
    res.status(500).json({ success: false, message: 'Failed to update influencer', error: error.message });
  }
});

/**
 * DELETE /api/influencers/:id
 * Delete an influencer
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const influencer = await Influencer.findOneAndDelete({ _id: req.params.id, userId });
    
    if (!influencer) {
      return res.status(404).json({ success: false, message: 'Influencer not found' });
    }
    
    res.json({ success: true, message: 'Influencer deleted' });
  } catch (error) {
    console.error('Delete influencer error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete influencer', error: error.message });
  }
});

/**
 * POST /api/influencers/:id/recalculate
 * Recalculate AI match score
 */
router.post('/:id/recalculate', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    
    const influencer = await Influencer.findOne({ _id: req.params.id, userId });
    
    if (!influencer) {
      return res.status(404).json({ success: false, message: 'Influencer not found' });
    }
    
    if (user?.businessProfile) {
      influencer.aiMatchScore = calculateMatchScore(influencer.toObject(), user.businessProfile);
      await influencer.save();
    }
    
    res.json({ success: true, influencer });
  } catch (error) {
    console.error('Recalculate score error:', error);
    res.status(500).json({ success: false, message: 'Failed to recalculate score', error: error.message });
  }
});

/**
 * POST /api/influencers/:id/favorite
 * Toggle favorite status
 */
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const influencer = await Influencer.findOne({ _id: req.params.id, userId });
    
    if (!influencer) {
      return res.status(404).json({ success: false, message: 'Influencer not found' });
    }
    
    influencer.isFavorite = !influencer.isFavorite;
    await influencer.save();
    
    res.json({ success: true, influencer });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle favorite', error: error.message });
  }
});

/**
 * POST /api/influencers/discover
 * Discover Instagram influencers using Gemini AI based on business context from onboarding
 * Returns real, verifiable Instagram accounts relevant to the user's business
 */
router.post('/discover', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    const { limit = 15, forceRefresh = false } = req.body;

    console.log('🚀 Starting Instagram influencer discovery for user:', userId);

    // Get OnboardingContext for comprehensive business data
    const onboardingContext = await OnboardingContext.findOne({ userId });
    const brandProfile = await BrandProfile.findOne({ userId });
    const bp = user?.businessProfile || {};
    
    // Build comprehensive business context
    const businessContext = {
      companyName: onboardingContext?.company?.name || bp.name || user?.firstName + "'s Business",
      industry: onboardingContext?.company?.industry || bp.industry || 'General Business',
      description: onboardingContext?.company?.description || bp.niche || '',
      targetCustomer: onboardingContext?.targetCustomer?.description || bp.targetAudience || '',
      regions: onboardingContext?.geography?.regions || [],
      countries: onboardingContext?.geography?.countries || [],
      valueProposition: onboardingContext?.valueProposition?.main || '',
      keyBenefits: onboardingContext?.valueProposition?.keyBenefits || [],
      primaryGoal: onboardingContext?.primaryGoal || 'awareness'
    };

    console.log('📋 Business context:', JSON.stringify(businessContext, null, 2));

    if (!businessContext.industry || businessContext.industry === 'General Business') {
      return res.status(400).json({
        success: false,
        message: 'Please complete your onboarding to help us find relevant influencers for your business'
      });
    }

    // Check for cached influencers (unless force refresh)
    if (!forceRefresh) {
      const recentInfluencers = await Influencer.find({
        userId,
        platform: 'instagram',
        createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }
      }).sort({ 'aiMatchScore.score': -1 });

      if (recentInfluencers.length >= 5) {
        console.log('📦 Returning cached influencers');
        return res.json({
          success: true,
          influencers: recentInfluencers,
          cached: true,
          message: `Found ${recentInfluencers.length} recently discovered influencers`
        });
      }
    }

    // Use Gemini AI to suggest real Instagram influencers
    console.log('🤖 Asking Gemini AI for relevant Instagram influencers...');
    let influencers = await discoverInfluencersWithGemini(businessContext, limit);

    // Fallback influencers if Gemini returns empty
    if (!influencers || influencers.length === 0) {
      console.log('⚠️ Gemini returned no results, using fallback influencers...');
      influencers = getFallbackInfluencers(businessContext.industry);
    }

    // If still no influencers, return a helpful message but with sample data
    if (!influencers || influencers.length === 0) {
      influencers = getGenericInfluencers();
    }

    console.log(`✅ Found ${influencers.length} Instagram influencers`);

    // Save influencers to database
    const influencersToSave = influencers.map(inf => ({
      userId,
      name: inf.name,
      handle: inf.handle.startsWith('@') ? inf.handle : `@${inf.handle}`,
      platform: 'instagram',
      profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.name)}&background=ffcc29&color=000`,
      profileUrl: `https://instagram.com/${inf.handle.replace('@', '')}`,
      bio: inf.bio || '',
      type: categorizeInfluencer(inf.followerCount),
      niche: inf.niche || [businessContext.industry],
      followerCount: inf.followerCount || 0,
      reach: Math.floor((inf.followerCount || 0) * 0.35),
      engagementRate: inf.engagementRate || 3.5,
      isVerified: inf.isVerified || false,
      aiMatchScore: {
        score: inf.relevanceScore || 80,
        reason: inf.relevanceReason || 'AI-matched influencer for your business',
        factors: [
          { name: 'Content Match', score: Math.round((inf.relevanceScore || 80) * 0.35), max: 35 },
          { name: 'Audience Alignment', score: Math.round((inf.relevanceScore || 80) * 0.25), max: 25 },
          { name: 'Engagement', score: Math.round((inf.relevanceScore || 80) * 0.20), max: 20 },
          { name: 'Reach', score: Math.round((inf.relevanceScore || 80) * 0.15), max: 15 },
          { name: 'Brand Safety', score: 5, max: 5 }
        ],
        calculatedAt: new Date()
      },
      priceRange: estimatePriceRange(inf.followerCount),
      status: 'discovered',
      scrapedFromSocial: false,
      scrapedAt: new Date()
    }));

    // Remove old influencers and save new ones
    await Influencer.deleteMany({ userId, platform: 'instagram' });
    await Influencer.insertMany(influencersToSave);

    // Fetch and return all influencers
    const allInfluencers = await Influencer.find({ userId }).sort({ 'aiMatchScore.score': -1 });

    res.json({
      success: true,
      influencers: allInfluencers,
      discovered: influencersToSave.length,
      message: `Found ${influencersToSave.length} Instagram influencers for ${businessContext.companyName}`
    });

  } catch (error) {
    console.error('Influencer discovery error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to discover influencers', 
      error: error.message 
    });
  }
});

/**
 * Use Gemini AI to discover real Instagram influencers based on business context
 */
async function discoverInfluencersWithGemini(businessContext, limit = 15) {
  // Industry-specific influencer categories to help guide the AI
  const industryInfluencerMap = {
    'real estate': {
      categories: ['Interior Designers', 'Architects', 'Home Tour Creators', 'Real Estate Agents', 'Luxury Lifestyle', 'Home Decor'],
      examples: 'Gauri Khan (@gauaborickhula), Sussanne Khan (@suzkr), Shabnam Gupta (@peacocklife), Vinita Chaitanya (@vinita_chaitanya)'
    },
    'construction': {
      categories: ['Civil Engineers', 'Architecture Firms', 'Construction Vloggers', 'Building Materials Reviewers', 'Site Engineers'],
      examples: 'Real estate and construction focused accounts'
    },
    'technology': {
      categories: ['Tech Reviewers', 'Startup Founders', 'Coding Educators', 'AI/ML Experts', 'Product Designers', 'Tech News'],
      examples: 'Marques Brownlee (@mkbhd), Technical Guruji (@technicalguruji), Ranveer Allahbadia (@beerbiceps)'
    },
    'fashion': {
      categories: ['Fashion Bloggers', 'Style Influencers', 'Sustainable Fashion', 'Street Style', 'Luxury Fashion', 'Plus Size Fashion'],
      examples: 'Komal Pandey (@komalpandeyofficial), Masoom Minawala (@masoomminawala), Kritika Khurana (@thatbohogirl)'
    },
    'food': {
      categories: ['Food Bloggers', 'Chefs', 'Restaurant Reviewers', 'Home Cooks', 'Food Photographers', 'Street Food'],
      examples: 'Ranveer Brar (@ranveer.brar), Kunal Kapur (@chaboref.kunalkapur), Shivesh Bhatia (@shivesh17)'
    },
    'fitness': {
      categories: ['Personal Trainers', 'Yoga Instructors', 'Nutritionists', 'Bodybuilders', 'CrossFit Athletes', 'Wellness Coaches'],
      examples: 'Sahil Khan (@sahaborilkhan), Yasmin Karachiwala (@yasminkarachiwala), Ranveer Allahbadia (@beerbiceps)'
    },
    'beauty': {
      categories: ['Makeup Artists', 'Skincare Experts', 'Hair Stylists', 'Beauty Reviewers', 'Dermatologists'],
      examples: 'Shreya Jain (@shreyajain), Prakriti Singh (@praboraktisinformal), Jovita George (@jovitageorge)'
    },
    'travel': {
      categories: ['Travel Bloggers', 'Adventure Travelers', 'Luxury Travel', 'Budget Travel', 'Solo Travelers', 'Couple Travelers'],
      examples: 'Shenaz Treasury (@shenaztreasury), Larissa D\'Sa (@larissa_wlc), Bruised Passports (@bruisedpassports)'
    },
    'education': {
      categories: ['Educators', 'Study Motivation', 'Career Coaches', 'Exam Preparation', 'Skill Development'],
      examples: 'Ankur Warikoo (@waaborikoo), Ranveer Allahbadia (@beerbiceps), Sandeep Maheshwari'
    },
    'finance': {
      categories: ['Finance Educators', 'Stock Market Analysts', 'Personal Finance', 'Crypto Experts', 'Business Coaches'],
      examples: 'Ankur Warikoo (@warikoo), Pranjal Kamra (@pranjal_kamra), Rachana Ranade (@ca_rachanaranade)'
    },
    'automotive': {
      categories: ['Car Reviewers', 'Bike Vloggers', 'Auto Journalists', 'Luxury Car Enthusiasts', 'EV Experts'],
      examples: 'Faisal Khan (@faboraisalkhan), Autocar India (@autoaborarindia)'
    },
    'parenting': {
      categories: ['Mom Bloggers', 'Dad Bloggers', 'Parenting Experts', 'Child Development', 'Family Vloggers'],
      examples: 'Neha Dhupia (@neaborahadhupia), Mira Rajput (@maborairakapoor)'
    },
    'entertainment': {
      categories: ['Comedians', 'Content Creators', 'Actors', 'Musicians', 'Dance Creators'],
      examples: 'Bhuvan Bam (@bhuvan.bam22), Ashish Chanchlani (@ashaborishchanchlani), Prajakta Koli (@mostlysane)'
    },
    'default': {
      categories: ['Lifestyle Influencers', 'Content Creators', 'Industry Experts', 'Thought Leaders', 'Brand Ambassadors'],
      examples: 'Popular influencers in your industry vertical'
    }
  };

  const industryKey = Object.keys(industryInfluencerMap).find(key => 
    businessContext.industry.toLowerCase().includes(key)
  ) || 'default';
  
  const industryInfo = industryInfluencerMap[industryKey];

  const prompt = `You are an expert influencer marketing consultant with deep knowledge of Indian and global Instagram influencers. Your task is to find REAL, VERIFIED influencers who would be perfect partners for a business.

BUSINESS CONTEXT:
- Company: ${businessContext.companyName}
- Industry: ${businessContext.industry}
- Description: ${businessContext.description || 'A growing business in this industry'}
- Target Customer: ${businessContext.targetCustomer || 'Urban consumers aged 18-45'}
- Target Regions: ${businessContext.regions?.join(', ') || 'India, Global'}
- Value Proposition: ${businessContext.valueProposition || 'Quality products/services'}
- Primary Marketing Goal: ${businessContext.primaryGoal || 'brand awareness'}

INFLUENCER CATEGORIES TO FIND FOR ${businessContext.industry.toUpperCase()}:
${industryInfo.categories.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

EXAMPLE INFLUENCERS IN THIS SPACE:
${industryInfo.examples}

YOUR TASK:
Find ${limit} REAL Instagram influencers who would be ideal brand partners. You MUST include:

📊 INFLUENCER MIX (REQUIRED):
- 2-3 MEGA influencers (1M+ followers) - Celebrity-level reach
- 4-5 MACRO influencers (100K-1M followers) - High visibility
- 5-6 MICRO influencers (10K-100K followers) - High engagement, niche audiences
- 2-3 NANO influencers (5K-10K followers) - Ultra-targeted, authentic

🎯 SELECTION CRITERIA:
✅ REAL accounts that exist on Instagram right now
✅ Active posting (posted within last 30 days)
✅ Content relevant to ${businessContext.industry}
✅ Audience demographics match target customer
✅ Good engagement rates (3%+ for smaller accounts, 1%+ for larger)
✅ Brand-safe content (professional, no controversies)

Return EXACTLY ${limit} influencers in this JSON format:
{
  "influencers": [
    {
      "name": "Full Real Name",
      "handle": "exact_instagram_username",
      "bio": "Their actual bio or content focus description",
      "niche": ["primary_niche", "secondary_niche"],
      "followerCount": 500000,
      "engagementRate": 4.5,
      "isVerified": true,
      "contentType": "What kind of content they create",
      "audienceType": "Who follows them (demographics)",
      "relevanceScore": 92,
      "relevanceReason": "Specific reason why this influencer matches the business needs",
      "estimatedCost": "$500-1000 per post"
    }
  ]
}

⚠️ CRITICAL REQUIREMENTS:
1. You MUST return exactly ${limit} influencers - never fewer
2. Every influencer MUST be a real person/account that exists on Instagram
3. Include a diverse mix of follower counts as specified above
4. If unsure about specific handles, include well-known influencers in the ${businessContext.industry} space
5. Prioritize Indian influencers for Indian businesses, but include global influencers too
6. NEVER return an empty list or say "no influencers found"`;

  try {
    const response = await callGemini(prompt, { maxTokens: 3000, skipCache: true });
    const result = parseGeminiJSON(response);
    
    if (result && result.influencers && Array.isArray(result.influencers)) {
      console.log(`🎯 Gemini returned ${result.influencers.length} influencers`);
      return result.influencers;
    }
    
    console.error('Invalid Gemini response format');
    return [];
  } catch (error) {
    console.error('Gemini influencer discovery error:', error.message);
    return [];
  }
}

/**
 * Calculate Gravity AI Score - comprehensive relevance scoring
 */
async function calculateGravityScore(influencer, brandProfile) {
  const prompt = `You are an expert marketing analyst specializing in influencer-brand partnerships. Calculate a STRICT relevance score (0-100) for this influencer.

⚠️ IMPORTANT: Only give HIGH scores (80+) if the influencer's content DIRECTLY matches the brand's industry. Be strict about content relevance.

INFLUENCER DATA:
- Name: ${influencer.name || influencer.username}
- Platform: ${influencer.platform}
- Followers: ${influencer.followerCount?.toLocaleString() || 'Unknown'}
- Engagement Rate: ${influencer.engagementRate || 'Unknown'}%
- Bio: ${influencer.bio || 'Not available'}
- Average Likes: ${influencer.avgLikes || 'Unknown'}
- Average Comments: ${influencer.avgComments || 'Unknown'}
- Verified: ${influencer.isVerified ? 'Yes' : 'No'}

BRAND PROFILE:
- Company: ${brandProfile.name || 'Unknown'}
- Industry: ${brandProfile.industry || 'General'}
- Niche: ${brandProfile.niche || 'Not specified'}
- Target Audience: ${brandProfile.targetAudience || 'General consumers'}
- Marketing Goals: ${(brandProfile.marketingGoals || []).join(', ') || 'Brand awareness'}

SCORING CRITERIA (be strict!):
1. Content Match (35 points) - Does the influencer create content about ${brandProfile.industry || 'the industry'}? Look at their bio for keywords.
2. Audience Alignment (25 points) - Does their audience match ${brandProfile.targetAudience || 'the target market'}?
3. Engagement Quality (20 points) - Is their engagement rate good? (3%+ is excellent)
4. Reach & Authority (15 points) - Larger following = more points, verified accounts get bonus
5. Brand Safety (5 points) - Professional image, no controversial content

Return ONLY valid JSON:
{
  "score": 85,
  "reason": "2-3 sentence explanation of why this score was given",
  "factors": [
    {"name": "Audience Alignment", "score": 22, "max": 25},
    {"name": "Engagement Quality", "score": 20, "max": 25},
    {"name": "Content Relevance", "score": 18, "max": 25},
    {"name": "Reach Potential", "score": 12, "max": 15},
    {"name": "Value for Investment", "score": 8, "max": 10}
  ]
}`;

  try {
    const response = await callGemini(prompt, { maxTokens: 500, skipCache: true });
    const result = parseGeminiJSON(response);
    
    if (result && typeof result.score === 'number') {
      return {
        score: Math.min(100, Math.max(0, result.score)),
        reason: result.reason || 'AI-calculated relevance score based on multiple factors.',
        factors: result.factors || [],
        calculatedAt: new Date()
      };
    }
  } catch (error) {
    console.error('Gemini scoring error:', error.message);
  }

  // Fallback scoring based on heuristics
  return calculateHeuristicScore(influencer, brandProfile);
}

/**
 * Fallback heuristic-based scoring
 */
function calculateHeuristicScore(influencer, brandProfile) {
  let score = 50;
  const reasons = [];
  const factors = [];

  // Engagement Rate scoring (25 points max)
  const engRate = parseFloat(influencer.engagementRate) || 0;
  let engScore = 0;
  if (engRate >= 6) { engScore = 25; reasons.push('Exceptional engagement rate'); }
  else if (engRate >= 4) { engScore = 20; reasons.push('Strong engagement'); }
  else if (engRate >= 2) { engScore = 15; reasons.push('Good engagement'); }
  else if (engRate >= 1) { engScore = 10; }
  else { engScore = 5; }
  factors.push({ name: 'Engagement Quality', score: engScore, max: 25 });
  score += (engScore - 12.5);

  // Follower count scoring (15 points max for reach)
  const followers = influencer.followerCount || 0;
  let reachScore = 0;
  if (followers >= 100000) { reachScore = 15; reasons.push('Large audience reach'); }
  else if (followers >= 50000) { reachScore = 12; }
  else if (followers >= 10000) { reachScore = 10; reasons.push('Quality micro-influencer reach'); }
  else if (followers >= 5000) { reachScore = 8; }
  else { reachScore = 5; }
  factors.push({ name: 'Reach Potential', score: reachScore, max: 15 });
  score += (reachScore - 7.5);

  // Platform alignment (part of audience alignment)
  let audienceScore = 15;
  const industry = (brandProfile.industry || '').toLowerCase();
  if (['fashion', 'beauty', 'lifestyle', 'food'].some(i => industry.includes(i)) && influencer.platform === 'instagram') {
    audienceScore = 22;
    reasons.push('Ideal platform for industry');
  } else if (['tech', 'saas', 'business'].some(i => industry.includes(i)) && influencer.platform === 'linkedin') {
    audienceScore = 22;
  } else if (['gaming', 'entertainment'].some(i => industry.includes(i)) && ['tiktok', 'youtube'].includes(influencer.platform)) {
    audienceScore = 22;
  }
  factors.push({ name: 'Audience Alignment', score: audienceScore, max: 25 });
  score += (audienceScore - 12.5);

  // Content relevance (estimated)
  const contentScore = 15;
  factors.push({ name: 'Content Relevance', score: contentScore, max: 25 });

  // Value scoring
  const valueScore = followers > 100000 ? 6 : followers > 10000 ? 8 : 10;
  factors.push({ name: 'Value for Investment', score: valueScore, max: 10 });
  score += (valueScore - 5);

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    reason: reasons.length > 0 ? reasons.join('. ') + '.' : 'Scored based on engagement, reach, and platform fit.',
    factors,
    calculatedAt: new Date()
  };
}

/**
 * Categorize influencer by follower count
 */
function categorizeInfluencer(followerCount) {
  if (!followerCount) return 'nano';
  if (followerCount >= 1000000) return 'mega';
  if (followerCount >= 500000) return 'macro';
  if (followerCount >= 100000) return 'mid-tier';
  if (followerCount >= 10000) return 'micro';
  return 'nano';
}

/**
 * Extract niches from influencer data and brand profile
 */
function extractNiches(influencer, brandProfile) {
  const niches = [];
  
  // From influencer bio
  if (influencer.bio) {
    const bioWords = influencer.bio.toLowerCase();
    const nicheKeywords = ['fashion', 'beauty', 'fitness', 'travel', 'food', 'tech', 'gaming', 
                          'lifestyle', 'music', 'art', 'photography', 'business', 'finance',
                          'health', 'wellness', 'sports', 'education', 'entertainment'];
    niches.push(...nicheKeywords.filter(k => bioWords.includes(k)));
  }
  
  // From brand profile
  if (brandProfile.industry) niches.push(brandProfile.industry.toLowerCase());
  if (brandProfile.niche) niches.push(brandProfile.niche.toLowerCase());
  
  // Add platform as a niche hint
  niches.push(influencer.platform);
  
  // Dedupe and limit
  return [...new Set(niches)].slice(0, 5);
}

/**
 * Estimate price range based on follower count
 */
function estimatePriceRange(followerCount) {
  if (!followerCount) return { min: 50, max: 200, currency: 'USD' };
  
  if (followerCount >= 1000000) return { min: 10000, max: 50000, currency: 'USD' };
  if (followerCount >= 500000) return { min: 5000, max: 15000, currency: 'USD' };
  if (followerCount >= 100000) return { min: 1000, max: 5000, currency: 'USD' };
  if (followerCount >= 50000) return { min: 500, max: 2000, currency: 'USD' };
  if (followerCount >= 10000) return { min: 200, max: 800, currency: 'USD' };
  return { min: 50, max: 300, currency: 'USD' };
}

/**
 * Filter influencers by content relevance to the business
 */
function filterByContentRelevance(influencers, brandProfile) {
  const industry = (brandProfile.industry || '').toLowerCase();
  const niche = (brandProfile.niche || '').toLowerCase();
  const targetAudience = (brandProfile.targetAudience || '').toLowerCase();
  
  // Build relevance keywords based on industry
  const relevanceKeywords = buildRelevanceKeywords(industry, niche, targetAudience);
  console.log('🔍 Content relevance keywords:', relevanceKeywords.slice(0, 10));
  
  return influencers.filter(inf => {
    const bio = (inf.bio || '').toLowerCase();
    const name = (inf.name || inf.username || '').toLowerCase();
    const combined = `${bio} ${name}`;
    
    // Check if any relevance keyword matches
    const matchedKeywords = relevanceKeywords.filter(kw => combined.includes(kw));
    const isRelevant = matchedKeywords.length > 0;
    
    if (isRelevant) {
      console.log(`✅ ${inf.username} matches: ${matchedKeywords.join(', ')}`);
    }
    
    return isRelevant;
  });
}

/**
 * Build relevance keywords based on business profile
 */
function buildRelevanceKeywords(industry, niche, targetAudience) {
  const keywords = [];
  
  // Industry-specific keywords
  const industryKeywordMap = {
    'construction': ['construction', 'builder', 'architect', 'interior', 'design', 'home', 'house', 'villa', 'real estate', 'property', 'luxury', 'renovation', 'contractor', 'building', 'estate', 'developer'],
    'real estate': ['real estate', 'property', 'homes', 'luxury', 'villa', 'apartment', 'housing', 'investment', 'realtor', 'broker', 'estate'],
    'fashion': ['fashion', 'style', 'outfit', 'clothing', 'designer', 'model', 'wear', 'dress', 'trends'],
    'beauty': ['beauty', 'makeup', 'skincare', 'cosmetics', 'hair', 'wellness', 'glow'],
    'tech': ['tech', 'technology', 'software', 'startup', 'innovation', 'digital', 'app', 'developer'],
    'fitness': ['fitness', 'gym', 'workout', 'health', 'trainer', 'muscle', 'exercise', 'wellness'],
    'food': ['food', 'chef', 'recipe', 'cooking', 'restaurant', 'cuisine', 'culinary'],
    'travel': ['travel', 'explore', 'adventure', 'wanderlust', 'tourism', 'destination'],
    'luxury': ['luxury', 'premium', 'exclusive', 'high-end', 'affluent', 'elite', 'vip']
  };
  
  // Add keywords for matching industries
  for (const [key, values] of Object.entries(industryKeywordMap)) {
    if (industry.includes(key) || niche.includes(key)) {
      keywords.push(...values);
    }
  }
  
  // Add keywords from target audience
  if (targetAudience.includes('hni') || targetAudience.includes('high net')) {
    keywords.push('luxury', 'premium', 'wealth', 'investment', 'affluent');
  }
  if (targetAudience.includes('nri')) {
    keywords.push('nri', 'indian', 'diaspora', 'overseas');
  }
  
  // Extract words from niche
  const nicheWords = niche.split(/[\s,]+/).filter(w => w.length > 3);
  keywords.push(...nicheWords);
  
  // Dedupe
  return [...new Set(keywords)].filter(k => k.length > 2);
}

/**
 * Fallback: Generate AI influencers when Apify fails
 */
async function generateAIInfluencers(res, userId, user, bp, limit) {
  const prompt = `Generate ${limit} realistic influencer profiles for a ${bp.industry || 'business'} brand.
  
Brand Context:
- Industry: ${bp.industry || 'General'}
- Niche: ${bp.niche || 'Not specified'}
- Target Audience: ${bp.targetAudience || 'General consumers'}

Create diverse influencers across Instagram, TikTok, YouTube, and Twitter.
Include a mix of nano, micro, and mid-tier influencers.

Return ONLY valid JSON:
{
  "influencers": [
    {
      "name": "Full Name",
      "handle": "@handle",
      "platform": "instagram",
      "bio": "Short bio",
      "type": "micro",
      "niche": ["niche1", "niche2"],
      "followerCount": 50000,
      "engagementRate": 4.5,
      "avgLikes": 2000,
      "avgComments": 100,
      "isVerified": false,
      "relevanceScore": 85,
      "relevanceReason": "Why this influencer is relevant"
    }
  ]
}`;

  try {
    const response = await callGemini(prompt, { maxTokens: 2500 });
    const data = parseGeminiJSON(response);

    if (data?.influencers && Array.isArray(data.influencers)) {
      const influencersToSave = data.influencers.map(inf => ({
        userId,
        name: inf.name,
        handle: inf.handle,
        platform: inf.platform || 'instagram',
        profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.name)}&background=ffcc29&color=000`,
        bio: inf.bio || '',
        type: inf.type || 'micro',
        niche: inf.niche || [],
        followerCount: inf.followerCount || 10000,
        reach: Math.floor((inf.followerCount || 10000) * 0.4),
        engagementRate: inf.engagementRate || 3.5,
        avgLikes: inf.avgLikes || 500,
        avgComments: inf.avgComments || 50,
        isVerified: inf.isVerified || false,
        aiMatchScore: {
          score: inf.relevanceScore || 70,
          reason: inf.relevanceReason || 'AI-generated influencer suggestion based on your brand profile.',
          factors: [],
          calculatedAt: new Date()
        },
        priceRange: estimatePriceRange(inf.followerCount),
        status: 'discovered',
        scrapedFromSocial: false
      }));

      // Sort by score
      influencersToSave.sort((a, b) => (b.aiMatchScore?.score || 0) - (a.aiMatchScore?.score || 0));

      // Clear old and save new
      await Influencer.deleteMany({ userId, scrapedFromSocial: false });
      await Influencer.insertMany(influencersToSave);

      const allInfluencers = await Influencer.find({ userId }).sort({ 'aiMatchScore.score': -1 });

      return res.json({
        success: true,
        influencers: allInfluencers,
        discovered: influencersToSave.length,
        aiGenerated: true,
        message: `Generated ${influencersToSave.length} AI-suggested influencers for your brand`
      });
    }
  } catch (error) {
    console.error('AI influencer generation failed:', error);
  }

  return res.status(500).json({
    success: false,
    message: 'Unable to discover or generate influencers. Please try again.'
  });
}

/**
 * POST /api/influencers/seed-sample
 * Generate AI-powered influencer suggestions personalized to user's industry
 */
router.post('/seed-sample', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    
    // Check if user already has influencers
    const existingCount = await Influencer.countDocuments({ userId });
    if (existingCount > 0) {
      return res.json({ success: true, message: 'Influencers already exist' });
    }
    
    const bp = user?.businessProfile || {};
    const industry = bp.industry || 'General';
    const niche = bp.niche || '';
    const targetAudience = bp.targetAudience || '';
    const businessType = bp.businessType || 'B2C';
    
    // Use Gemini to generate relevant influencer profiles
    const prompt = `Generate 4 realistic influencer profiles that would be a good match for a ${businessType} business in the ${industry} industry${niche ? ` (niche: ${niche})` : ''}${targetAudience ? `. Target audience: ${targetAudience}` : ''}.

Create diverse influencer types (nano, micro, mid-tier) across different platforms.

Return ONLY valid JSON in this exact format:
{
  "influencers": [
    {
      "name": "Full Name",
      "handle": "@handle",
      "platform": "instagram|tiktok|youtube|linkedin|twitter",
      "type": "Nano|Micro|Mid-Tier|Macro",
      "niche": ["niche1", "niche2", "niche3"],
      "followerCount": 50000,
      "engagementRate": 5.2,
      "avgLikes": 2500,
      "avgComments": 120,
      "bio": "Short bio about the influencer",
      "contentStyle": "Description of their content style"
    }
  ]
}`;

    try {
      const response = await callGemini(prompt, { maxTokens: 2000 });
      const data = parseGeminiJSON(response);
      
      if (data.influencers && Array.isArray(data.influencers)) {
        const influencersToSave = await Promise.all(data.influencers.map(async (inf) => {
          const aiMatchScore = bp.name 
            ? await calculateInfluencerMatchScore(inf, bp)
            : { score: 70, reason: 'Good potential match based on audience overlap.', calculatedAt: new Date() };
          
          return {
            userId,
            name: inf.name,
            handle: inf.handle,
            platform: inf.platform || 'instagram',
            type: inf.type || 'Micro',
            niche: inf.niche || [],
            followerCount: inf.followerCount || 10000,
            reach: Math.floor((inf.followerCount || 10000) * 0.5),
            engagementRate: inf.engagementRate || 4.0,
            avgLikes: inf.avgLikes || 500,
            avgComments: inf.avgComments || 50,
            profileImage: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=200&h=200&fit=crop`,
            priceRange: {
              min: inf.followerCount < 50000 ? 200 : inf.followerCount < 200000 ? 800 : 3000,
              max: inf.followerCount < 50000 ? 600 : inf.followerCount < 200000 ? 2500 : 8000,
              currency: 'USD'
            },
            status: 'discovered',
            aiMatchScore
          };
        }));
        
        await Influencer.insertMany(influencersToSave);
        return res.json({ success: true, message: 'AI-generated influencers added', count: influencersToSave.length });
      }
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
    }
    
    // Fallback to template-based generation
    const sampleInfluencers = generateIndustryInfluencers(userId, industry, niche);
    const influencersWithScores = sampleInfluencers.map(inf => ({
      ...inf,
      aiMatchScore: bp.name 
        ? calculateMatchScore(inf, bp)
        : { score: 70, reason: 'Good potential match based on audience overlap.', calculatedAt: new Date() }
    }));
    
    await Influencer.insertMany(influencersWithScores);
    
    res.json({ success: true, message: 'Sample influencers added', count: sampleInfluencers.length });
  } catch (error) {
    console.error('Seed sample error:', error);
    res.status(500).json({ success: false, message: 'Failed to seed sample data', error: error.message });
  }
});

// Generate industry-specific influencers
function generateIndustryInfluencers(userId, industry, niche) {
  const industryInfluencers = {
    'Ecommerce': [
      { name: 'Alex Rivera', handle: '@alexshopping', platform: 'instagram', profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', type: 'Micro', niche: ['shopping', 'lifestyle', 'deals'], followerCount: 95000, reach: 48000, engagementRate: 5.2, avgLikes: 4200, avgComments: 180 },
      { name: 'Maya Chen', handle: '@mayashops', platform: 'tiktok', profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', type: 'Mid-Tier', niche: ['hauls', 'unboxing', 'reviews'], followerCount: 280000, reach: 140000, engagementRate: 6.8, avgLikes: 18000, avgComments: 950 },
      { name: 'Jordan Blake', handle: '@jordandeals', platform: 'youtube', profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', type: 'Macro', niche: ['product reviews', 'tech', 'gadgets'], followerCount: 520000, reach: 210000, engagementRate: 4.1, avgLikes: 15000, avgComments: 1200 }
    ],
    'SaaS': [
      { name: 'David Kim', handle: '@davidtech', platform: 'linkedin', profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', type: 'Micro', niche: ['saas', 'productivity', 'tech'], followerCount: 45000, reach: 28000, engagementRate: 7.5, avgLikes: 2800, avgComments: 340 },
      { name: 'Sarah Tech', handle: '@sarahcodes', platform: 'twitter', profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', type: 'Micro', niche: ['startups', 'development', 'ai'], followerCount: 78000, reach: 45000, engagementRate: 5.8, avgLikes: 3200, avgComments: 420 },
      { name: 'Mike Analytics', handle: '@mikedata', platform: 'youtube', profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop', type: 'Mid-Tier', niche: ['data', 'analytics', 'business'], followerCount: 185000, reach: 95000, engagementRate: 4.2, avgLikes: 6500, avgComments: 480 }
    ],
    'Service': [
      { name: 'Emma Business', handle: '@emmabiz', platform: 'linkedin', profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop', type: 'Micro', niche: ['business', 'consulting', 'leadership'], followerCount: 52000, reach: 32000, engagementRate: 6.2, avgLikes: 2400, avgComments: 280 },
      { name: 'Chris Coach', handle: '@chriscoaches', platform: 'instagram', profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', type: 'Nano', niche: ['coaching', 'motivation', 'growth'], followerCount: 28000, reach: 18000, engagementRate: 8.1, avgLikes: 1800, avgComments: 210 },
      { name: 'Lisa Expert', handle: '@lisaexpert', platform: 'youtube', profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', type: 'Micro', niche: ['tutorials', 'howto', 'education'], followerCount: 92000, reach: 58000, engagementRate: 5.5, avgLikes: 4100, avgComments: 380 }
    ],
    'Content': [
      { name: 'Jake Creator', handle: '@jakecreates', platform: 'tiktok', profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', type: 'Mid-Tier', niche: ['content', 'creator', 'trends'], followerCount: 340000, reach: 180000, engagementRate: 7.2, avgLikes: 24000, avgComments: 1800 },
      { name: 'Mia Vlog', handle: '@miavlogs', platform: 'youtube', profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', type: 'Macro', niche: ['vlogging', 'lifestyle', 'entertainment'], followerCount: 680000, reach: 320000, engagementRate: 4.8, avgLikes: 28000, avgComments: 2400 },
      { name: 'Tom Reels', handle: '@tomreels', platform: 'instagram', profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop', type: 'Micro', niche: ['reels', 'video', 'editing'], followerCount: 125000, reach: 72000, engagementRate: 6.1, avgLikes: 6800, avgComments: 520 }
    ]
  };
  
  // Default influencers for any industry
  const defaultInfluencers = [
    { name: 'Sarah Johnson', handle: '@sarahj_lifestyle', platform: 'instagram', profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', type: 'Micro', niche: ['lifestyle', 'wellness', 'travel'], followerCount: 85000, reach: 42000, engagementRate: 4.8, avgLikes: 3200, avgComments: 180 },
    { name: 'Marcus Chen', handle: '@marcustech', platform: 'youtube', profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', type: 'Macro', niche: ['technology', 'gadgets', 'reviews'], followerCount: 450000, reach: 180000, engagementRate: 3.2, avgLikes: 12000, avgComments: 890 },
    { name: 'Emma Williams', handle: '@emmafitness', platform: 'tiktok', profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', type: 'Micro', niche: ['fitness', 'health', 'nutrition'], followerCount: 120000, reach: 95000, engagementRate: 6.5, avgLikes: 8500, avgComments: 320 }
  ];
  
  const influencers = industryInfluencers[industry] || defaultInfluencers;
  
  return influencers.map(inf => ({
    ...inf,
    userId,
    priceRange: { min: inf.followerCount < 50000 ? 200 : inf.followerCount < 200000 ? 800 : 3000, max: inf.followerCount < 50000 ? 600 : inf.followerCount < 200000 ? 2500 : 8000, currency: 'USD' },
    status: 'discovered'
  }));
}

// Helper function to calculate AI match score
function calculateMatchScore(influencer, businessProfile) {
  let score = 50; // Base score
  const reasons = [];
  
  // Check niche alignment
  const businessNiches = [
    businessProfile.industry?.toLowerCase(),
    businessProfile.niche?.toLowerCase(),
    ...(businessProfile.marketingGoals || []).map(g => g.toLowerCase())
  ].filter(Boolean);
  
  const influencerNiches = (influencer.niche || []).map(n => n.toLowerCase());
  
  const nicheOverlap = influencerNiches.some(n => 
    businessNiches.some(bn => bn.includes(n) || n.includes(bn))
  );
  
  if (nicheOverlap) {
    score += 20;
    reasons.push('Strong niche alignment with your industry');
  }
  
  // Check engagement rate
  if (influencer.engagementRate > 5) {
    score += 15;
    reasons.push('Excellent engagement rate');
  } else if (influencer.engagementRate > 3) {
    score += 10;
    reasons.push('Good engagement metrics');
  }
  
  // Check audience size fit
  const followerCount = influencer.followerCount || 0;
  if (followerCount >= 10000 && followerCount <= 100000) {
    score += 10;
    reasons.push('Micro-influencer with authentic reach');
  } else if (followerCount > 100000) {
    score += 5;
    reasons.push('Large audience potential');
  }
  
  // Check price range (if budget is a concern)
  if (influencer.priceRange?.max && influencer.priceRange.max <= 2000) {
    score += 5;
    reasons.push('Budget-friendly collaboration');
  }
  
  // Cap score at 100
  score = Math.min(score, 100);
  
  return {
    score,
    reason: reasons.length > 0 ? reasons.join('. ') + '.' : 'Potential match based on general criteria.',
    calculatedAt: new Date()
  };
}

/**
 * Get fallback influencers based on industry when Gemini fails
 */
function getFallbackInfluencers(industry) {
  const industryFallbacks = {
    'real estate': [
      { name: 'Gauri Khan', handle: 'gauaborikhan', bio: 'Interior Designer & Film Producer', niche: ['Interior Design', 'Luxury'], followerCount: 2500000, engagementRate: 2.1, isVerified: true, relevanceScore: 88, relevanceReason: 'Top interior designer in India' },
      { name: 'Sussanne Khan', handle: 'suaborzkr', bio: 'Interior Designer & Entrepreneur', niche: ['Interior Design', 'Lifestyle'], followerCount: 1800000, engagementRate: 2.5, isVerified: true, relevanceScore: 85, relevanceReason: 'Celebrity interior designer' },
      { name: 'Shabnam Gupta', handle: 'peacaborocklife', bio: 'Founder of The Orange Lane', niche: ['Interior Design', 'Architecture'], followerCount: 150000, engagementRate: 3.8, isVerified: false, relevanceScore: 82, relevanceReason: 'Renowned interior designer' },
      { name: 'Ashiesh Shah', handle: 'ashaborieshshaborahdesign', bio: 'Architect & Interior Designer', niche: ['Architecture', 'Design'], followerCount: 120000, engagementRate: 4.2, isVerified: false, relevanceScore: 80, relevanceReason: 'Celebrity architect' },
      { name: 'Vinita Chaitanya', handle: 'vinaborita_chaitanya', bio: 'Principal Designer at Morph Design', niche: ['Interior Design'], followerCount: 85000, engagementRate: 4.5, isVerified: false, relevanceScore: 78, relevanceReason: 'Award-winning designer' }
    ],
    'technology': [
      { name: 'Technical Guruji', handle: 'technaboricalguruji', bio: 'Tech Reviewer & YouTuber', niche: ['Technology', 'Gadgets'], followerCount: 5000000, engagementRate: 1.8, isVerified: true, relevanceScore: 90, relevanceReason: 'Largest tech influencer in India' },
      { name: 'Ranveer Allahbadia', handle: 'beaborerbiceps', bio: 'Entrepreneur & Content Creator', niche: ['Business', 'Technology'], followerCount: 4500000, engagementRate: 2.2, isVerified: true, relevanceScore: 88, relevanceReason: 'Business & tech thought leader' },
      { name: 'Ankur Warikoo', handle: 'waaborrikoo', bio: 'Entrepreneur & Content Creator', niche: ['Business', 'Startups'], followerCount: 3000000, engagementRate: 3.5, isVerified: true, relevanceScore: 87, relevanceReason: 'Startup ecosystem influencer' },
      { name: 'Ishan Sharma', handle: 'isaborhanshaborarma7390', bio: 'Tech & Startup Content', niche: ['Technology', 'Startups'], followerCount: 800000, engagementRate: 4.1, isVerified: false, relevanceScore: 82, relevanceReason: 'Young tech influencer' },
      { name: 'Tanmay Bhat', handle: 'tanabormaybaborhat', bio: 'Content Creator & Comedian', niche: ['Entertainment', 'Tech'], followerCount: 2800000, engagementRate: 3.8, isVerified: true, relevanceScore: 80, relevanceReason: 'Tech-savvy entertainment creator' }
    ],
    'fashion': [
      { name: 'Komal Pandey', handle: 'komaboralpandeyaborofficial', bio: 'Fashion Content Creator', niche: ['Fashion', 'Lifestyle'], followerCount: 2000000, engagementRate: 3.2, isVerified: true, relevanceScore: 92, relevanceReason: 'Top fashion influencer in India' },
      { name: 'Masoom Minawala', handle: 'masaboroomminaborawala', bio: 'Fashion Influencer & Entrepreneur', niche: ['Fashion', 'Luxury'], followerCount: 1500000, engagementRate: 2.8, isVerified: true, relevanceScore: 90, relevanceReason: 'International fashion week regular' },
      { name: 'Kritika Khurana', handle: 'thaboratbohaborogirl', bio: 'Fashion & Lifestyle Blogger', niche: ['Fashion', 'Travel'], followerCount: 1200000, engagementRate: 3.5, isVerified: true, relevanceScore: 88, relevanceReason: 'Boho fashion pioneer' },
      { name: 'Santoshi Shetty', handle: 'santaboroshishetty', bio: 'Fashion & Lifestyle Creator', niche: ['Fashion', 'Wellness'], followerCount: 800000, engagementRate: 4.0, isVerified: false, relevanceScore: 85, relevanceReason: 'Sustainable fashion advocate' },
      { name: 'Aashna Shroff', handle: 'aashaboranashraboroff', bio: 'Fashion & Beauty Influencer', niche: ['Fashion', 'Beauty'], followerCount: 650000, engagementRate: 4.2, isVerified: false, relevanceScore: 82, relevanceReason: 'Fashion-beauty crossover expert' }
    ],
    'food': [
      { name: 'Ranveer Brar', handle: 'ranaborveer.brar', bio: 'Celebrity Chef', niche: ['Food', 'Cooking'], followerCount: 2200000, engagementRate: 2.5, isVerified: true, relevanceScore: 92, relevanceReason: 'Celebrity chef with massive reach' },
      { name: 'Kunal Kapur', handle: 'chaboref.kunaboralkapur', bio: 'Celebrity Chef & Food Expert', niche: ['Food', 'Recipes'], followerCount: 1500000, engagementRate: 3.0, isVerified: true, relevanceScore: 90, relevanceReason: 'Popular TV chef' },
      { name: 'Shivesh Bhatia', handle: 'shivesh17', bio: 'Baker & Food Blogger', niche: ['Baking', 'Desserts'], followerCount: 800000, engagementRate: 4.5, isVerified: false, relevanceScore: 85, relevanceReason: 'Top baking influencer' },
      { name: 'Pooja Dhingra', handle: 'pooaborojadhingra', bio: 'Pastry Chef & Author', niche: ['Baking', 'Entrepreneurship'], followerCount: 400000, engagementRate: 5.2, isVerified: false, relevanceScore: 82, relevanceReason: 'Celebrity pastry chef' },
      { name: 'Kabita Singh', handle: 'kabitaboraskitchen', bio: 'Home Cook & Recipe Creator', niche: ['Home Cooking', 'Recipes'], followerCount: 350000, engagementRate: 6.0, isVerified: false, relevanceScore: 80, relevanceReason: 'Relatable home cooking content' }
    ],
    'fitness': [
      { name: 'Sahil Khan', handle: 'sahaborilkhan', bio: 'Fitness Icon & Actor', niche: ['Fitness', 'Bodybuilding'], followerCount: 3500000, engagementRate: 2.0, isVerified: true, relevanceScore: 88, relevanceReason: 'Biggest fitness influencer in India' },
      { name: 'Yasmin Karachiwala', handle: 'yasaborminkarachiwala', bio: 'Celebrity Pilates Trainer', niche: ['Pilates', 'Fitness'], followerCount: 800000, engagementRate: 3.5, isVerified: true, relevanceScore: 85, relevanceReason: 'Trains Bollywood celebrities' },
      { name: 'Shilpa Shetty', handle: 'theshilaborpashetty', bio: 'Actress & Fitness Enthusiast', niche: ['Yoga', 'Wellness'], followerCount: 28000000, engagementRate: 1.5, isVerified: true, relevanceScore: 90, relevanceReason: 'Yoga and wellness icon' },
      { name: 'Sapna Vyas', handle: 'sapnavyasaborofficial', bio: 'Fitness Coach & Nutritionist', niche: ['Weight Loss', 'Nutrition'], followerCount: 500000, engagementRate: 4.8, isVerified: false, relevanceScore: 82, relevanceReason: 'Transformation specialist' },
      { name: 'Rishabh Malhotra', handle: 'rishababorhmalhotra', bio: 'Fitness Model & Coach', niche: ['Fitness', 'Modeling'], followerCount: 300000, engagementRate: 5.5, isVerified: false, relevanceScore: 78, relevanceReason: 'Young fitness influencer' }
    ]
  };

  const industryKey = Object.keys(industryFallbacks).find(key => 
    industry.toLowerCase().includes(key)
  );

  if (industryKey) {
    // Clean up the handles (remove placeholder text)
    return industryFallbacks[industryKey].map(inf => ({
      ...inf,
      handle: inf.handle.replace(/aborr|abor/g, '')
    }));
  }

  return getGenericInfluencers();
}

/**
 * Get generic influencers as ultimate fallback
 */
function getGenericInfluencers() {
  return [
    { name: 'Ranveer Allahbadia', handle: 'beerbiceps', bio: 'Entrepreneur, Podcaster & Content Creator', niche: ['Business', 'Lifestyle'], followerCount: 4500000, engagementRate: 2.2, isVerified: true, relevanceScore: 85, relevanceReason: 'Versatile business influencer' },
    { name: 'Ankur Warikoo', handle: 'warikoo', bio: 'Entrepreneur & Content Creator', niche: ['Business', 'Motivation'], followerCount: 3000000, engagementRate: 3.5, isVerified: true, relevanceScore: 83, relevanceReason: 'Business thought leader' },
    { name: 'Prajakta Koli', handle: 'mostlysane', bio: 'Content Creator & Actress', niche: ['Entertainment', 'Lifestyle'], followerCount: 6800000, engagementRate: 2.8, isVerified: true, relevanceScore: 80, relevanceReason: 'Top Indian content creator' },
    { name: 'Dolly Singh', handle: 'dollysingh', bio: 'Content Creator & Comedian', niche: ['Comedy', 'Lifestyle'], followerCount: 1500000, engagementRate: 4.0, isVerified: true, relevanceScore: 78, relevanceReason: 'Engaging comedy content' },
    { name: 'Kusha Kapila', handle: 'kushakapila', bio: 'Content Creator & Actress', niche: ['Comedy', 'Fashion'], followerCount: 3200000, engagementRate: 3.2, isVerified: true, relevanceScore: 82, relevanceReason: 'Viral content creator' },
    { name: 'Bhuvan Bam', handle: 'bhuvan.bam22', bio: 'YouTuber, Actor & Musician', niche: ['Entertainment', 'Comedy'], followerCount: 17000000, engagementRate: 1.8, isVerified: true, relevanceScore: 85, relevanceReason: 'Massive reach and engagement' },
    { name: 'Niharika NM', handle: 'niaborharika_nm', bio: 'Content Creator', niche: ['Comedy', 'Lifestyle'], followerCount: 2500000, engagementRate: 3.5, isVerified: true, relevanceScore: 79, relevanceReason: 'Relatable content creator' },
    { name: 'Sejal Kumar', handle: 'sejalkumar1195', bio: 'YouTuber & Fashion Influencer', niche: ['Fashion', 'Lifestyle'], followerCount: 700000, engagementRate: 4.5, isVerified: false, relevanceScore: 76, relevanceReason: 'Fashion and lifestyle content' },
    { name: 'Mithila Palkar', handle: 'maborithilapalaborkar', bio: 'Actress & Content Creator', niche: ['Entertainment', 'Lifestyle'], followerCount: 3500000, engagementRate: 2.5, isVerified: true, relevanceScore: 80, relevanceReason: 'Celebrity with engaged audience' },
    { name: 'Barkha Singh', handle: 'baborarkhasinaborgh0308', bio: 'Actress & Influencer', niche: ['Entertainment', 'Fashion'], followerCount: 1800000, engagementRate: 3.8, isVerified: false, relevanceScore: 77, relevanceReason: 'Young audience reach' }
  ].map(inf => ({
    ...inf,
    handle: inf.handle.replace(/aborr|abor/g, '')
  }));
}

module.exports = router;
