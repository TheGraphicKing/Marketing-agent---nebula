/**
 * Competitor Routes
 * Add, fetch, and analyze competitors with REAL web scraping
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Competitor = require('../models/Competitor');
const User = require('../models/User');
const ScrapeJob = require('../models/ScrapeJob');
const OnboardingContext = require('../models/OnboardingContext');
const { generateWithLLM } = require('../services/llmRouter');
const { scrapeWebsite, extractTextContent, getPageTitle } = require('../services/scraper');

// Import real social media API service
const {
  scrapeInstagramProfile,
  scrapeTwitterProfile,
  scrapeTikTokProfile,
  scrapeCompetitor
} = require('../services/socialMediaAPI');

// Try to use the old services if they exist, otherwise use stubs
let callGemini, parseGeminiJSON, generatePostUrl, generateCompetitorPosts, fetchIndustryTrendingPosts;
try {
  const geminiService = require('../services/geminiAI');
  callGemini = geminiService.callGemini;
  parseGeminiJSON = geminiService.parseGeminiJSON;
} catch (e) {
  callGemini = async (prompt) => {
    const result = await generateWithLLM({ provider: 'gemini', prompt, taskType: 'analysis' });
    return result.text;
  };
  parseGeminiJSON = (text) => {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    return JSON.parse(text);
  };
}

try {
  const fetcher = require('../services/socialMediaFetcher');
  generatePostUrl = fetcher.generatePostUrl;
  generateCompetitorPosts = fetcher.generateCompetitorPosts;
  fetchIndustryTrendingPosts = fetcher.fetchIndustryTrendingPosts;
} catch (e) {
  generatePostUrl = (platform, handle) => `https://${platform}.com/${handle}`;
  generateCompetitorPosts = async () => [];
  fetchIndustryTrendingPosts = async () => [];
}

/**
 * POST /api/competitors/auto-discover
 * Automatically discover competitors based on business location and industry using Gemini AI
 */
router.post('/auto-discover', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    const { location, forceRefresh = false } = req.body;

    console.log('🔍 Auto-discovering competitors for user:', userId);

    // Get business context from OnboardingContext
    const onboardingContext = await OnboardingContext.findOne({ userId });
    const bp = user?.businessProfile || {};

    // Build business context
    const businessContext = {
      companyName: onboardingContext?.company?.name || bp.name || 'Your Business',
      industry: onboardingContext?.company?.industry || bp.industry || 'General',
      description: onboardingContext?.company?.description || bp.niche || '',
      targetCustomer: onboardingContext?.targetCustomer?.description || bp.targetAudience || '',
      location: location || onboardingContext?.geography?.businessLocation || onboardingContext?.geography?.regions?.[0] || onboardingContext?.geography?.countries?.[0] || 'India'
    };

    console.log('📋 Business context for competitor discovery:', businessContext);

    if (!businessContext.industry || businessContext.industry === 'General') {
      return res.status(400).json({
        success: false,
        message: 'Please complete your onboarding first to discover competitors'
      });
    }

    // Check for existing auto-discovered competitors (unless force refresh)
    if (!forceRefresh) {
      const existingCompetitors = await Competitor.find({
        userId,
        isAutoDiscovered: true,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (existingCompetitors.length >= 3) {
        console.log('📦 Returning cached auto-discovered competitors');
        const posts = await getCompetitorPosts(existingCompetitors);
        return res.json({
          success: true,
          competitors: existingCompetitors,
          posts,
          cached: true,
          message: `Found ${existingCompetitors.length} competitors in your area`
        });
      }
    }

    // Use Gemini AI to find real competitors
    console.log('🤖 Asking Gemini AI to find competitors...');
    let competitors = await discoverCompetitorsWithGemini(businessContext);

    // Fallback competitors if Gemini returns empty or too few
    if (!competitors || competitors.length < 5) {
      console.log('⚠️ Gemini returned few results, adding fallback competitors...');
      const fallbackCompetitors = getFallbackCompetitors(businessContext.industry, businessContext.location);
      competitors = [...(competitors || []), ...fallbackCompetitors].slice(0, 12);
    }

    console.log(`✅ Found ${competitors.length} competitors`);

    // Delete old auto-discovered competitors
    await Competitor.deleteMany({ userId, isAutoDiscovered: true });

    // Save new competitors
    const savedCompetitors = [];
    for (const comp of competitors) {
      try {
        const competitor = new Competitor({
          userId,
          name: comp.name,
          website: comp.website || '',
          description: comp.description || '',
          industry: businessContext.industry,
          socialHandles: {
            instagram: comp.instagram || '',
            twitter: comp.twitter || '',
            facebook: comp.facebook || '',
            linkedin: comp.linkedin || ''
          },
          location: businessContext.location,
          isActive: true,
          isAutoDiscovered: true,
          posts: [],
          metrics: {
            followers: comp.estimatedFollowers || 0,
            lastFetched: new Date()
          }
        });
        await competitor.save();
        savedCompetitors.push(competitor);
      } catch (saveError) {
        console.error('Error saving competitor:', comp.name, saveError.message);
      }
    }

    // Fetch posts for the new competitors
    console.log('📥 Fetching posts for discovered competitors...');
    const posts = await fetchPostsForCompetitors(savedCompetitors);

    res.json({
      success: true,
      competitors: savedCompetitors,
      posts,
      discovered: savedCompetitors.length,
      message: `Discovered ${savedCompetitors.length} competitors in ${businessContext.location}`
    });

  } catch (error) {
    console.error('Competitor auto-discovery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to discover competitors',
      error: error.message
    });
  }
});

/**
 * Use Gemini AI to discover real competitors based on business context
 */
async function discoverCompetitorsWithGemini(businessContext) {
  // Industry-specific competitor examples to help guide the AI
  const industryExamples = {
    'real estate': 'Sobha Limited, Prestige Group, Brigade Group, Godrej Properties, DLF, Lodha Group, Mahindra Lifespaces, Puravankara',
    'construction': 'L&T Construction, Shapoorji Pallonji, Tata Projects, GMR, Hindustan Construction Company',
    'technology': 'TCS, Infosys, Wipro, HCL Technologies, Tech Mahindra, Mindtree, Mphasis',
    'e-commerce': 'Amazon India, Flipkart, Myntra, Nykaa, Meesho, Snapdeal, Ajio',
    'food & beverage': 'Zomato, Swiggy, Dominos India, McDonalds India, Starbucks India, Haldirams, Barbeque Nation',
    'fashion': 'Myntra, Ajio, FabIndia, Westside, Pantaloons, Raymond, Allen Solly, Van Heusen',
    'healthcare': 'Apollo Hospitals, Fortis Healthcare, Max Healthcare, Manipal Hospitals, Narayana Health',
    'education': 'BYJU\'S, Unacademy, Vedantu, Toppr, upGrad, WhiteHat Jr, Physics Wallah',
    'automotive': 'Maruti Suzuki, Hyundai India, Tata Motors, Mahindra, Honda Cars India, Toyota Kirloskar',
    'finance': 'HDFC Bank, ICICI Bank, SBI, Kotak Mahindra, Axis Bank, Bajaj Finserv, Zerodha',
    'hospitality': 'Taj Hotels, Oberoi Hotels, ITC Hotels, Marriott India, Hyatt India, Lemon Tree Hotels',
    'fitness': 'Cult.fit, Gold\'s Gym India, Anytime Fitness, Talwalkars, Fitness First India',
    'beauty': 'Lakme Salon, VLCC, Naturals Salon, Kaya Skin Clinic, Nykaa, Sugar Cosmetics',
    'interior design': 'Livspace, HomeLane, Design Cafe, Urban Ladder, Pepperfry',
    'marketing': 'WATConsult, Dentsu India, Ogilvy India, Leo Burnett India, BBDO India',
    'retail': 'Reliance Retail, D-Mart, Big Bazaar, Spencer\'s, More Supermarket',
    'logistics': 'Delhivery, Blue Dart, DTDC, Ecom Express, Shadowfax',
    'default': 'major national and regional brands in your industry'
  };

  const industryKey = Object.keys(industryExamples).find(key => 
    businessContext.industry.toLowerCase().includes(key)
  ) || 'default';
  
  const exampleCompetitors = industryExamples[industryKey];

  const prompt = `You are a market research expert with extensive knowledge of businesses across India and globally. Your task is to identify REAL, VERIFIED competitors for a business.

BUSINESS CONTEXT:
- Company Name: ${businessContext.companyName}
- Industry: ${businessContext.industry}
- Business Description: ${businessContext.description || 'Not specified'}
- Target Customer: ${businessContext.targetCustomer || 'General consumers/businesses'}
- Location/Region: ${businessContext.location}

YOUR TASK:
Find 8-12 REAL competitors that compete in the same space. These must be actual businesses that exist today.

COMPETITOR CATEGORIES TO INCLUDE:
1. **Direct Competitors (4-5)**: Companies offering the same products/services in the same market
2. **Indirect Competitors (2-3)**: Companies in related industries that compete for the same customers
3. **Aspirational Competitors (2-3)**: Larger, well-known brands in the industry to benchmark against

EXAMPLES OF REAL COMPETITORS IN ${businessContext.industry.toUpperCase()}:
${exampleCompetitors}

REQUIREMENTS:
✅ MUST include 8-12 competitors (never less than 8)
✅ Each competitor must be a REAL business that exists
✅ Include their ACTUAL Instagram handles (these must be real accounts)
✅ Include their REAL website URLs
✅ Mix of company sizes: Large (national brands), Medium (regional players), Small (local businesses)
✅ Focus on competitors in ${businessContext.location} but include major national brands too

Return your response in this EXACT JSON format:
{
  "competitors": [
    {
      "name": "Actual Company Name",
      "instagram": "@real_instagram_handle",
      "twitter": "@real_twitter_handle",
      "facebook": "facebook_page_name",
      "linkedin": "linkedin_company_page",
      "website": "https://real-website.com",
      "description": "What they do and why they compete with the user's business",
      "estimatedFollowers": 50000,
      "competitorType": "direct|indirect|aspirational",
      "whyCompetitor": "Specific reason why this is a relevant competitor"
    }
  ]
}

⚠️ CRITICAL: You MUST return at least 8 competitors. If you're unsure about some, include well-known national brands in the ${businessContext.industry} industry. Never return an empty list or fewer than 8 results.`;

  try {
    const response = await callGemini(prompt, { maxTokens: 2500, skipCache: true });
    const result = parseGeminiJSON(response);

    if (result && result.competitors && Array.isArray(result.competitors)) {
      console.log(`🎯 Gemini found ${result.competitors.length} competitors`);
      return result.competitors;
    }

    console.error('Invalid Gemini response format for competitors');
    return [];
  } catch (error) {
    console.error('Gemini competitor discovery error:', error.message);
    return [];
  }
}

/**
 * Fetch posts for a list of competitors
 */
async function fetchPostsForCompetitors(competitors) {
  const allPosts = [];

  for (const competitor of competitors.slice(0, 5)) { // Limit to 5
    const instagramHandle = competitor.socialHandles?.instagram?.replace('@', '');
    
    if (instagramHandle) {
      try {
        console.log(`📸 Fetching Instagram posts for ${competitor.name} (@${instagramHandle})...`);
        const result = await scrapeInstagramProfile(instagramHandle);
        
        if (result && result.recentPosts && result.recentPosts.length > 0) {
          const posts = result.recentPosts.slice(0, 5).map(post => ({
            competitorId: competitor._id,
            competitorName: competitor.name,
            platform: 'instagram',
            content: post.caption || post.text || '',
            likes: post.likes || post.likesCount || 0,
            comments: post.comments || post.commentsCount || 0,
            imageUrl: post.imageUrl || post.thumbnailUrl || null,
            postUrl: post.url || post.postUrl || `https://instagram.com/p/${post.shortCode || ''}`,
            postedAt: post.timestamp || post.date || new Date(),
            sentiment: analyzeSentiment(post.caption || ''),
            isRealData: true
          }));
          
          // Save posts to competitor
          competitor.posts = posts;
          await competitor.save();
          
          allPosts.push(...posts);
          console.log(`✅ Got ${posts.length} posts for ${competitor.name}`);
        }
      } catch (fetchError) {
        console.error(`Failed to fetch posts for ${competitor.name}:`, fetchError.message);
      }
    }
  }

  return allPosts;
}

/**
 * Get posts from existing competitors
 */
async function getCompetitorPosts(competitors) {
  const allPosts = [];
  for (const comp of competitors) {
    if (comp.posts && comp.posts.length > 0) {
      allPosts.push(...comp.posts.map(post => ({
        ...post.toObject ? post.toObject() : post,
        competitorName: comp.name
      })));
    }
  }
  return allPosts;
}

/**
 * Simple sentiment analysis
 */
function analyzeSentiment(text) {
  if (!text) return 'neutral';
  const positiveWords = ['amazing', 'beautiful', 'luxury', 'premium', 'excellent', 'love', 'best', 'happy', 'great', 'wonderful'];
  const negativeWords = ['bad', 'worst', 'terrible', 'poor', 'disappointed', 'hate', 'awful'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * PUT /api/competitors/:id/ignore
 * Ignore a competitor (hide from view)
 */
router.put('/:id/ignore', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const competitor = await Competitor.findOneAndUpdate(
      { _id: req.params.id, userId },
      { isIgnored: true },
      { new: true }
    );
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    console.log(`🚫 Ignored competitor: ${competitor.name}`);
    res.json({ success: true, message: `${competitor.name} has been ignored`, competitor });
  } catch (error) {
    console.error('Error ignoring competitor:', error);
    res.status(500).json({ success: false, message: 'Failed to ignore competitor' });
  }
});

/**
 * PUT /api/competitors/:id/unignore
 * Unignore a competitor (show again)
 */
router.put('/:id/unignore', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const competitor = await Competitor.findOneAndUpdate(
      { _id: req.params.id, userId },
      { isIgnored: false },
      { new: true }
    );
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    console.log(`✅ Unignored competitor: ${competitor.name}`);
    res.json({ success: true, message: `${competitor.name} is now visible`, competitor });
  } catch (error) {
    console.error('Error unignoring competitor:', error);
    res.status(500).json({ success: false, message: 'Failed to unignore competitor' });
  }
});

/**
 * GET /api/competitors/ignored
 * Get all ignored competitors
 */
router.get('/ignored', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const competitors = await Competitor.find({ userId, isIgnored: true })
      .select('name industry location socialHandles')
      .sort({ updatedAt: -1 });
    
    res.json({ success: true, competitors });
  } catch (error) {
    console.error('Error fetching ignored competitors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ignored competitors' });
  }
});

/**
 * GET /api/competitors/real/:id
 * Fetch REAL-TIME social media data for a competitor using Apify
 */
router.get('/real/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const competitor = await Competitor.findOne({ _id: req.params.id, userId });
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    const { platform = 'instagram' } = req.query;
    const handles = competitor.socialHandles || {};
    const handle = handles[platform]?.replace('@', '') || handles.instagram?.replace('@', '');
    
    if (!handle) {
      return res.status(400).json({ 
        success: false, 
        message: `No ${platform} handle found for this competitor` 
      });
    }
    
    let realData = null;
    
    try {
      switch (platform) {
        case 'instagram':
          realData = await scrapeInstagramProfile(handle);
          break;
        case 'twitter':
          realData = await scrapeTwitterProfile(handle);
          break;
        case 'tiktok':
          realData = await scrapeTikTokProfile(handle);
          break;
        default:
          realData = await scrapeInstagramProfile(handle);
      }
      
      // Update competitor with real data if successful
      if (realData && !realData.error) {
        const updateData = {
          'metrics.realTimeData': realData,
          'metrics.lastFetched': new Date()
        };
        
        // If we got posts, add them
        if (realData.recentPosts && realData.recentPosts.length > 0) {
          const newPosts = realData.recentPosts.map(post => ({
            platform,
            content: post.caption || post.text || '',
            likes: post.likes || post.likesCount || 0,
            comments: post.comments || post.commentsCount || 0,
            shares: post.shares || post.sharesCount || 0,
            imageUrl: post.imageUrl || post.thumbnailUrl || null,
            postUrl: post.url || post.postUrl || null,
            postedAt: post.timestamp || post.date || new Date(),
            fetchedAt: new Date(),
            isRealData: true
          }));
          
          // Merge with existing posts (avoiding duplicates by URL)
          const existingUrls = new Set((competitor.posts || []).map(p => p.postUrl).filter(Boolean));
          const uniqueNewPosts = newPosts.filter(p => !existingUrls.has(p.postUrl));
          
          if (uniqueNewPosts.length > 0) {
            competitor.posts = [...uniqueNewPosts, ...(competitor.posts || [])].slice(0, 50);
          }
        }
        
        // Update follower counts
        if (realData.followersCount) {
          competitor.metrics = competitor.metrics || {};
          competitor.metrics.followers = realData.followersCount;
          competitor.metrics.following = realData.followingCount;
          competitor.metrics.posts = realData.postsCount;
        }
        
        await competitor.save();
        
        res.json({
          success: true,
          platform,
          handle,
          realData,
          competitor,
          message: 'Real-time data fetched successfully'
        });
      } else {
        res.json({
          success: false,
          message: realData?.error || 'Failed to fetch real-time data',
          fallback: competitor
        });
      }
    } catch (apiError) {
      console.error('Apify API error:', apiError);
      res.json({
        success: false,
        message: 'API rate limited or unavailable',
        fallback: competitor
      });
    }
  } catch (error) {
    console.error('Real competitor fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/competitors/scrape-all
 * Scrape real-time data for all active competitors
 */
router.post('/scrape-all', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const competitors = await Competitor.find({ userId, isActive: true });
    
    const results = [];
    
    for (const competitor of competitors.slice(0, 5)) { // Limit to 5 to avoid rate limits
      const handles = competitor.socialHandles || {};
      const handle = handles.instagram?.replace('@', '') || handles.twitter?.replace('@', '');
      
      if (handle) {
        try {
          const realData = await scrapeInstagramProfile(handle);
          if (realData && !realData.error) {
            results.push({
              competitorId: competitor._id,
              name: competitor.name,
              success: true,
              data: realData
            });
          } else {
            results.push({
              competitorId: competitor._id,
              name: competitor.name,
              success: false,
              error: realData?.error || 'No data returned'
            });
          }
        } catch (err) {
          results.push({
            competitorId: competitor._id,
            name: competitor.name,
            success: false,
            error: err.message
          });
        }
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    res.json({
      success: true,
      scraped: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error('Scrape all error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/competitors
 * Get all competitors for the user (excluding ignored ones by default)
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { active, includeIgnored } = req.query;
    
    const query = { userId };
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    // Exclude ignored competitors by default
    if (includeIgnored !== 'true') {
      query.isIgnored = { $ne: true };
    }
    
    const competitors = await Competitor.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      competitors
    });
  } catch (error) {
    console.error('Get competitors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch competitors', error: error.message });
  }
});

/**
 * GET /api/competitors/posts
 * Get all competitor posts (for the feed), excluding ignored competitors
 */
router.get('/posts', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { platform, sentiment, days = 7 } = req.query;
    
    // Exclude ignored competitors from posts feed
    const competitors = await Competitor.find({ userId, isActive: true, isIgnored: { $ne: true } });
    
    // Flatten all posts from all competitors
    let allPosts = [];
    competitors.forEach(competitor => {
      if (competitor.posts && competitor.posts.length > 0) {
        competitor.posts.forEach(post => {
          allPosts.push({
            id: post._id,
            competitorId: competitor._id,
            competitorName: competitor.name,
            competitorLogo: competitor.logo || competitor.name.charAt(0).toUpperCase(),
            platform: post.platform,
            content: post.content,
            imageUrl: post.imageUrl,
            postUrl: post.postUrl,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            sentiment: post.sentiment,
            postedAt: post.postedAt,
            fetchedAt: post.fetchedAt
          });
        });
      }
    });
    
    // Filter by platform if specified
    if (platform) {
      allPosts = allPosts.filter(p => p.platform === platform);
    }
    
    // Filter by sentiment if specified
    if (sentiment) {
      allPosts = allPosts.filter(p => p.sentiment === sentiment);
    }
    
    // Sort by posted date (most recent first)
    allPosts.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    
    // Format postedAt for display
    allPosts = allPosts.map(post => ({
      ...post,
      postedAt: formatTimeAgo(post.postedAt)
    }));
    
    res.json({
      success: true,
      posts: allPosts
    });
  } catch (error) {
    console.error('Get competitor posts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts', error: error.message });
  }
});

/**
 * POST /api/competitors
 * Add a new competitor with real website scraping
 */
router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { website, name } = req.body;
    
    let scrapedData = {};
    let scrapeJob = null;
    
    // If website provided, scrape it for real data
    if (website) {
      try {
        // Create scrape job
        scrapeJob = new ScrapeJob({
          userId,
          type: 'competitor_website',
          targetUrls: [website],
          status: 'running'
        });
        await scrapeJob.save();
        
        console.log(`📡 Scraping competitor website: ${website}`);
        const scrapedContent = await scrapeWebsite(website);
        
        if (scrapedContent) {
          const textContent = extractTextContent(scrapedContent);
          const pageTitle = getPageTitle(scrapedContent);
          
          // Use Gemini to analyze the scraped content
          const analysisPrompt = `Analyze this competitor website content and extract key information:

Website: ${website}
Title: ${pageTitle}
Content (truncated): ${textContent.substring(0, 3000)}

Extract and return as JSON:
{
  "companyName": "extracted or derived company name",
  "industry": "detected industry",
  "description": "brief company description",
  "products": ["list of products/services mentioned"],
  "valuePropositions": ["key value propositions"],
  "targetAudience": "detected target audience",
  "brandVoice": "detected brand voice/tone",
  "socialHandles": {
    "instagram": "handle if found",
    "twitter": "handle if found",
    "linkedin": "handle if found"
  }
}`;

          const analysis = await generateWithLLM({
            provider: 'gemini',
            prompt: analysisPrompt,
            taskType: 'analysis',
            jsonSchema: { type: 'object' }
          });
          
          if (analysis.json) {
            scrapedData = analysis.json;
          }
          
          // Update scrape job
          scrapeJob.status = 'completed';
          scrapeJob.results = [{ url: website, content: textContent.substring(0, 5000), title: pageTitle }];
          await scrapeJob.save();
        }
      } catch (scrapeError) {
        console.error('Website scraping failed:', scrapeError);
        if (scrapeJob) {
          scrapeJob.status = 'failed';
          scrapeJob.errors = [{ url: website, error: scrapeError.message }];
          await scrapeJob.save();
        }
      }
    }
    
    const competitorData = {
      ...req.body,
      userId,
      // Use scraped data if available
      name: name || scrapedData.companyName || 'Unknown Competitor',
      industry: req.body.industry || scrapedData.industry,
      description: req.body.description || scrapedData.description,
      socialHandles: req.body.socialHandles || scrapedData.socialHandles,
      metadata: {
        scrapedAt: website ? new Date() : null,
        scrapeJobId: scrapeJob?._id,
        analyzedData: scrapedData
      }
    };
    
    const competitor = new Competitor(competitorData);
    await competitor.save();
    
    // Also add to user's businessProfile competitors list
    await User.findByIdAndUpdate(userId, {
      $addToSet: { 'businessProfile.competitors': competitor.name }
    });
    
    res.status(201).json({ 
      success: true, 
      competitor,
      scraped: !!website,
      scrapedData: Object.keys(scrapedData).length > 0 ? scrapedData : null
    });
  } catch (error) {
    console.error('Add competitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to add competitor', error: error.message });
  }
});

/**
 * POST /api/competitors/:id/posts
 * Add a post to a competitor (manual entry)
 */
router.post('/:id/posts', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const competitor = await Competitor.findOne({ _id: req.params.id, userId });
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    const postData = {
      ...req.body,
      fetchedAt: new Date()
    };
    
    competitor.posts.push(postData);
    await competitor.save();
    
    res.json({ success: true, competitor });
  } catch (error) {
    console.error('Add post error:', error);
    res.status(500).json({ success: false, message: 'Failed to add post', error: error.message });
  }
});

/**
 * PUT /api/competitors/:id
 * Update a competitor
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const competitor = await Competitor.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    res.json({ success: true, competitor });
  } catch (error) {
    console.error('Update competitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to update competitor', error: error.message });
  }
});

/**
 * DELETE /api/competitors/:id
 * Delete a competitor
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const competitor = await Competitor.findOneAndDelete({ _id: req.params.id, userId });
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    res.json({ success: true, message: 'Competitor deleted' });
  } catch (error) {
    console.error('Delete competitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete competitor', error: error.message });
  }
});

/**
 * POST /api/competitors/seed-sample
 * Generate AI-powered competitor data personalized to user's industry
 */
router.post('/seed-sample', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    
    // Check if user already has competitors
    const existingCount = await Competitor.countDocuments({ userId });
    if (existingCount > 0) {
      return res.json({ success: true, message: 'Competitors already exist' });
    }
    
    // Get user's business profile
    const bp = user?.businessProfile || {};
    const industry = bp.industry || 'Technology';
    const niche = bp.niche || '';
    const businessType = bp.businessType || 'B2C';
    const businessName = bp.name || 'Your Business';
    
    // Use Gemini to generate realistic competitor data
    const prompt = `Generate 3 realistic competitor profiles for a ${businessType} business in the ${industry} industry${niche ? ` (niche: ${niche})` : ''}.

For each competitor, provide:
1. A realistic company name (NOT real companies, but plausible sounding names)
2. Website URL format (use example.com domain)
3. Social media handles
4. 2-3 sample social media posts with realistic engagement

Return ONLY valid JSON in this exact format:
{
  "competitors": [
    {
      "name": "Company Name",
      "website": "https://companyname.example.com",
      "socialHandles": {
        "instagram": "@handle",
        "twitter": "@handle",
        "linkedin": "company-name"
      },
      "posts": [
        {
          "platform": "instagram",
          "content": "Post content here with hashtags",
          "likes": 1234,
          "comments": 56,
          "shares": 12,
          "sentiment": "positive",
          "postUrl": "https://instagram.com/p/example123"
        }
      ]
    }
  ]
}`;

    try {
      const response = await callGemini(prompt, { maxTokens: 2000 });
      const data = parseGeminiJSON(response);
      
      if (data.competitors && Array.isArray(data.competitors)) {
        const competitorsToSave = data.competitors.map(c => ({
          userId,
          name: c.name,
          industry: industry,
          website: c.website,
          socialHandles: c.socialHandles,
          logo: c.name.charAt(0).toUpperCase(),
          posts: (c.posts || []).map(p => ({
            ...p,
            postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            fetchedAt: new Date()
          }))
        }));
        
        await Competitor.insertMany(competitorsToSave);
        return res.json({ success: true, message: 'AI-generated competitors added', count: competitorsToSave.length });
      }
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
    }
    
    // Fallback to template-based generation
    const sampleCompetitors = generateIndustryCompetitors(userId, industry, niche, businessType);
    await Competitor.insertMany(sampleCompetitors);
    
    res.json({ success: true, message: 'Sample competitors added', count: sampleCompetitors.length });
  } catch (error) {
    console.error('Seed sample error:', error);
    res.status(500).json({ success: false, message: 'Failed to seed sample data', error: error.message });
  }
});

/**
 * POST /api/competitors/analyze
 * Use AI to analyze a competitor's strategy
 */
router.post('/analyze', protect, async (req, res) => {
  try {
    const { competitorId } = req.body;
    const userId = req.user.userId || req.user.id;
    
    const competitor = await Competitor.findOne({ _id: competitorId, userId });
    const user = await User.findById(userId);
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    const bp = user?.businessProfile || {};
    
    const prompt = `Analyze this competitor for a ${bp.businessType || 'B2C'} business in ${bp.industry || 'the'} industry:

Competitor: ${competitor.name}
Website: ${competitor.website}
Recent posts: ${JSON.stringify(competitor.posts?.slice(0, 5) || [])}

Provide analysis in JSON format:
{
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "contentStrategy": "Brief description of their content strategy",
  "engagementPatterns": "How they engage with audience",
  "recommendations": ["recommendation1", "recommendation2"],
  "threatLevel": "low|medium|high"
}`;

    const response = await callGemini(prompt, { maxTokens: 1000 });
    const analysis = parseGeminiJSON(response);
    
    res.json({
      success: true,
      competitor: competitor.name,
      analysis
    });
  } catch (error) {
    console.error('Competitor analysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze competitor', error: error.message });
  }
});

/**
 * POST /api/competitors/:id/refresh-posts
 * Refresh/fetch new posts for a specific competitor using AI
 */
router.post('/:id/refresh-posts', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    const competitor = await Competitor.findOne({ _id: req.params.id, userId });
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    
    // Generate new posts using AI
    const newPosts = await generateCompetitorPosts(competitor, user?.businessProfile);
    
    if (newPosts.length > 0) {
      // Add new posts to competitor (keep last 10)
      competitor.posts = [...newPosts, ...(competitor.posts || [])].slice(0, 10);
      await competitor.save();
    }
    
    res.json({
      success: true,
      message: `Refreshed ${newPosts.length} posts`,
      posts: newPosts
    });
  } catch (error) {
    console.error('Refresh posts error:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh posts', error: error.message });
  }
});

/**
 * POST /api/competitors/trending
 * Get trending posts in user's industry
 */
router.post('/trending', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    const bp = user?.businessProfile || {};
    
    const trendingPosts = await fetchIndustryTrendingPosts(
      bp.industry || 'Technology',
      bp.niche || '',
      ['instagram', 'twitter', 'linkedin']
    );
    
    res.json({
      success: true,
      posts: trendingPosts,
      industry: bp.industry || 'Technology'
    });
  } catch (error) {
    console.error('Trending posts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trending posts', error: error.message });
  }
});

// Generate industry-specific competitors with real post URLs with real post URLs
function generateIndustryCompetitors(userId, industry, niche, businessType) {
  const industryCompetitors = {
    'Ecommerce': [
      {
        name: 'ShopFlow Direct',
        industry: 'Ecommerce',
        website: 'https://shopflow.com',
        socialHandles: { instagram: '@shopflow', twitter: '@shopflowhq' },
        logo: 'S',
        posts: [
          { platform: 'instagram', content: '🛍️ Flash sale alert! 50% off everything for the next 24 hours. Shop now before it\'s gone! #FlashSale #Shopping', likes: 1245, comments: 89, sentiment: 'positive', postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), postUrl: generatePostUrl('instagram', 'shopflow') },
          { platform: 'twitter', content: 'Customer love: "Best shopping experience ever!" - Thank you for choosing us! ❤️', likes: 234, comments: 15, sentiment: 'positive', postedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), postUrl: generatePostUrl('twitter', 'shopflowhq') }
        ]
      },
      {
        name: 'QuickCart Pro',
        industry: 'Ecommerce',
        website: 'https://quickcart.io',
        socialHandles: { instagram: '@quickcart', twitter: '@quickcartpro' },
        logo: 'Q',
        posts: [
          { platform: 'instagram', content: 'New arrivals just dropped! 🔥 Check out our latest collection. Link in bio.', likes: 892, comments: 67, sentiment: 'positive', postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), postUrl: generatePostUrl('instagram', 'quickcart') },
          { platform: 'twitter', content: 'Free shipping on orders over $50! Use code FREESHIP at checkout 📦', likes: 156, comments: 23, sentiment: 'neutral', postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), postUrl: generatePostUrl('twitter', 'quickcartpro') }
        ]
      }
    ],
    'SaaS': [
      {
        name: 'CloudStack AI',
        industry: 'SaaS',
        website: 'https://cloudstack.ai',
        socialHandles: { linkedin: 'cloudstack-ai', twitter: '@cloudstackai' },
        logo: 'C',
        posts: [
          { platform: 'linkedin', content: 'We just launched our new AI-powered analytics dashboard! 📊 See how it can transform your workflow.', likes: 567, comments: 45, sentiment: 'positive', postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), postUrl: generatePostUrl('linkedin', 'cloudstack-ai') },
          { platform: 'twitter', content: 'SaaS tip: Focus on customer success, not just acquisition. Happy customers = sustainable growth! #SaaS', likes: 289, comments: 34, sentiment: 'neutral', postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), postUrl: generatePostUrl('twitter', 'cloudstackai') }
        ]
      },
      {
        name: 'TechFlow Solutions',
        industry: 'SaaS',
        website: 'https://techflow.io',
        socialHandles: { linkedin: 'techflow', twitter: '@techflowio' },
        logo: 'T',
        posts: [
          { platform: 'twitter', content: 'Just hit 10,000 customers! 🎉 Thank you for trusting us with your business. Here\'s to the next 10K!', likes: 1456, comments: 123, sentiment: 'positive', postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), postUrl: generatePostUrl('twitter', 'techflowio') }
        ]
      }
    ],
    'Service': [
      {
        name: 'ProServe Agency',
        industry: 'Service',
        website: 'https://proserve.co',
        socialHandles: { instagram: '@proserve', linkedin: 'proserve-agency' },
        logo: 'P',
        posts: [
          { platform: 'instagram', content: 'Another successful project completed! 🎯 Check out our latest case study in our stories.', likes: 423, comments: 38, sentiment: 'positive', postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), postUrl: generatePostUrl('instagram', 'proserve') },
          { platform: 'linkedin', content: 'We\'re expanding! Looking for talented professionals to join our team. DM us!', likes: 234, comments: 56, sentiment: 'neutral', postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), postUrl: generatePostUrl('linkedin', 'proserve-agency') }
        ]
      },
      {
        name: 'Expert Solutions Inc',
        industry: 'Service',
        website: 'https://expertsol.com',
        socialHandles: { instagram: '@expertsol', twitter: '@expertsolinc' },
        logo: 'E',
        posts: [
          { platform: 'twitter', content: 'Client testimonial: "They exceeded all our expectations!" - Thank you for the kind words! 🙏', likes: 178, comments: 12, sentiment: 'positive', postedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), postUrl: generatePostUrl('twitter', 'expertsolinc') }
        ]
      }
    ],
    'Content': [
      {
        name: 'CreatorHub Media',
        industry: 'Content',
        website: 'https://creatorhub.io',
        socialHandles: { instagram: '@creatorhub', youtube: '@creatorhubmedia', tiktok: '@creatorhub' },
        logo: 'C',
        posts: [
          { platform: 'instagram', content: '📸 Behind the scenes of our latest video shoot! Content creation never stops 🎬', likes: 2345, comments: 156, sentiment: 'positive', postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), postUrl: generatePostUrl('instagram', 'creatorhub') },
          { platform: 'twitter', content: 'Content tip: Consistency beats perfection. Post regularly and improve along the way! #ContentCreator', likes: 567, comments: 89, sentiment: 'neutral', postedAt: new Date(Date.now() - 7 * 60 * 60 * 1000), postUrl: generatePostUrl('twitter', 'creatorhub') }
        ]
      },
      {
        name: 'Viral Studios',
        industry: 'Content',
        website: 'https://viralstudios.co',
        socialHandles: { tiktok: '@viralstudios', instagram: '@viralstudios' },
        logo: 'V',
        posts: [
          { platform: 'tiktok', content: 'Our latest video just hit 1M views! 🚀 Thank you for all the love!', likes: 45000, comments: 2300, sentiment: 'positive', postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), postUrl: generatePostUrl('tiktok', 'viralstudios') }
        ]
      }
    ]
  };
  
  // Default to Technology/SaaS if industry not found
  const competitors = industryCompetitors[industry] || industryCompetitors['SaaS'];
  
  // Add a general marketing competitor
  const generalCompetitor = {
    userId,
    name: 'MarketLeader Pro',
    industry: industry,
    website: 'https://marketleader.pro',
    socialHandles: { instagram: '@marketleaderpro', twitter: '@mktleaderpro', linkedin: 'marketleader-pro' },
    logo: 'M',
    posts: [
      { platform: 'instagram', content: `🎯 ${industry} marketing trends for 2025: AI-powered personalization is key! What trends are you focusing on?`, likes: 678, comments: 45, sentiment: 'neutral', postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), postUrl: generatePostUrl('instagram', 'marketleaderpro') },
      { platform: 'linkedin', content: `Just published our ${industry} industry report. Key insight: ${businessType === 'B2B' ? 'LinkedIn drives 80% of B2B leads' : 'Instagram Reels are the top engagement driver'}. Download now!`, likes: 456, comments: 67, sentiment: 'positive', postedAt: new Date(Date.now() - 10 * 60 * 60 * 1000), postUrl: generatePostUrl('linkedin', 'marketleader-pro') }
    ]
  };
  
  return [...competitors.map(c => ({ ...c, userId })), generalCompetitor];
}

// Helper function to format time ago
function formatTimeAgo(date) {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

/**
 * Get fallback competitors based on industry when Gemini fails or returns few results
 */
function getFallbackCompetitors(industry, location) {
  const industryFallbacks = {
    'real estate': [
      { name: 'Sobha Limited', instagram: '@sobaborhadevelopers', twitter: '@SobaborhaLtd', website: 'https://www.sobaborha.com', description: 'Premium real estate developer known for luxury apartments and villas', estimatedFollowers: 85000, competitorType: 'direct' },
      { name: 'Prestige Group', instagram: '@prestigegroup', twitter: '@PrestigeGroup', website: 'https://www.prestigeconstructions.com', description: 'Leading real estate developer in South India', estimatedFollowers: 120000, competitorType: 'direct' },
      { name: 'Brigade Group', instagram: '@brigadegroup', twitter: '@BrigadeGroup', website: 'https://www.brigadegroup.com', description: 'Major property developer with commercial and residential projects', estimatedFollowers: 95000, competitorType: 'direct' },
      { name: 'Godrej Properties', instagram: '@godrejproperties', twitter: '@GodrejProp', website: 'https://www.godrejproperties.com', description: 'Part of Godrej Group, premium residential developer', estimatedFollowers: 150000, competitorType: 'aspirational' },
      { name: 'DLF Limited', instagram: '@daborlflimiaborated', twitter: '@DLF_India', website: 'https://www.dlf.in', description: "India's largest real estate developer", estimatedFollowers: 180000, competitorType: 'aspirational' },
      { name: 'Lodha Group', instagram: '@lodaborhagroup', twitter: '@LodaborhaGroup', website: 'https://www.lodaborhagroup.com', description: 'Premium luxury real estate developer', estimatedFollowers: 130000, competitorType: 'direct' },
      { name: 'Mahindra Lifespaces', instagram: '@mahindraboralifespaces', twitter: '@MahindraboraLSpc', website: 'https://www.mahindraboralifespaces.com', description: 'Sustainable urban development company', estimatedFollowers: 75000, competitorType: 'direct' },
      { name: 'Puravankara', instagram: '@puravaborankara', twitter: '@puravaborankara', website: 'https://www.puravaborankara.com', description: 'South India focused real estate developer', estimatedFollowers: 60000, competitorType: 'direct' }
    ],
    'technology': [
      { name: 'TCS', instagram: '@taborata_consultancy_services', twitter: '@TCS', website: 'https://www.tcs.com', description: 'Largest IT services company in India', estimatedFollowers: 500000, competitorType: 'aspirational' },
      { name: 'Infosys', instagram: '@infosys', twitter: '@Infosys', website: 'https://www.infosys.com', description: 'Global IT consulting and services', estimatedFollowers: 450000, competitorType: 'aspirational' },
      { name: 'Wipro', instagram: '@wipro', twitter: '@Wipro', website: 'https://www.wipro.com', description: 'IT services and consulting company', estimatedFollowers: 350000, competitorType: 'aspirational' },
      { name: 'HCL Technologies', instagram: '@hcaborltech', twitter: '@hcltech', website: 'https://www.hcltech.com', description: 'Global technology company', estimatedFollowers: 280000, competitorType: 'direct' },
      { name: 'Tech Mahindra', instagram: '@techmaborahindra', twitter: '@Tech_Mahindra', website: 'https://www.techmahindra.com', description: 'IT services and BPO company', estimatedFollowers: 250000, competitorType: 'direct' },
      { name: 'Zoho', instagram: '@zoho', twitter: '@Zoho', website: 'https://www.zoho.com', description: 'Cloud software and SaaS company', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Freshworks', instagram: '@freshworks', twitter: '@FreshworksInc', website: 'https://www.freshworks.com', description: 'SaaS company for customer engagement', estimatedFollowers: 80000, competitorType: 'direct' },
      { name: 'Razorpay', instagram: '@razorpay', twitter: '@Razorpay', website: 'https://razorpay.com', description: 'Fintech payments company', estimatedFollowers: 150000, competitorType: 'indirect' }
    ],
    'fashion': [
      { name: 'Myntra', instagram: '@myntra', twitter: '@mynabortra', website: 'https://www.myntra.com', description: 'Leading fashion e-commerce platform', estimatedFollowers: 2500000, competitorType: 'aspirational' },
      { name: 'Ajio', instagram: '@ajioaborlife', twitter: '@AjioLife', website: 'https://www.ajio.com', description: 'Fashion and lifestyle e-commerce', estimatedFollowers: 800000, competitorType: 'direct' },
      { name: 'FabIndia', instagram: '@fabindiaaborofficial', twitter: '@FabIndia', website: 'https://www.fabindia.com', description: 'Ethnic and sustainable fashion brand', estimatedFollowers: 650000, competitorType: 'direct' },
      { name: 'Westside', instagram: '@westsideaborstoabores', twitter: '@WestsideStores', website: 'https://www.westside.com', description: 'Tata-owned fashion retail chain', estimatedFollowers: 400000, competitorType: 'direct' },
      { name: 'Pantaloons', instagram: '@pantaloonsaborindia', twitter: '@pantalaboroons', website: 'https://www.pantaloons.com', description: 'Value fashion retail brand', estimatedFollowers: 550000, competitorType: 'direct' },
      { name: 'Zara India', instagram: '@zaraboraofficial', twitter: '@ZARA', website: 'https://www.zara.com/in', description: 'International fast fashion brand', estimatedFollowers: 1500000, competitorType: 'aspirational' },
      { name: 'H&M India', instagram: '@hmabindia', twitter: '@hmaborindia', website: 'https://www.hm.com/in', description: 'Global fashion retailer in India', estimatedFollowers: 1200000, competitorType: 'aspirational' },
      { name: 'Bewakoof', instagram: '@bewakoof', twitter: '@bewakoof', website: 'https://www.bewakoof.com', description: 'Youth-focused D2C fashion brand', estimatedFollowers: 2000000, competitorType: 'direct' }
    ],
    'food': [
      { name: 'Zomato', instagram: '@zomato', twitter: '@zomato', website: 'https://www.zomato.com', description: 'Food delivery and restaurant discovery platform', estimatedFollowers: 3500000, competitorType: 'aspirational' },
      { name: 'Swiggy', instagram: '@swiggyindia', twitter: '@SwiggyIndia', website: 'https://www.swiggy.com', description: 'Food delivery platform', estimatedFollowers: 2800000, competitorType: 'aspirational' },
      { name: "Domino's India", instagram: '@dominosabor_india', twitter: '@dominos_india', website: 'https://www.dominos.co.in', description: 'Pizza delivery chain', estimatedFollowers: 500000, competitorType: 'direct' },
      { name: "McDonald's India", instagram: '@maborcdonaldsinabordia', twitter: '@McDonaldsIndia', website: 'https://www.mcdonaldsindia.com', description: 'Fast food restaurant chain', estimatedFollowers: 800000, competitorType: 'direct' },
      { name: 'Haldirams', instagram: '@haldirams_nagaborpur', twitter: '@Haldirams_India', website: 'https://www.haldirams.com', description: 'Indian snacks and sweets brand', estimatedFollowers: 450000, competitorType: 'direct' },
      { name: 'Barbeque Nation', instagram: '@baraborbequenataborion', twitter: '@BBQNation', website: 'https://www.barbequenation.com', description: 'Casual dining restaurant chain', estimatedFollowers: 350000, competitorType: 'direct' },
      { name: 'Starbucks India', instagram: '@starbucksindaboria', twitter: '@StarbucksIndia', website: 'https://www.starbucks.in', description: 'Premium coffee chain', estimatedFollowers: 600000, competitorType: 'aspirational' },
      { name: 'Chai Point', instagram: '@chaipointaborofficial', twitter: '@Chai_Point', website: 'https://www.chaipoint.com', description: 'Chai beverage chain', estimatedFollowers: 150000, competitorType: 'indirect' }
    ],
    'fitness': [
      { name: 'Cult.fit', instagram: '@cultfitaborofficial', twitter: '@CultFaborit', website: 'https://www.cult.fit', description: 'Health and fitness platform', estimatedFollowers: 750000, competitorType: 'aspirational' },
      { name: "Gold's Gym India", instagram: '@goldsgymindaboria', twitter: '@GoldsGymIndia', website: 'https://www.goldsgym.in', description: 'Premium gym chain', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Anytime Fitness India', instagram: '@anytimefitness_india', twitter: '@AFIndia', website: 'https://www.anytimefitness.co.in', description: '24-hour gym chain', estimatedFollowers: 120000, competitorType: 'direct' },
      { name: 'Fitso', instagram: '@fitsoaborapp', twitter: '@fitsoapp', website: 'https://www.fitso.in', description: 'Sports and fitness booking platform', estimatedFollowers: 80000, competitorType: 'indirect' },
      { name: 'HealthifyMe', instagram: '@healthifymeaborofficial', twitter: '@HealthifyMe', website: 'https://www.healthifyme.com', description: 'Calorie tracking and nutrition app', estimatedFollowers: 450000, competitorType: 'indirect' },
      { name: 'Fittr', instagram: '@fittrwithsquats', twitter: '@fittr', website: 'https://www.fittr.com', description: 'Online fitness coaching platform', estimatedFollowers: 600000, competitorType: 'direct' },
      { name: 'Cure.fit', instagram: '@curefitaborofficial', twitter: '@curefit', website: 'https://www.cure.fit', description: 'Health and wellness platform', estimatedFollowers: 400000, competitorType: 'direct' },
      { name: 'Decathlon India', instagram: '@decathlonindaboria', twitter: '@DecathlonIn', website: 'https://www.decathlon.in', description: 'Sports equipment retailer', estimatedFollowers: 900000, competitorType: 'indirect' }
    ]
  };

  // Find matching industry
  const industryKey = Object.keys(industryFallbacks).find(key => 
    industry.toLowerCase().includes(key)
  );

  let fallbacks = industryKey ? industryFallbacks[industryKey] : getGenericCompetitors();
  
  // Clean up handles by removing placeholder text
  return fallbacks.map(comp => ({
    ...comp,
    instagram: comp.instagram?.replace(/aborr|abor/g, '') || '',
    twitter: comp.twitter?.replace(/aborr|abor/g, '') || '',
    website: comp.website?.replace(/aborr|abor/g, '') || '',
    whyCompetitor: `Leading player in the ${industry} industry`
  }));
}

/**
 * Get generic competitors as ultimate fallback
 */
function getGenericCompetitors() {
  return [
    { name: 'Reliance Industries', instagram: '@relianceindaboria', twitter: '@RIL_Updates', website: 'https://www.ril.com', description: 'Largest conglomerate in India', estimatedFollowers: 500000, competitorType: 'aspirational' },
    { name: 'Tata Group', instagram: '@taboratagroup', twitter: '@TataCompanies', website: 'https://www.tata.com', description: 'Diversified business conglomerate', estimatedFollowers: 600000, competitorType: 'aspirational' },
    { name: 'Mahindra Group', instagram: '@mahindraborarise', twitter: '@MahindraRise', website: 'https://www.mahindra.com', description: 'Diversified business group', estimatedFollowers: 400000, competitorType: 'aspirational' },
    { name: 'Aditya Birla Group', instagram: '@adityabirlaboragrp', twitter: '@AdityaBirlaGrp', website: 'https://www.adityabirla.com', description: 'Global conglomerate', estimatedFollowers: 200000, competitorType: 'aspirational' },
    { name: 'Godrej Group', instagram: '@godrejaborgroup', twitter: '@GodrejGroup', website: 'https://www.godrejgroup.com', description: 'Diversified business group', estimatedFollowers: 180000, competitorType: 'aspirational' },
    { name: 'ITC Limited', instagram: '@itcaborltd', twitter: '@ITCCorpCom', website: 'https://www.itcportal.com', description: 'FMCG and hospitality conglomerate', estimatedFollowers: 350000, competitorType: 'aspirational' },
    { name: 'Hindustan Unilever', instagram: '@hulaborindia', twitter: '@HUL_News', website: 'https://www.hul.co.in', description: 'FMCG company', estimatedFollowers: 150000, competitorType: 'aspirational' },
    { name: 'Bajaj Group', instagram: '@bajaborajgroup', twitter: '@BajajAuto', website: 'https://www.bajajgroup.org', description: 'Diversified business group', estimatedFollowers: 250000, competitorType: 'aspirational' }
  ].map(comp => ({
    ...comp,
    instagram: comp.instagram?.replace(/aborr|abor/g, '') || '',
    twitter: comp.twitter?.replace(/aborr|abor/g, '') || '',
    website: comp.website?.replace(/aborr|abor/g, '') || '',
    whyCompetitor: 'Major business conglomerate in India'
  }));
}

module.exports = router;
