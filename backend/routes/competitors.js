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

// Import Gemini AI for generating competitor insights (not for posts)
const { generateCompetitorActivity } = require('../services/geminiAI');

// Import real social media API service for fetching actual posts
const {
  scrapeInstagramProfile,
  scrapeInstagramPosts,
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
 * Automatically discover competitors using DUAL-AGENT ARCHITECTURE:
 * 1. MAKER AGENT: Deep research to find 10+ competitors
 * 2. CHECKER AGENT: Validates each competitor is real and relevant
 */
router.post('/auto-discover', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);
    const { location, forceRefresh = false } = req.body;

    console.log('🔍 Auto-discovering competitors for user:', userId);
    console.log('🏗️ Using DUAL-AGENT architecture: Maker + Checker');

    // Get business context from OnboardingContext
    const onboardingContext = await OnboardingContext.findOne({ userId });
    const bp = user?.businessProfile || {};

    // STEP 1: If we have a website, scrape it to get ACCURATE business details
    let scrapedBusinessInfo = null;
    const websiteUrl = onboardingContext?.company?.website || bp.website;
    
    if (websiteUrl) {
      console.log('🌐 Scraping website for accurate business info:', websiteUrl);
      try {
        scrapedBusinessInfo = await scrapeBusinessFromWebsite(websiteUrl);
        console.log('📋 Scraped business info:', JSON.stringify(scrapedBusinessInfo, null, 2));
      } catch (scrapeError) {
        console.error('Website scrape failed:', scrapeError.message);
      }
    }

    // Build business context - PREFER scraped data over user-entered data
    const businessContext = {
      companyName: scrapedBusinessInfo?.name || onboardingContext?.company?.name || bp.name || 'Your Business',
      industry: scrapedBusinessInfo?.industry || onboardingContext?.company?.industry || bp.industry || 'General',
      description: scrapedBusinessInfo?.description || onboardingContext?.company?.description || bp.niche || '',
      targetCustomer: scrapedBusinessInfo?.targetCustomer || onboardingContext?.targetCustomer?.description || bp.targetAudience || '',
      // Location: PREFER scraped location, then use provided location, then onboarding
      location: scrapedBusinessInfo?.location || location || onboardingContext?.geography?.businessLocation || onboardingContext?.geography?.regions?.[0] || onboardingContext?.geography?.countries?.[0] || 'India',
      website: websiteUrl || '',
      products: scrapedBusinessInfo?.products || [],
      keywords: scrapedBusinessInfo?.keywords || []
    };

    console.log('📋 Business context for competitor discovery:', JSON.stringify(businessContext, null, 2));

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

      if (existingCompetitors.length >= 8) {
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

    // ============================================
    // DUAL-AGENT ARCHITECTURE
    // ============================================
    
    // AGENT 1: MAKER - Deep research to find competitors
    console.log('🤖 AGENT 1 (MAKER): Deep research for competitors...');
    const makerResults = await makerAgentDiscoverCompetitors(businessContext);
    console.log(`📊 Maker Agent found ${makerResults.length} potential competitors`);

    // AGENT 2: CHECKER - Validate each competitor
    console.log('🔍 AGENT 2 (CHECKER): Validating competitors...');
    const validatedCompetitors = await checkerAgentValidateCompetitors(makerResults, businessContext);
    console.log(`✅ Checker Agent validated ${validatedCompetitors.length} competitors`);

    // Fallback if we still don't have enough
    let competitors = validatedCompetitors;
    if (competitors.length < 10) {
      console.log('⚠️ Not enough validated competitors, adding industry fallbacks...');
      const fallbackCompetitors = getFallbackCompetitors(businessContext.industry, businessContext.location);
      
      // Only add fallbacks that aren't already in our list
      const existingNames = new Set(competitors.map(c => c.name.toLowerCase()));
      const newFallbacks = fallbackCompetitors.filter(fc => !existingNames.has(fc.name.toLowerCase()));
      
      competitors = [...competitors, ...newFallbacks].slice(0, 12);
    }

    console.log(`🎯 Final competitor count: ${competitors.length}`);

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
          location: comp.location || businessContext.location,
          isActive: true,
          isAutoDiscovered: true,
          posts: [],
          metrics: {
            followers: comp.estimatedFollowers || 0,
            lastFetched: new Date()
          },
          validatedByChecker: comp.validated || false,
          competitorType: comp.competitorType || 'direct'
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
      validated: validatedCompetitors.length,
      message: `Discovered ${savedCompetitors.length} competitors in ${businessContext.location}`,
      agentStats: {
        makerFound: makerResults.length,
        checkerValidated: validatedCompetitors.length,
        finalCount: savedCompetitors.length
      }
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
 * Scrape a website to extract accurate business information
 * This helps get the CORRECT location and industry
 */
async function scrapeBusinessFromWebsite(websiteUrl) {
  try {
    const scrapedData = await scrapeWebsite(websiteUrl);
    if (!scrapedData || !scrapedData.content) {
      return null;
    }

    // Use Gemini to analyze the scraped content
    const prompt = `Analyze this website content and extract business information.

WEBSITE CONTENT:
${scrapedData.content.substring(0, 8000)}

Extract and return ONLY this JSON (no other text):
{
  "name": "Company name",
  "industry": "Specific industry (e.g., 'Social Media Management SaaS', 'E-commerce', 'FinTech')",
  "description": "What the company does in 2-3 sentences",
  "location": "Where the company is headquartered (City, Country)",
  "targetCustomer": "Who they sell to",
  "products": ["List of main products/services"],
  "keywords": ["Relevant industry keywords for competitor search"]
}

Be SPECIFIC about the industry and location. If it's a SaaS company, mention "SaaS". 
If location is not clear, return "Global" or the most likely location based on context.`;

    const response = await callGemini(prompt, { maxTokens: 1000, skipCache: true });
    const result = parseGeminiJSON(response);
    
    console.log('🌐 Extracted business info from website:', result);
    return result;
  } catch (error) {
    console.error('Error scraping website for business info:', error.message);
    return null;
  }
}

/**
 * MAKER AGENT: Deep research to find 10+ competitors
 * Does comprehensive market research to identify ALL potential competitors
 */
async function makerAgentDiscoverCompetitors(businessContext) {
  const prompt = `You are a SENIOR MARKET RESEARCH ANALYST at McKinsey & Company.
Your task is to conduct DEEP MARKET RESEARCH to find ALL competitors for a business.

═══════════════════════════════════════════════════════════════
📋 BUSINESS TO ANALYZE:
═══════════════════════════════════════════════════════════════
• Company Name: ${businessContext.companyName}
• Website: ${businessContext.website || 'Not provided'}
• Industry: ${businessContext.industry}
• Description: ${businessContext.description || 'Not provided'}
• Target Customer: ${businessContext.targetCustomer || 'Not specified'}
• Location: ${businessContext.location}
• Products/Services: ${(businessContext.products || []).join(', ') || 'Not specified'}
• Keywords: ${(businessContext.keywords || []).join(', ') || 'Not specified'}

═══════════════════════════════════════════════════════════════
🔍 DEEP RESEARCH INSTRUCTIONS:
═══════════════════════════════════════════════════════════════

Think step by step:

1. **UNDERSTAND THE BUSINESS**: What exactly does ${businessContext.companyName} do? 
   - What problem do they solve?
   - Who are their customers?
   - What is their business model?

2. **IDENTIFY COMPETITOR CATEGORIES**:
   - Direct competitors (same product, same market)
   - Indirect competitors (different product, same need)
   - Substitute products/services
   - Global players with local presence
   - Local/regional players

3. **RESEARCH EACH CATEGORY**: For ${businessContext.industry} in ${businessContext.location}:
   - Who are the market leaders?
   - Who are the well-funded startups?
   - Who are the established players?
   - Who are the emerging disruptors?

4. **FIND 12-15 COMPETITORS**: You MUST find at least 12 different competitors.

═══════════════════════════════════════════════════════════════
📊 COMPETITOR REQUIREMENTS:
═══════════════════════════════════════════════════════════════

MUST INCLUDE (at least 12 total):
- 3-4 Market Leaders (everyone knows them)
- 3-4 Direct Competitors (same space)
- 2-3 Indirect Competitors (adjacent space)
- 2-3 Well-funded Startups (Series A+)
- 2 Global Players (if applicable)

EACH COMPETITOR MUST HAVE:
- Real company that exists
- Active social media presence
- Verifiable website
- Clear relevance to ${businessContext.companyName}

═══════════════════════════════════════════════════════════════
📱 SOCIAL MEDIA REQUIREMENTS:
═══════════════════════════════════════════════════════════════

For EACH competitor, provide their REAL social handles:
- Instagram: @handle (must be real, verified if possible)
- Twitter/X: @handle (must be real)
- LinkedIn: company page URL
- Website: https://... (official website)

DO NOT make up handles. Only include handles you're confident exist.

═══════════════════════════════════════════════════════════════
📋 RETURN FORMAT (JSON only):
═══════════════════════════════════════════════════════════════
{
  "analysis": {
    "businessType": "What type of business ${businessContext.companyName} is",
    "mainProducts": ["List of their products/services"],
    "targetMarket": "Who they target",
    "competitorCategories": ["Categories of competitors identified"]
  },
  "competitors": [
    {
      "name": "Competitor Name",
      "website": "https://competitor.com",
      "instagram": "@handle",
      "twitter": "@handle",
      "linkedin": "https://linkedin.com/company/...",
      "description": "What they do and why they compete with ${businessContext.companyName}",
      "location": "Headquarters location",
      "estimatedFollowers": 50000,
      "competitorType": "market_leader|direct|indirect|startup|global",
      "whyCompetitor": "Specific reason why they're a competitor",
      "strength": "Their main competitive advantage"
    }
  ]
}

Remember: Find AT LEAST 12 competitors. More is better. Be thorough!`;

  try {
    const response = await callGemini(prompt, { maxTokens: 5000, skipCache: true });
    const result = parseGeminiJSON(response);

    if (result && result.competitors && Array.isArray(result.competitors)) {
      console.log(`🤖 MAKER AGENT: Found ${result.competitors.length} competitors`);
      if (result.analysis) {
        console.log('📊 Business Analysis:', JSON.stringify(result.analysis, null, 2));
      }
      return result.competitors;
    }

    console.error('MAKER AGENT: Invalid response format');
    return [];
  } catch (error) {
    console.error('MAKER AGENT error:', error.message);
    return [];
  }
}

/**
 * CHECKER AGENT: Validates each competitor found by Maker Agent
 * Ensures competitors are real, relevant, and have accurate data
 */
async function checkerAgentValidateCompetitors(competitors, businessContext) {
  if (!competitors || competitors.length === 0) {
    return [];
  }

  // Format competitors for validation
  const competitorList = competitors.map((c, i) => 
    `${i + 1}. ${c.name} - ${c.description || 'No description'} - Website: ${c.website || 'None'} - Instagram: ${c.instagram || 'None'}`
  ).join('\n');

  const prompt = `You are a QUALITY ASSURANCE ANALYST verifying competitor research.

═══════════════════════════════════════════════════════════════
📋 ORIGINAL BUSINESS:
═══════════════════════════════════════════════════════════════
• Company: ${businessContext.companyName}
• Industry: ${businessContext.industry}
• Description: ${businessContext.description || 'Not provided'}
• Location: ${businessContext.location}

═══════════════════════════════════════════════════════════════
📊 COMPETITORS TO VALIDATE:
═══════════════════════════════════════════════════════════════
${competitorList}

═══════════════════════════════════════════════════════════════
🔍 VALIDATION CRITERIA:
═══════════════════════════════════════════════════════════════

For EACH competitor, check:

✅ VALID if ALL of these are true:
1. It's a REAL company that exists (not made up)
2. It's genuinely a competitor to ${businessContext.companyName}
3. It operates in the same or adjacent market
4. The social handles appear correct
5. It makes business sense as a competitor

❌ INVALID if ANY of these are true:
1. Company doesn't seem to exist
2. Not actually a competitor (different industry)
3. Wrong social handles
4. Duplicate of another entry
5. Too generic (like "Local Business")

═══════════════════════════════════════════════════════════════
📋 RETURN FORMAT (JSON only):
═══════════════════════════════════════════════════════════════
{
  "validatedCompetitors": [
    {
      "name": "Competitor Name",
      "valid": true,
      "confidence": 95,
      "validationNote": "Why this is a valid competitor",
      "correctedInstagram": "@correct_handle",
      "correctedTwitter": "@correct_handle",
      "website": "https://...",
      "description": "Updated description if needed",
      "location": "Corrected location",
      "competitorType": "market_leader|direct|indirect|startup|global"
    }
  ],
  "rejectedCompetitors": [
    {
      "name": "Rejected Company",
      "reason": "Why it was rejected"
    }
  ]
}

Be strict! Only approve competitors you're confident are real and relevant.
But also be comprehensive - we need at least 10 validated competitors.`;

  try {
    const response = await callGemini(prompt, { maxTokens: 4000, skipCache: true });
    const result = parseGeminiJSON(response);

    if (result && result.validatedCompetitors && Array.isArray(result.validatedCompetitors)) {
      console.log(`🔍 CHECKER AGENT: Validated ${result.validatedCompetitors.length} competitors`);
      
      if (result.rejectedCompetitors && result.rejectedCompetitors.length > 0) {
        console.log(`❌ CHECKER AGENT: Rejected ${result.rejectedCompetitors.length} competitors:`);
        result.rejectedCompetitors.forEach(r => console.log(`   - ${r.name}: ${r.reason}`));
      }

      // Map validated competitors back to the expected format
      return result.validatedCompetitors
        .filter(c => c.valid !== false && c.confidence >= 70)
        .map(c => ({
          name: c.name,
          website: c.website || '',
          instagram: c.correctedInstagram || c.instagram || '',
          twitter: c.correctedTwitter || c.twitter || '',
          description: c.description || '',
          location: c.location || businessContext.location,
          competitorType: c.competitorType || 'direct',
          validated: true,
          confidence: c.confidence
        }));
    }

    // If validation fails, return original with basic filtering
    console.warn('CHECKER AGENT: Could not parse validation response, using basic filter');
    return competitors.filter(c => c.name && c.name.length > 2);
  } catch (error) {
    console.error('CHECKER AGENT error:', error.message);
    // Return original competitors if checker fails
    return competitors;
  }
}

/**
 * Use Gemini AI to discover real competitors based on business context
 * Enhanced to focus on famous, well-known brands only
 */
async function discoverCompetitorsWithGemini(businessContext) {
  // Curated list of FAMOUS, WELL-KNOWN brands by industry
  const famousBrandsByIndustry = {
    'real estate': {
      india: ['Sobha Limited', 'Prestige Group', 'Brigade Group', 'Godrej Properties', 'DLF', 'Lodha Group', 'Mahindra Lifespaces', 'Puravankara', 'Oberoi Realty', 'Embassy Group', 'Tata Housing', 'Shapoorji Pallonji Real Estate'],
      global: ['CBRE', 'JLL', 'Cushman & Wakefield', 'Colliers', 'Knight Frank']
    },
    'construction': {
      india: ['L&T Construction', 'Shapoorji Pallonji', 'Tata Projects', 'GMR Group', 'NCC Limited', 'Dilip Buildcon', 'JMC Projects', 'Afcons Infrastructure'],
      global: ['Bechtel', 'Skanska', 'AECOM', 'Fluor Corporation']
    },
    'technology': {
      india: ['TCS', 'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra', 'Zoho', 'Freshworks', 'Razorpay', 'PhonePe', 'Paytm', 'Ola', 'Zomato'],
      global: ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Salesforce', 'Adobe', 'IBM', 'Oracle', 'SAP']
    },
    'e-commerce': {
      india: ['Amazon India', 'Flipkart', 'Myntra', 'Nykaa', 'Meesho', 'Snapdeal', 'Ajio', 'Tata CLiQ', 'JioMart', 'BigBasket', 'Blinkit', 'Zepto'],
      global: ['Amazon', 'Alibaba', 'eBay', 'Walmart', 'Shopify stores']
    },
    'food': {
      india: ['Zomato', 'Swiggy', 'Dominos India', 'McDonalds India', 'Starbucks India', 'Haldirams', 'Barbeque Nation', 'Pizza Hut India', 'KFC India', 'Burger King India', 'Subway India', 'Cafe Coffee Day'],
      global: ['McDonalds', 'Starbucks', 'KFC', 'Subway', 'Pizza Hut', 'Dominos', 'Dunkin', 'Chipotle']
    },
    'fashion': {
      india: ['Myntra', 'Ajio', 'FabIndia', 'Westside', 'Pantaloons', 'Raymond', 'Allen Solly', 'Van Heusen', 'Peter England', 'Manyavar', 'W for Woman', 'Biba'],
      global: ['Zara', 'H&M', 'Uniqlo', 'Nike', 'Adidas', 'Puma', 'Levis', 'Gap', 'Forever 21']
    },
    'healthcare': {
      india: ['Apollo Hospitals', 'Fortis Healthcare', 'Max Healthcare', 'Manipal Hospitals', 'Narayana Health', 'AIIMS', 'Medanta', 'Kokilaben Hospital', 'Aster DM Healthcare'],
      global: ['Mayo Clinic', 'Cleveland Clinic', 'Johns Hopkins', 'Kaiser Permanente']
    },
    'education': {
      india: ['BYJU\'S', 'Unacademy', 'Vedantu', 'upGrad', 'Physics Wallah', 'Simplilearn', 'Great Learning', 'Emeritus', 'Extramarks', 'Toppr'],
      global: ['Coursera', 'Udemy', 'LinkedIn Learning', 'Khan Academy', 'edX']
    },
    'automotive': {
      india: ['Maruti Suzuki', 'Hyundai India', 'Tata Motors', 'Mahindra', 'Honda Cars India', 'Toyota Kirloskar', 'Kia India', 'MG Motor India', 'Skoda India', 'Volkswagen India'],
      global: ['Toyota', 'BMW', 'Mercedes-Benz', 'Audi', 'Honda', 'Ford', 'Tesla', 'Volkswagen']
    },
    'finance': {
      india: ['HDFC Bank', 'ICICI Bank', 'SBI', 'Kotak Mahindra', 'Axis Bank', 'Bajaj Finserv', 'Zerodha', 'Groww', 'Paytm Money', 'PhonePe', 'CRED', 'Policybazaar'],
      global: ['JPMorgan', 'Goldman Sachs', 'Visa', 'Mastercard', 'PayPal', 'Stripe']
    },
    'hospitality': {
      india: ['Taj Hotels', 'Oberoi Hotels', 'ITC Hotels', 'The Leela', 'Lemon Tree Hotels', 'OYO Rooms', 'Radisson India', 'Hyatt India', 'Marriott India'],
      global: ['Marriott', 'Hilton', 'Hyatt', 'InterContinental', 'Four Seasons', 'Ritz-Carlton']
    },
    'fitness': {
      india: ['Cult.fit', 'Gold\'s Gym India', 'Anytime Fitness India', 'HealthifyMe', 'Fittr', 'Decathlon India', 'Nike India', 'Puma India'],
      global: ['Nike', 'Adidas', 'Under Armour', 'Peloton', 'Planet Fitness', 'Equinox']
    },
    'beauty': {
      india: ['Lakme', 'VLCC', 'Nykaa', 'Sugar Cosmetics', 'Mamaearth', 'WOW Skin Science', 'Forest Essentials', 'Kama Ayurveda', 'MyGlamm'],
      global: ['L\'Oreal', 'Maybelline', 'MAC', 'Estee Lauder', 'Clinique', 'Sephora', 'Ulta Beauty']
    },
    'interior design': {
      india: ['Livspace', 'HomeLane', 'Design Cafe', 'Urban Ladder', 'Pepperfry', 'IKEA India', 'Godrej Interio', 'Asian Paints Beautiful Homes'],
      global: ['IKEA', 'Wayfair', 'West Elm', 'Pottery Barn', 'Restoration Hardware']
    },
    'marketing': {
      india: ['WATConsult', 'Dentsu India', 'Ogilvy India', 'Leo Burnett India', 'BBDO India', 'Madison World', 'Havas India', 'FCB India', 'McCann India'],
      global: ['Ogilvy', 'WPP', 'Publicis', 'Dentsu', 'Interpublic', 'Omnicom']
    },
    'retail': {
      india: ['Reliance Retail', 'D-Mart', 'Big Bazaar', 'Spencer\'s', 'More Supermarket', 'Vishal Mega Mart', 'V-Mart', 'Trent (Westside)', 'Shoppers Stop'],
      global: ['Walmart', 'Costco', 'Target', 'Carrefour', 'Tesco', 'IKEA']
    },
    'logistics': {
      india: ['Delhivery', 'Blue Dart', 'DTDC', 'Ecom Express', 'Shadowfax', 'XpressBees', 'Gati', 'Safexpress', 'TCI Express'],
      global: ['FedEx', 'UPS', 'DHL', 'Maersk', 'DB Schenker']
    },
    'insurance': {
      india: ['LIC', 'HDFC Life', 'ICICI Prudential', 'SBI Life', 'Max Life', 'Bajaj Allianz', 'Tata AIA', 'Policybazaar', 'Digit Insurance', 'Acko'],
      global: ['Allianz', 'AXA', 'MetLife', 'Prudential', 'AIG']
    },
    'pharma': {
      india: ['Sun Pharma', 'Cipla', 'Dr. Reddy\'s', 'Lupin', 'Aurobindo Pharma', 'Biocon', 'Cadila Healthcare', 'Divis Labs', 'Torrent Pharma'],
      global: ['Pfizer', 'Johnson & Johnson', 'Novartis', 'Roche', 'Merck', 'GSK', 'AstraZeneca']
    },
    'media': {
      india: ['Times of India', 'Hindustan Times', 'NDTV', 'Zee Media', 'India Today', 'Republic TV', 'ABP News', 'Aaj Tak', 'The Hindu'],
      global: ['BBC', 'CNN', 'Reuters', 'Bloomberg', 'New York Times', 'Washington Post']
    },
    'telecom': {
      india: ['Jio', 'Airtel', 'Vi (Vodafone Idea)', 'BSNL', 'Tata Communications'],
      global: ['AT&T', 'Verizon', 'T-Mobile', 'Vodafone', 'China Mobile']
    }
  };

  // Find the matching industry
  const industryKey = Object.keys(famousBrandsByIndustry).find(key => 
    businessContext.industry.toLowerCase().includes(key)
  );

  const industryBrands = industryKey ? famousBrandsByIndustry[industryKey] : null;
  const brandExamples = industryBrands 
    ? `Indian brands: ${industryBrands.india.slice(0, 8).join(', ')}\nGlobal brands: ${industryBrands.global.slice(0, 5).join(', ')}`
    : 'Major national and international brands in the industry';

  const prompt = `You are a senior market research analyst at a top consulting firm (like McKinsey, BCG, or Bain). 
Your expertise is identifying the most FAMOUS, WELL-ESTABLISHED competitors for businesses.

⚠️ CRITICAL LOCATION CONTEXT: The business is located in ${businessContext.location}
You MUST prioritize competitors that operate in or serve customers in ${businessContext.location}!

🎯 RESEARCH TASK:
First, mentally research "${businessContext.companyName}" - understand what they do based on:
- Company Name: ${businessContext.companyName}
- Industry: ${businessContext.industry}
- Description: ${businessContext.description || 'Not provided'}
- Target Customer: ${businessContext.targetCustomer || 'General market'}
- Business Location: ${businessContext.location}

📊 COMPETITOR REQUIREMENTS:
Find 10-12 FAMOUS, WELL-KNOWN competitors that operate in ${businessContext.location}. These must be:

✅ MUST INCLUDE:
1. **Household name brands in ${businessContext.location}** - Companies that people in ${businessContext.location} would recognize
2. **Publicly traded companies** or **well-funded startups** (Series B+) with presence in ${businessContext.location}
3. **Companies with verified social media** (blue tick preferred)
4. **Companies with Wikipedia pages** or major press coverage
5. **Market leaders** in the ${businessContext.industry} space in ${businessContext.location}

❌ MUST EXCLUDE:
- Companies that DON'T operate in ${businessContext.location}
- Unknown local businesses without brand recognition
- Companies with non-English names or content (unless local to ${businessContext.location})
- Religious or political organizations
- Companies without professional social media presence
- Businesses that appear spammy or unprofessional
- Any company you're not 100% confident exists

🏆 FAMOUS BRANDS IN ${businessContext.industry.toUpperCase()} (use these as reference):
${brandExamples}

📋 COMPETITOR MIX (must include all categories, ALL from ${businessContext.location} market):
1. **Market Leaders (3-4)**: Top companies everyone in ${businessContext.location} knows
2. **Direct Competitors (3-4)**: Similar-sized companies in same space in ${businessContext.location}
3. **Aspirational Brands (2-3)**: Premium/global brands with strong ${businessContext.location} presence
4. **Emerging Players (2-3)**: Well-funded startups disrupting the space in ${businessContext.location}

Return ONLY this JSON (no other text):
{
  "competitors": [
    {
      "name": "Famous Brand Name",
      "instagram": "@verified_handle",
      "twitter": "@verified_handle", 
      "website": "https://official-website.com",
      "description": "Brief description of what they do",
      "location": "${businessContext.location}",
      "estimatedFollowers": 100000,
      "competitorType": "market_leader|direct|aspirational|emerging",
      "famousFor": "What they're known for in ${businessContext.location}"
    }
  ]
}

⚠️ QUALITY CHECK: Only include competitors that operate in ${businessContext.location}. 
At least 80% must be ${businessContext.location}-based or have major presence there.
If in doubt, use the reference brands I provided above. Never return less than 10 competitors.`;

  try {
    const response = await callGemini(prompt, { maxTokens: 3000, skipCache: true });
    const result = parseGeminiJSON(response);

    if (result && result.competitors && Array.isArray(result.competitors)) {
      // Filter out any suspicious competitors
      const validCompetitors = result.competitors.filter(comp => {
        // Must have a name
        if (!comp.name || comp.name.length < 2) return false;
        
        // Filter out non-English names (basic check)
        const hasNonLatinChars = /[^\x00-\x7F]/.test(comp.name);
        if (hasNonLatinChars) {
          console.log(`⚠️ Filtered out non-English competitor: ${comp.name}`);
          return false;
        }
        
        // Filter out suspicious patterns
        const suspiciousPatterns = ['islamic', 'halal', 'mosque', 'church', 'temple', 'religious', 'political', 'party'];
        const nameLower = comp.name.toLowerCase();
        if (suspiciousPatterns.some(pattern => nameLower.includes(pattern))) {
          console.log(`⚠️ Filtered out suspicious competitor: ${comp.name}`);
          return false;
        }
        
        return true;
      });

      console.log(`🎯 Gemini found ${result.competitors.length} competitors, ${validCompetitors.length} passed validation`);
      return validCompetitors;
    }

    console.error('Invalid Gemini response format for competitors');
    return [];
  } catch (error) {
    console.error('Gemini competitor discovery error:', error.message);
    return [];
  }
}

/**
 * Check if text is primarily English (Latin characters)
 */
function isEnglishContent(text) {
  if (!text || text.length < 10) return true; // Short or empty text passes
  
  // Count Latin vs non-Latin characters
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const nonLatinChars = (text.match(/[^\x00-\x7F]/g) || []).length;
  
  // If more than 30% is non-Latin, consider it non-English
  const totalChars = latinChars + nonLatinChars;
  if (totalChars === 0) return true;
  
  const nonLatinRatio = nonLatinChars / totalChars;
  return nonLatinRatio < 0.3;
}

/**
 * Fetch posts for a list of competitors
 * Only keeps English-language posts from verified brands
 * CRITICAL: Only posts from the last 3 months are allowed - NO older posts
 */
async function fetchPostsForCompetitors(competitors) {
  const allPosts = [];
  
  // STRICT 3-MONTH THRESHOLD - Posts older than this are NEVER shown
  const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  console.log(`📅 3-month threshold: ${new Date(threeMonthsAgo).toLocaleDateString()} - Only posts after this date will be shown`);

  for (const competitor of competitors.slice(0, 5)) { // Limit to 5
    const instagramHandle = competitor.socialHandles?.instagram?.replace('@', '');
    
    if (instagramHandle) {
      try {
        console.log(`📸 Fetching REAL Instagram posts for ${competitor.name} (@${instagramHandle})...`);
        const result = await scrapeInstagramProfile(instagramHandle);
        
        if (result && result.recentPosts && result.recentPosts.length > 0) {
          // Filter to only English posts
          const englishPosts = result.recentPosts.filter(post => 
            isEnglishContent(post.caption || post.text || '')
          );
          
          // Map posts with timestamps
          const mappedPosts = englishPosts.map(post => {
            const timestamp = new Date(post.timestamp || post.takenAtTimestamp * 1000 || post.date || Date.now()).getTime();
            return {
              competitorId: competitor._id,
              competitorName: competitor.name,
              platform: 'instagram',
              content: post.caption || post.text || '',
              likes: post.likes || post.likesCount || 0,
              comments: post.comments || post.commentsCount || 0,
              imageUrl: post.imageUrl || post.displayUrl || post.thumbnailUrl || null,
              postUrl: post.url || post.postUrl || `https://instagram.com/p/${post.shortCode || post.id || ''}`,
              postedAt: post.timestamp || post.takenAtTimestamp || post.date || new Date(),
              postedAtTimestamp: timestamp,
              sentiment: analyzeSentiment(post.caption || ''),
              isRealData: true
            };
          });
          
          // STRICT 3-MONTH FILTER: Remove any posts older than 3 months
          const recentPosts = mappedPosts.filter(post => {
            if (post.postedAtTimestamp < threeMonthsAgo) {
              console.log(`⚠️ Filtering out old post from ${competitor.name} - posted ${new Date(post.postedAtTimestamp).toLocaleDateString()}`);
              return false;
            }
            return true;
          });
          
          const posts = recentPosts.slice(0, 5);
          console.log(`📅 Kept ${posts.length}/${mappedPosts.length} posts after 3-month filter for ${competitor.name}`);
          
          // Save posts to competitor
          competitor.posts = posts;
          await competitor.save();
          
          allPosts.push(...posts);
          console.log(`✅ Got ${posts.length} REAL recent English posts for ${competitor.name}`);
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
      console.log(`📸 Fetching REAL data for ${competitor.name} (@${handle}) on ${platform}...`);
      
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
            imageUrl: post.imageUrl || post.displayUrl || post.thumbnailUrl || null,
            postUrl: post.url || post.postUrl || `https://instagram.com/p/${post.shortCode || post.id || ''}`,
            postedAt: post.timestamp || post.takenAtTimestamp || post.date || new Date(),
            postedAtTimestamp: new Date(post.timestamp || post.takenAtTimestamp * 1000 || post.date || Date.now()).getTime(),
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
 * Scrape real-time data for all active competitors using Apify
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
          console.log(`📸 Fetching REAL data for ${competitor.name} (@${handle})...`);
          const realData = await scrapeInstagramProfile(handle);
          
          if (realData && !realData.error && realData.recentPosts) {
            // Update competitor with real posts
            competitor.posts = realData.recentPosts.slice(0, 5).map(post => ({
              platform: 'instagram',
              content: post.caption || post.text || '',
              likes: post.likes || post.likesCount || 0,
              comments: post.comments || post.commentsCount || 0,
              imageUrl: post.imageUrl || post.displayUrl || null,
              postUrl: post.url || post.postUrl || `https://instagram.com/p/${post.shortCode || ''}`,
              postedAt: post.timestamp || post.takenAtTimestamp || new Date(),
              postedAtTimestamp: new Date(post.timestamp || post.takenAtTimestamp * 1000 || Date.now()).getTime(),
              isRealData: true
            }));
            
            await competitor.save();
            
            results.push({
              competitorId: competitor._id,
              name: competitor.name,
              success: true,
              postsCount: competitor.posts.length
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
 * CURATED LIST OF FAMOUS, VERIFIED BRANDS ONLY
 */
function getFallbackCompetitors(industry, location) {
  const industryFallbacks = {
    'real estate': [
      { name: 'Sobha Limited', instagram: '@sobhadevelopers', twitter: '@SobhaLtd', website: 'https://www.sobha.com', description: 'Premium real estate developer known for luxury apartments and villas', estimatedFollowers: 85000, competitorType: 'direct' },
      { name: 'Prestige Group', instagram: '@prestigegroup', twitter: '@PrestigeGroup', website: 'https://www.prestigeconstructions.com', description: 'Leading real estate developer in South India', estimatedFollowers: 120000, competitorType: 'direct' },
      { name: 'Brigade Group', instagram: '@brigadegroup', twitter: '@BrigadeGroup', website: 'https://www.brigadegroup.com', description: 'Major property developer with commercial and residential projects', estimatedFollowers: 95000, competitorType: 'direct' },
      { name: 'Godrej Properties', instagram: '@godrejproperties', twitter: '@GodrejProp', website: 'https://www.godrejproperties.com', description: 'Part of Godrej Group, premium residential developer', estimatedFollowers: 150000, competitorType: 'aspirational' },
      { name: 'DLF Limited', instagram: '@dlflimited', twitter: '@DLF_India', website: 'https://www.dlf.in', description: "India's largest real estate developer", estimatedFollowers: 180000, competitorType: 'aspirational' },
      { name: 'Lodha Group', instagram: '@lodhagroup', twitter: '@LodhaGroup', website: 'https://www.lodhagroup.com', description: 'Premium luxury real estate developer', estimatedFollowers: 130000, competitorType: 'direct' },
      { name: 'Mahindra Lifespaces', instagram: '@mahindralifespaces', twitter: '@MahindraLSpc', website: 'https://www.mahindralifespaces.com', description: 'Sustainable urban development company', estimatedFollowers: 75000, competitorType: 'direct' },
      { name: 'Puravankara', instagram: '@puravankara', twitter: '@puravankara', website: 'https://www.puravankara.com', description: 'South India focused real estate developer', estimatedFollowers: 60000, competitorType: 'direct' },
      { name: 'Oberoi Realty', instagram: '@oberoirealty', twitter: '@OberoiRealty', website: 'https://www.oberoirealty.com', description: 'Luxury real estate developer in Mumbai', estimatedFollowers: 50000, competitorType: 'aspirational' },
      { name: 'Embassy Group', instagram: '@embassygroup', twitter: '@EmbassyGroup', website: 'https://www.embassygroup.in', description: 'Commercial and residential real estate developer', estimatedFollowers: 45000, competitorType: 'direct' }
    ],
    'technology': [
      { name: 'TCS', instagram: '@taborata_consultancy_services', twitter: '@TCS', website: 'https://www.tcs.com', description: 'Largest IT services company in India', estimatedFollowers: 500000, competitorType: 'aspirational' },
      { name: 'Infosys', instagram: '@infosys', twitter: '@Infosys', website: 'https://www.infosys.com', description: 'Global IT consulting and services', estimatedFollowers: 450000, competitorType: 'aspirational' },
      { name: 'Wipro', instagram: '@wipro', twitter: '@Wipro', website: 'https://www.wipro.com', description: 'IT services and consulting company', estimatedFollowers: 350000, competitorType: 'aspirational' },
      { name: 'HCL Technologies', instagram: '@hcltech', twitter: '@hcltech', website: 'https://www.hcltech.com', description: 'Global technology company', estimatedFollowers: 280000, competitorType: 'direct' },
      { name: 'Tech Mahindra', instagram: '@techmahindra', twitter: '@Tech_Mahindra', website: 'https://www.techmahindra.com', description: 'IT services and BPO company', estimatedFollowers: 250000, competitorType: 'direct' },
      { name: 'Zoho', instagram: '@zoho', twitter: '@Zoho', website: 'https://www.zoho.com', description: 'Cloud software and SaaS company', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Freshworks', instagram: '@freshworks', twitter: '@FreshworksInc', website: 'https://www.freshworks.com', description: 'SaaS company for customer engagement', estimatedFollowers: 80000, competitorType: 'direct' },
      { name: 'Razorpay', instagram: '@razorpay', twitter: '@Razorpay', website: 'https://razorpay.com', description: 'Fintech payments company', estimatedFollowers: 150000, competitorType: 'indirect' },
      { name: 'PhonePe', instagram: '@phonepe', twitter: '@PhonePe', website: 'https://www.phonepe.com', description: 'Digital payments platform', estimatedFollowers: 300000, competitorType: 'indirect' },
      { name: 'Paytm', instagram: '@paytm', twitter: '@Paytm', website: 'https://www.paytm.com', description: 'Digital payments and fintech', estimatedFollowers: 400000, competitorType: 'indirect' }
    ],
    'fashion': [
      { name: 'Myntra', instagram: '@myntra', twitter: '@myntra', website: 'https://www.myntra.com', description: 'Leading fashion e-commerce platform', estimatedFollowers: 2500000, competitorType: 'aspirational' },
      { name: 'Ajio', instagram: '@ajiolife', twitter: '@AjioLife', website: 'https://www.ajio.com', description: 'Fashion and lifestyle e-commerce', estimatedFollowers: 800000, competitorType: 'direct' },
      { name: 'FabIndia', instagram: '@fabindiaofficial', twitter: '@FabIndia', website: 'https://www.fabindia.com', description: 'Ethnic and sustainable fashion brand', estimatedFollowers: 650000, competitorType: 'direct' },
      { name: 'Westside', instagram: '@westsidestores', twitter: '@WestsideStores', website: 'https://www.westside.com', description: 'Tata-owned fashion retail chain', estimatedFollowers: 400000, competitorType: 'direct' },
      { name: 'Pantaloons', instagram: '@pantaloonsindia', twitter: '@pantaloons', website: 'https://www.pantaloons.com', description: 'Value fashion retail brand', estimatedFollowers: 550000, competitorType: 'direct' },
      { name: 'Zara India', instagram: '@zaraofficial', twitter: '@ZARA', website: 'https://www.zara.com/in', description: 'International fast fashion brand', estimatedFollowers: 1500000, competitorType: 'aspirational' },
      { name: 'H&M India', instagram: '@hmindia', twitter: '@hmindia', website: 'https://www.hm.com/in', description: 'Global fashion retailer in India', estimatedFollowers: 1200000, competitorType: 'aspirational' },
      { name: 'Bewakoof', instagram: '@bewakoof', twitter: '@bewakoof', website: 'https://www.bewakoof.com', description: 'Youth-focused D2C fashion brand', estimatedFollowers: 2000000, competitorType: 'direct' },
      { name: 'Manyavar', instagram: '@manyavar', twitter: '@Manyavar', website: 'https://www.manyavar.com', description: 'Ethnic menswear brand', estimatedFollowers: 500000, competitorType: 'direct' },
      { name: 'Allen Solly', instagram: '@allensolly', twitter: '@AllenSolly', website: 'https://www.allensolly.com', description: 'Premium casual wear brand', estimatedFollowers: 300000, competitorType: 'direct' }
    ],
    'food': [
      { name: 'Zomato', instagram: '@zomato', twitter: '@zomato', website: 'https://www.zomato.com', description: 'Food delivery and restaurant discovery platform', estimatedFollowers: 3500000, competitorType: 'aspirational' },
      { name: 'Swiggy', instagram: '@swiggyindia', twitter: '@SwiggyIndia', website: 'https://www.swiggy.com', description: 'Food delivery platform', estimatedFollowers: 2800000, competitorType: 'aspirational' },
      { name: "Domino's India", instagram: '@dominos_india', twitter: '@dominos_india', website: 'https://www.dominos.co.in', description: 'Pizza delivery chain', estimatedFollowers: 500000, competitorType: 'direct' },
      { name: "McDonald's India", instagram: '@mcdonaldsindia', twitter: '@McDonaldsIndia', website: 'https://www.mcdonaldsindia.com', description: 'Fast food restaurant chain', estimatedFollowers: 800000, competitorType: 'direct' },
      { name: 'Haldirams', instagram: '@haldirams_nagpur', twitter: '@Haldirams_India', website: 'https://www.haldirams.com', description: 'Indian snacks and sweets brand', estimatedFollowers: 450000, competitorType: 'direct' },
      { name: 'Barbeque Nation', instagram: '@barbequenation', twitter: '@BBQNation', website: 'https://www.barbequenation.com', description: 'Casual dining restaurant chain', estimatedFollowers: 350000, competitorType: 'direct' },
      { name: 'Starbucks India', instagram: '@starbucksindia', twitter: '@StarbucksIndia', website: 'https://www.starbucks.in', description: 'Premium coffee chain', estimatedFollowers: 600000, competitorType: 'aspirational' },
      { name: 'KFC India', instagram: '@kfc_india', twitter: '@KFCIndia', website: 'https://www.kfc.co.in', description: 'Fried chicken fast food chain', estimatedFollowers: 400000, competitorType: 'direct' },
      { name: 'Pizza Hut India', instagram: '@pizzahutindia', twitter: '@PizzaHutIndia', website: 'https://www.pizzahut.co.in', description: 'Pizza restaurant chain', estimatedFollowers: 300000, competitorType: 'direct' },
      { name: 'Burger King India', instagram: '@burgerkingindia', twitter: '@BurgerKingIndia', website: 'https://www.burgerking.in', description: 'Fast food burger chain', estimatedFollowers: 350000, competitorType: 'direct' }
    ],
    'fitness': [
      { name: 'Cult.fit', instagram: '@cultfitofficial', twitter: '@CultFit', website: 'https://www.cult.fit', description: 'Health and fitness platform', estimatedFollowers: 750000, competitorType: 'aspirational' },
      { name: "Gold's Gym India", instagram: '@goldsgymindaboria', twitter: '@GoldsGymIndia', website: 'https://www.goldsgym.in', description: 'Premium gym chain', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Anytime Fitness India', instagram: '@anytimefitness_india', twitter: '@AFIndia', website: 'https://www.anytimefitness.co.in', description: '24-hour gym chain', estimatedFollowers: 120000, competitorType: 'direct' },
      { name: 'HealthifyMe', instagram: '@healthifymeofficial', twitter: '@HealthifyMe', website: 'https://www.healthifyme.com', description: 'Calorie tracking and nutrition app', estimatedFollowers: 450000, competitorType: 'indirect' },
      { name: 'Fittr', instagram: '@fittrwithsquats', twitter: '@fittr', website: 'https://www.fittr.com', description: 'Online fitness coaching platform', estimatedFollowers: 600000, competitorType: 'direct' },
      { name: 'Decathlon India', instagram: '@decathlonindia', twitter: '@DecathlonIn', website: 'https://www.decathlon.in', description: 'Sports equipment retailer', estimatedFollowers: 900000, competitorType: 'indirect' },
      { name: 'Nike India', instagram: '@nikeindia', twitter: '@Nike', website: 'https://www.nike.com/in', description: 'Global sportswear brand', estimatedFollowers: 1500000, competitorType: 'aspirational' },
      { name: 'Puma India', instagram: '@pumaindia', twitter: '@PUMAIndia', website: 'https://in.puma.com', description: 'Sports and lifestyle brand', estimatedFollowers: 800000, competitorType: 'aspirational' },
      { name: 'Adidas India', instagram: '@adidasindia', twitter: '@adidasindia', website: 'https://www.adidas.co.in', description: 'Global sportswear brand', estimatedFollowers: 700000, competitorType: 'aspirational' },
      { name: 'Under Armour India', instagram: '@underarmourin', twitter: '@UnderArmour', website: 'https://www.underarmour.in', description: 'Performance sportswear brand', estimatedFollowers: 200000, competitorType: 'direct' }
    ],
    'healthcare': [
      { name: 'Apollo Hospitals', instagram: '@apollohospitals', twitter: '@HospitalsApollo', website: 'https://www.apollohospitals.com', description: 'Largest hospital chain in India', estimatedFollowers: 500000, competitorType: 'aspirational' },
      { name: 'Fortis Healthcare', instagram: '@fortis_healthcare', twitter: '@fortishealthcare', website: 'https://www.fortishealthcare.com', description: 'Multi-specialty hospital chain', estimatedFollowers: 250000, competitorType: 'direct' },
      { name: 'Max Healthcare', instagram: '@maxhealthcare', twitter: '@MaxHealthcare', website: 'https://www.maxhealthcare.in', description: 'Premium hospital chain', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Manipal Hospitals', instagram: '@manipalhospitals', twitter: '@ManipalHealth', website: 'https://www.manipalhospitals.com', description: 'Multi-specialty hospital network', estimatedFollowers: 150000, competitorType: 'direct' },
      { name: 'Narayana Health', instagram: '@narayanahealth', twitter: '@NarayanaHealth', website: 'https://www.narayanahealth.org', description: 'Affordable healthcare provider', estimatedFollowers: 100000, competitorType: 'direct' },
      { name: 'Medanta', instagram: '@medanta', twitter: '@Medanta', website: 'https://www.medanta.org', description: 'Multi super-specialty hospital', estimatedFollowers: 120000, competitorType: 'direct' },
      { name: 'Practo', instagram: '@practo', twitter: '@Practo', website: 'https://www.practo.com', description: 'Healthcare technology platform', estimatedFollowers: 300000, competitorType: 'indirect' },
      { name: '1mg', instagram: '@1mgofficial', twitter: '@1mgOfficial', website: 'https://www.1mg.com', description: 'Online pharmacy and healthcare', estimatedFollowers: 200000, competitorType: 'indirect' },
      { name: 'PharmEasy', instagram: '@pharmeasyofficial', twitter: '@PharmEasy', website: 'https://www.pharmeasy.in', description: 'Online pharmacy platform', estimatedFollowers: 250000, competitorType: 'indirect' },
      { name: 'Netmeds', instagram: '@netmeds', twitter: '@netmeds', website: 'https://www.netmeds.com', description: 'Online pharmacy', estimatedFollowers: 150000, competitorType: 'indirect' }
    ],
    'education': [
      { name: "BYJU'S", instagram: '@byjuslearning', twitter: '@byjus', website: 'https://byjus.com', description: 'EdTech unicorn for K-12 learning', estimatedFollowers: 2000000, competitorType: 'aspirational' },
      { name: 'Unacademy', instagram: '@unacademy', twitter: '@Unacademy', website: 'https://unacademy.com', description: 'Online learning platform for competitive exams', estimatedFollowers: 1500000, competitorType: 'direct' },
      { name: 'Vedantu', instagram: '@vedantu', twitter: '@vedantu', website: 'https://www.vedantu.com', description: 'Live online tutoring platform', estimatedFollowers: 800000, competitorType: 'direct' },
      { name: 'upGrad', instagram: '@upgradedu', twitter: '@upGrad', website: 'https://www.upgrad.com', description: 'Online higher education platform', estimatedFollowers: 400000, competitorType: 'direct' },
      { name: 'Physics Wallah', instagram: '@physicswallah', twitter: '@PW_physicswala', website: 'https://www.pw.live', description: 'Affordable exam preparation platform', estimatedFollowers: 3000000, competitorType: 'direct' },
      { name: 'Simplilearn', instagram: '@simplilearn', twitter: '@simplilearn', website: 'https://www.simplilearn.com', description: 'Professional certification courses', estimatedFollowers: 300000, competitorType: 'direct' },
      { name: 'Great Learning', instagram: '@greatlearning', twitter: '@greatlearning', website: 'https://www.greatlearning.in', description: 'Professional and higher education', estimatedFollowers: 250000, competitorType: 'direct' },
      { name: 'Coursera', instagram: '@coursera', twitter: '@coursera', website: 'https://www.coursera.org', description: 'Global online learning platform', estimatedFollowers: 1500000, competitorType: 'aspirational' },
      { name: 'Udemy', instagram: '@udemy', twitter: '@udemy', website: 'https://www.udemy.com', description: 'Online course marketplace', estimatedFollowers: 1200000, competitorType: 'aspirational' },
      { name: 'Khan Academy', instagram: '@khanacademy', twitter: '@khanacademy', website: 'https://www.khanacademy.org', description: 'Free online education', estimatedFollowers: 800000, competitorType: 'aspirational' }
    ],
    'finance': [
      { name: 'HDFC Bank', instagram: '@hdfcbank', twitter: '@HDFCBank', website: 'https://www.hdfcbank.com', description: 'Largest private sector bank in India', estimatedFollowers: 800000, competitorType: 'aspirational' },
      { name: 'ICICI Bank', instagram: '@icicibank', twitter: '@ICICIBank', website: 'https://www.icicibank.com', description: 'Major private sector bank', estimatedFollowers: 600000, competitorType: 'aspirational' },
      { name: 'Kotak Mahindra Bank', instagram: '@kotak_mahindra_bank', twitter: '@KotakBankLtd', website: 'https://www.kotak.com', description: 'Private sector bank', estimatedFollowers: 400000, competitorType: 'direct' },
      { name: 'Axis Bank', instagram: '@axisbank', twitter: '@AxisBank', website: 'https://www.axisbank.com', description: 'Private sector bank', estimatedFollowers: 350000, competitorType: 'direct' },
      { name: 'Bajaj Finserv', instagram: '@bajajfinserv', twitter: '@BajajFinserv', website: 'https://www.bajajfinserv.in', description: 'Financial services company', estimatedFollowers: 300000, competitorType: 'direct' },
      { name: 'Zerodha', instagram: '@zerodha', twitter: '@zerodha', website: 'https://zerodha.com', description: 'Discount stock broker', estimatedFollowers: 500000, competitorType: 'direct' },
      { name: 'Groww', instagram: '@groww', twitter: '@GrowwApp', website: 'https://groww.in', description: 'Investment platform', estimatedFollowers: 600000, competitorType: 'direct' },
      { name: 'CRED', instagram: '@cred_club', twitter: '@CRED_club', website: 'https://cred.club', description: 'Credit card bill payment app', estimatedFollowers: 400000, competitorType: 'indirect' },
      { name: 'Policybazaar', instagram: '@policybazaar', twitter: '@PolicybazaarIn', website: 'https://www.policybazaar.com', description: 'Insurance comparison platform', estimatedFollowers: 250000, competitorType: 'indirect' },
      { name: 'Paytm Money', instagram: '@paytmmoney', twitter: '@PaytmMoney', website: 'https://www.paytmmoney.com', description: 'Investment and trading platform', estimatedFollowers: 200000, competitorType: 'direct' }
    ],
    // SaaS and Social Media Management Tools
    'saas': [
      { name: 'Hootsuite', instagram: '@hootsuite', twitter: '@hootsuite', website: 'https://www.hootsuite.com', description: 'Social media management platform', estimatedFollowers: 400000, competitorType: 'market_leader' },
      { name: 'Buffer', instagram: '@buffer', twitter: '@buffer', website: 'https://buffer.com', description: 'Social media scheduling and analytics', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Sprout Social', instagram: '@spraboroutsocial', twitter: '@SproutSocial', website: 'https://sproutsocial.com', description: 'Social media management suite', estimatedFollowers: 150000, competitorType: 'direct' },
      { name: 'Later', instagram: '@latermedia', twitter: '@latermedia', website: 'https://later.com', description: 'Visual social media planner', estimatedFollowers: 300000, competitorType: 'direct' },
      { name: 'Sprinklr', instagram: '@sprinklr', twitter: '@Sprinklr', website: 'https://www.sprinklr.com', description: 'Enterprise social media management', estimatedFollowers: 80000, competitorType: 'market_leader' },
      { name: 'HubSpot', instagram: '@hubspot', twitter: '@HubSpot', website: 'https://www.hubspot.com', description: 'Marketing and CRM platform', estimatedFollowers: 500000, competitorType: 'market_leader' },
      { name: 'Zoho Social', instagram: '@zoho', twitter: '@Zoho', website: 'https://www.zoho.com/social', description: 'Social media management tool', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Agorapulse', instagram: '@agorapulse', twitter: '@Agorapulse', website: 'https://www.agorapulse.com', description: 'Social media management tool', estimatedFollowers: 50000, competitorType: 'direct' },
      { name: 'Sendible', instagram: '@sendible', twitter: '@Sendible', website: 'https://www.sendible.com', description: 'Social media management for agencies', estimatedFollowers: 30000, competitorType: 'direct' },
      { name: 'Loomly', instagram: '@loomly', twitter: '@laboroomly', website: 'https://www.loomly.com', description: 'Brand success platform', estimatedFollowers: 20000, competitorType: 'direct' },
      { name: 'CoSchedule', instagram: '@coschedule', twitter: '@CoSchedule', website: 'https://coschedule.com', description: 'Marketing calendar and scheduling', estimatedFollowers: 40000, competitorType: 'direct' },
      { name: 'SocialBee', instagram: '@socialbee', twitter: '@SocialBeeHQ', website: 'https://socialbee.com', description: 'Social media management tool', estimatedFollowers: 25000, competitorType: 'direct' }
    ],
    'social media': [
      { name: 'Hootsuite', instagram: '@hootsuite', twitter: '@hootsuite', website: 'https://www.hootsuite.com', description: 'Social media management platform', estimatedFollowers: 400000, competitorType: 'market_leader' },
      { name: 'Buffer', instagram: '@buffer', twitter: '@buffer', website: 'https://buffer.com', description: 'Social media scheduling and analytics', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Sprout Social', instagram: '@sproutsocial', twitter: '@SproutSocial', website: 'https://sproutsocial.com', description: 'Social media management suite', estimatedFollowers: 150000, competitorType: 'direct' },
      { name: 'Later', instagram: '@latermedia', twitter: '@latermedia', website: 'https://later.com', description: 'Visual social media planner', estimatedFollowers: 300000, competitorType: 'direct' },
      { name: 'Sprinklr', instagram: '@sprinklr', twitter: '@Sprinklr', website: 'https://www.sprinklr.com', description: 'Enterprise social media management', estimatedFollowers: 80000, competitorType: 'market_leader' },
      { name: 'HubSpot', instagram: '@hubspot', twitter: '@HubSpot', website: 'https://www.hubspot.com', description: 'Marketing and CRM platform', estimatedFollowers: 500000, competitorType: 'market_leader' },
      { name: 'Zoho Social', instagram: '@zoho', twitter: '@Zoho', website: 'https://www.zoho.com/social', description: 'Social media management tool', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Canva', instagram: '@canva', twitter: '@canva', website: 'https://www.canva.com', description: 'Design and content creation platform', estimatedFollowers: 2000000, competitorType: 'indirect' },
      { name: 'Adobe Express', instagram: '@adobe', twitter: '@Adobe', website: 'https://www.adobe.com/express', description: 'Quick content creation tool', estimatedFollowers: 1500000, competitorType: 'indirect' },
      { name: 'Notion', instagram: '@notionhq', twitter: '@NotionHQ', website: 'https://www.notion.so', description: 'Workspace and collaboration tool', estimatedFollowers: 500000, competitorType: 'indirect' },
      { name: 'Monday.com', instagram: '@mondaydotcom', twitter: '@mondaydotcom', website: 'https://monday.com', description: 'Work management platform', estimatedFollowers: 300000, competitorType: 'indirect' },
      { name: 'Asana', instagram: '@asana', twitter: '@asana', website: 'https://asana.com', description: 'Project management tool', estimatedFollowers: 200000, competitorType: 'indirect' }
    ],
    'marketing': [
      { name: 'HubSpot', instagram: '@hubspot', twitter: '@HubSpot', website: 'https://www.hubspot.com', description: 'Inbound marketing and CRM', estimatedFollowers: 500000, competitorType: 'market_leader' },
      { name: 'Mailchimp', instagram: '@mailchimp', twitter: '@Mailchimp', website: 'https://mailchimp.com', description: 'Email marketing platform', estimatedFollowers: 400000, competitorType: 'market_leader' },
      { name: 'Hootsuite', instagram: '@hootsuite', twitter: '@hootsuite', website: 'https://www.hootsuite.com', description: 'Social media management platform', estimatedFollowers: 400000, competitorType: 'direct' },
      { name: 'Semrush', instagram: '@semrush', twitter: '@semrush', website: 'https://www.semrush.com', description: 'SEO and marketing analytics', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'Ahrefs', instagram: '@aaborhrefs', twitter: '@ahrefs', website: 'https://ahrefs.com', description: 'SEO tools and analytics', estimatedFollowers: 100000, competitorType: 'direct' },
      { name: 'Moz', instagram: '@maboroz', twitter: '@Moz', website: 'https://moz.com', description: 'SEO software and tools', estimatedFollowers: 80000, competitorType: 'direct' },
      { name: 'Canva', instagram: '@canva', twitter: '@canva', website: 'https://www.canva.com', description: 'Design platform for marketers', estimatedFollowers: 2000000, competitorType: 'indirect' },
      { name: 'Salesforce Marketing Cloud', instagram: '@salesforce', twitter: '@salesforce', website: 'https://www.salesforce.com/products/marketing-cloud', description: 'Enterprise marketing automation', estimatedFollowers: 800000, competitorType: 'market_leader' },
      { name: 'ActiveCampaign', instagram: '@activecampaign', twitter: '@ActiveCampaign', website: 'https://www.activecampaign.com', description: 'Marketing automation platform', estimatedFollowers: 100000, competitorType: 'direct' },
      { name: 'Klaviyo', instagram: '@klaviyo', twitter: '@klaviyo', website: 'https://www.klaviyo.com', description: 'Email marketing for e-commerce', estimatedFollowers: 80000, competitorType: 'direct' },
      { name: 'Intercom', instagram: '@intercom', twitter: '@intercom', website: 'https://www.intercom.com', description: 'Customer messaging platform', estimatedFollowers: 100000, competitorType: 'indirect' },
      { name: 'Drift', instagram: '@drift', twitter: '@drift', website: 'https://www.drift.com', description: 'Conversational marketing platform', estimatedFollowers: 50000, competitorType: 'indirect' }
    ],
    'startup': [
      { name: 'Y Combinator Companies', instagram: '@ycombinator', twitter: '@ycombinator', website: 'https://www.ycombinator.com', description: 'Top startup accelerator', estimatedFollowers: 800000, competitorType: 'market_leader' },
      { name: 'Techstars', instagram: '@techstars', twitter: '@techstars', website: 'https://www.techstars.com', description: 'Global startup accelerator', estimatedFollowers: 300000, competitorType: 'direct' },
      { name: '500 Startups', instagram: '@500global', twitter: '@500Global', website: 'https://500.co', description: 'Venture capital and accelerator', estimatedFollowers: 200000, competitorType: 'direct' },
      { name: 'AngelList', instagram: '@angellist', twitter: '@angellist', website: 'https://angel.co', description: 'Startup funding platform', estimatedFollowers: 150000, competitorType: 'indirect' },
      { name: 'Product Hunt', instagram: '@productaborhunt', twitter: '@ProductHunt', website: 'https://www.producthunt.com', description: 'Product discovery platform', estimatedFollowers: 200000, competitorType: 'indirect' },
      { name: 'Crunchbase', instagram: '@crunchbase', twitter: '@crunchbase', website: 'https://www.crunchbase.com', description: 'Startup and funding database', estimatedFollowers: 100000, competitorType: 'indirect' },
      { name: 'TiE', instagram: '@tie_global', twitter: '@TiEGlobal', website: 'https://tie.org', description: 'Global entrepreneur network', estimatedFollowers: 50000, competitorType: 'direct' },
      { name: 'Nasscom', instagram: '@nasscom', twitter: '@nassaborcom', website: 'https://nasscom.in', description: 'Indian IT industry association', estimatedFollowers: 80000, competitorType: 'direct' },
      { name: 'Indian Angel Network', instagram: '@indianangelnetwork', twitter: '@IAN_network', website: 'https://www.indianangelnetwork.com', description: 'Angel investor network', estimatedFollowers: 30000, competitorType: 'direct' },
      { name: 'Sequoia India', instagram: '@sequoiaindiaaborsa', twitter: '@sequoia_india', website: 'https://www.sequoiacap.com', description: 'Venture capital firm', estimatedFollowers: 50000, competitorType: 'indirect' }
    ]
  };

  // Find matching industry - check multiple keywords
  let industryKey = Object.keys(industryFallbacks).find(key => 
    industry.toLowerCase().includes(key)
  );
  
  // Additional keyword matching for SaaS/Social Media tools
  if (!industryKey) {
    const industryLower = industry.toLowerCase();
    if (industryLower.includes('social') || industryLower.includes('management') || industryLower.includes('scheduling')) {
      industryKey = 'social media';
    } else if (industryLower.includes('saas') || industryLower.includes('software') || industryLower.includes('platform')) {
      industryKey = 'saas';
    } else if (industryLower.includes('market') || industryLower.includes('advertis') || industryLower.includes('agency')) {
      industryKey = 'marketing';
    } else if (industryLower.includes('startup') || industryLower.includes('accelerator') || industryLower.includes('incubator')) {
      industryKey = 'startup';
    }
  }

  let fallbacks = industryKey ? industryFallbacks[industryKey] : getGenericCompetitors();
  
  // Clean up handles
  return fallbacks.map(comp => ({
    ...comp,
    instagram: (comp.instagram || '').replace(/abor/g, ''),
    twitter: (comp.twitter || '').replace(/abor/g, ''),
    whyCompetitor: `Leading ${comp.competitorType} player in the ${industry} industry`
  }));
}

/**
 * Get generic competitors as ultimate fallback - Major Indian Conglomerates
 */
function getGenericCompetitors() {
  return [
    { name: 'Reliance Industries', instagram: '@relianceindustries', twitter: '@RIL_Updates', website: 'https://www.ril.com', description: 'Largest conglomerate in India', estimatedFollowers: 500000, competitorType: 'aspirational' },
    { name: 'Tata Group', instagram: '@tatagroup', twitter: '@TataCompanies', website: 'https://www.tata.com', description: 'Diversified business conglomerate', estimatedFollowers: 600000, competitorType: 'aspirational' },
    { name: 'Mahindra Group', instagram: '@mahindrarise', twitter: '@MahindraRise', website: 'https://www.mahindra.com', description: 'Diversified business group', estimatedFollowers: 400000, competitorType: 'aspirational' },
    { name: 'Aditya Birla Group', instagram: '@adityabirlagrp', twitter: '@AdityaBirlaGrp', website: 'https://www.adityabirla.com', description: 'Global conglomerate', estimatedFollowers: 200000, competitorType: 'aspirational' },
    { name: 'Godrej Group', instagram: '@godrejgroup', twitter: '@GodrejGroup', website: 'https://www.godrejgroup.com', description: 'Diversified business group', estimatedFollowers: 180000, competitorType: 'aspirational' },
    { name: 'ITC Limited', instagram: '@itcltd', twitter: '@ITCCorpCom', website: 'https://www.itcportal.com', description: 'FMCG and hospitality conglomerate', estimatedFollowers: 350000, competitorType: 'aspirational' },
    { name: 'Hindustan Unilever', instagram: '@hulindia', twitter: '@HUL_News', website: 'https://www.hul.co.in', description: 'FMCG company', estimatedFollowers: 150000, competitorType: 'aspirational' },
    { name: 'Bajaj Group', instagram: '@bajajgroup', twitter: '@BajajAuto', website: 'https://www.bajajgroup.org', description: 'Diversified business group', estimatedFollowers: 250000, competitorType: 'aspirational' },
    { name: 'Larsen & Toubro', instagram: '@lofficialindia', twitter: '@LnTofficial', website: 'https://www.larsentoubro.com', description: 'Engineering and construction conglomerate', estimatedFollowers: 200000, competitorType: 'aspirational' },
    { name: 'Adani Group', instagram: '@adaboranigroup', twitter: '@AdaniOnline', website: 'https://www.adani.com', description: 'Infrastructure and energy conglomerate', estimatedFollowers: 300000, competitorType: 'aspirational' }
  ].map(comp => ({
    ...comp,
    instagram: (comp.instagram || '').replace(/abor/g, ''),
    twitter: (comp.twitter || '').replace(/abor/g, ''),
    whyCompetitor: 'Major business conglomerate in India'
  }));
}

module.exports = router;
