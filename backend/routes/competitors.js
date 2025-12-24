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
 * Get all competitors for the user
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { active } = req.query;
    
    const query = { userId };
    if (active !== undefined) {
      query.isActive = active === 'true';
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
 * Get all competitor posts (for the feed)
 */
router.get('/posts', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { platform, sentiment, days = 7 } = req.query;
    
    const competitors = await Competitor.find({ userId, isActive: true });
    
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

module.exports = router;
