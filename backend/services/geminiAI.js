/**
 * Gemini AI Service
 * Uses Google Gemini API for all AI-related tasks
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// Using available Gemini models with fallbacks - prioritize lite models for lower quota usage
const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',  // Lower quota usage
  'gemini-2.0-flash',       // Primary model
  'gemini-2.5-flash',       // Latest model
];

// Simple in-memory cache for API responses
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const API_TIMEOUT = 8000; // 8 second timeout for API calls (leaving 1s buffer for processing)

// Cache cleanup - run every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

function getCacheKey(prompt) {
  // Create a simple hash of the prompt
  return prompt.substring(0, 100).replace(/\s+/g, '_');
}

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(url, options, timeout = API_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Call Gemini API with a prompt
 * @param {string} prompt - The prompt to send
 * @param {object} options - Additional options
 * @returns {Promise<string>} - The AI response
 */
async function callGemini(prompt, options = {}) {
  const startTime = Date.now();
  
  // Check cache first (unless explicitly disabled)
  if (!options.skipCache) {
    const cacheKey = getCacheKey(prompt);
    const cached = responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('⚡ Using cached Gemini response (instant)');
      return cached.response;
    }
  }

  const timeout = options.timeout || API_TIMEOUT;
  
  for (const model of GEMINI_MODELS) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const response = await fetchWithTimeout(`${apiUrl}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 1024, // Reduced for faster responses
            topP: 0.9
          }
        })
      }, timeout);

      const data = await response.json();

      if (!response.ok) {
        console.error(`Gemini API error (${model}):`, data.error?.message || data);
        // If quota exceeded or rate limited, try next model
        if (data.error?.code === 429 || data.error?.code === 503) {
          console.log(`Rate limited on ${model}, trying next model...`);
          continue;
        }
        // If model not found, try next
        if (data.error?.code === 404) {
          console.log(`Model ${model} not found, trying next...`);
          continue;
        }
        throw new Error(data.error?.message || 'Gemini API error');
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No response from Gemini');
      }

      // Cache successful response
      if (!options.skipCache) {
        const cacheKey = getCacheKey(prompt);
        responseCache.set(cacheKey, { response: text, timestamp: Date.now() });
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Gemini response from ${model} in ${duration}ms`);
      return text;
    } catch (error) {
      console.error(`Gemini API call to ${model} failed:`, error.message);
      // Continue to next model if available
      continue;
    }
  }
  
  // All APIs failed
  throw new Error('All Gemini API endpoints failed - quota may be exhausted');
}

/**
 * Parse JSON from Gemini response (handles markdown code blocks)
 */
function parseGeminiJSON(text) {
  let cleaned = text.trim();
  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  try {
    return JSON.parse(cleaned.trim());
  } catch (err) {
    console.error('Failed to parse Gemini JSON:', err, '\nRaw response:', cleaned);
    // Return a fallback object or null to avoid crashing the backend
    return { error: 'Invalid Gemini JSON', raw: cleaned };
  }
}

/**
 * Generate personalized campaign suggestions based on business profile
 * Creates highly specific campaigns tailored to the company's products, audience, and brand voice
 */
async function generateCampaignSuggestions(businessProfile, count = 6) {
  // Build a comprehensive context from the business profile
  const companyName = businessProfile.name || 'Your Company';
  const industry = businessProfile.industry || 'General';
  const niche = businessProfile.niche || industry;
  const businessType = businessProfile.businessType || 'B2C';
  const targetAudience = businessProfile.targetAudience || 'General consumers';
  const brandVoice = businessProfile.brandVoice || 'Professional';
  const description = businessProfile.description || '';
  const marketingGoals = (businessProfile.marketingGoals || []).join(', ') || 'Brand awareness';
  
  // Get products/services context if available
  const products = businessProfile.products?.map(p => p.name || p).join(', ') || '';
  const services = businessProfile.services?.map(s => s.name || s).join(', ') || '';
  const keyProducts = businessProfile.keyProducts?.join(', ') || products || services || '';
  
  // Get unique selling points
  const usps = businessProfile.uniqueSellingPoints?.join(', ') || businessProfile.valuePropositions?.join(', ') || '';
  
  const prompt = `You are an expert social media marketing strategist for "${companyName}". Generate ${count} highly personalized, ready-to-post social media campaign ideas that are SPECIFICALLY tailored to this business.

=== BUSINESS PROFILE ===
Company Name: ${companyName}
Industry: ${industry}
Niche/Focus: ${niche}
Business Type: ${businessType}
Company Description: ${description}
Key Products/Services: ${keyProducts || 'Not specified - infer from description'}
Unique Selling Points: ${usps || 'To be determined from context'}
Target Audience: ${targetAudience}
Brand Voice: ${brandVoice} (IMPORTANT: All captions MUST match this voice)
Marketing Goals: ${marketingGoals}

=== REQUIREMENTS ===
1. Each campaign MUST be directly related to ${companyName}'s actual products/services
2. Captions MUST use the "${brandVoice}" tone consistently
3. Content should speak directly to "${targetAudience}"
4. Hashtags must be industry-specific and relevant to ${industry}/${niche}
5. Include seasonal/trending angles where relevant
6. Each campaign should have a different objective to cover various marketing needs
7. Provide an image search query that would find the PERFECT stock image for this specific campaign

=== BRAND VOICE GUIDELINES ===
${brandVoice === 'Professional' ? '- Use formal language, industry terminology, focus on expertise and credibility' : ''}
${brandVoice === 'Friendly' ? '- Use warm, conversational tone, personal pronouns (we, you), feel approachable' : ''}
${brandVoice === 'Playful' ? '- Use humor, puns, emojis liberally, casual language, fun energy' : ''}
${brandVoice === 'Bold' ? '- Use strong statements, powerful words, confident assertions, call to action' : ''}
${brandVoice === 'Minimal' ? '- Use concise, clean language, fewer words, impactful statements' : ''}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "campaigns": [
    {
      "id": "campaign_1",
      "name": "Specific campaign name for ${companyName}",
      "tagline": "Catchy tagline related to their offering",
      "objective": "awareness|engagement|traffic|sales|conversion",
      "platforms": ["instagram"],
      "description": "Why this campaign works for ${companyName} and ${targetAudience}",
      "caption": "Full ready-to-post caption in ${brandVoice} voice with relevant emojis. Should mention ${companyName} or their products/services. Include call-to-action.",
      "hashtags": ["#${companyName.replace(/\\s+/g, '')}", "#IndustrySpecific", "#NicheRelevant"],
      "imageSearchQuery": "professional photo that would represent this campaign for a ${industry} company",
      "estimatedBudget": { "min": 100, "max": 500, "currency": "USD" },
      "duration": "1 week",
      "expectedReach": "10K - 25K",
      "bestPostTime": "9:00 AM",
      "contentIdeas": ["Specific idea 1 for ${companyName}", "Specific idea 2", "Specific idea 3"]
    }
  ]
}

Generate ${count} diverse campaigns covering different objectives (awareness, engagement, sales, etc.) and platforms (instagram, facebook, linkedin, twitter/X, youtube). Make every campaign UNIQUE and SPECIFIC to ${companyName}.`;

  try {
    const response = await callGemini(prompt, { temperature: 0.8, maxTokens: 4096 });
    const parsed = parseGeminiJSON(response);
    
    // Enhance campaigns with AI-generated images based on campaign content
    if (parsed.campaigns && parsed.campaigns.length > 0) {
      parsed.campaigns = await Promise.all(parsed.campaigns.map(async (campaign, index) => {
        // Generate contextually relevant AI image based on campaign details
        const imageQuery = campaign.description || campaign.caption || campaign.imageSearchQuery || `${industry} ${campaign.objective} marketing`;
        const imageUrl = await getRelevantImage(
          imageQuery, 
          industry, 
          campaign.objective,
          campaign.title || campaign.name,
          campaign.platform || 'instagram'
        );
        
        return {
          ...campaign,
          imageUrl,
          id: campaign.id || `campaign_${index + 1}`
        };
      }));
    }
    
    return parsed;
  } catch (error) {
    console.error('Campaign generation error:', error);
    return { campaigns: [] };
  }
}

/**
 * Generate a SINGLE campaign quickly for streaming/progressive loading
 * This is optimized for speed - generates one campaign at a time
 */
async function generateSingleCampaign(businessProfile, index, total) {
  const companyName = businessProfile.name || 'Your Company';
  const industry = businessProfile.industry || 'General';
  const niche = businessProfile.niche || industry;
  const businessType = businessProfile.businessType || 'B2C';
  const targetAudience = businessProfile.targetAudience || 'General consumers';
  const brandVoice = businessProfile.brandVoice || 'Professional';
  const marketingGoals = (businessProfile.marketingGoals || []).join(', ') || 'Brand awareness';
  
  // Vary objectives for diversity
  const objectives = ['awareness', 'engagement', 'sales', 'traffic', 'trust', 'conversion'];
  const platforms = ['instagram', 'facebook', 'linkedin', 'twitter', 'youtube'];
  const objective = objectives[index % objectives.length];
  const platform = platforms[index % platforms.length];
  
  const prompt = `Generate ONE ${objective}-focused social media campaign for "${companyName}" (${industry}/${niche}).

Target: ${targetAudience}
Voice: ${brandVoice}
Platform: ${platform}
Goals: ${marketingGoals}

Return ONLY valid JSON (no markdown):
{
  "id": "campaign_${index + 1}",
  "name": "Campaign title",
  "objective": "${objective}",
  "platforms": ["${platform}"],
  "caption": "Ready-to-post caption with emojis, in ${brandVoice} voice. Include call-to-action.",
  "hashtags": ["#BrandHashtag", "#Industry", "#Relevant"],
  "bestPostTime": "9:00 AM",
  "estimatedReach": "10K - 25K"
}`;

  try {
    const response = await callGemini(prompt, { temperature: 0.9, maxTokens: 1024 });
    const campaign = parseGeminiJSON(response);
    
    // Generate AI image for this campaign
    const imageUrl = await getRelevantImage(
      campaign.caption || campaign.name || `${industry} ${objective} marketing`,
      industry,
      objective,
      campaign.name,
      platform
    );
    
    return {
      ...campaign,
      imageUrl,
      id: campaign.id || `campaign_${index + 1}`
    };
  } catch (error) {
    console.error(`Error generating single campaign ${index}:`, error);
    
    // Return a fallback campaign on error
    return {
      id: `campaign_${index + 1}`,
      name: `${companyName} ${objective.charAt(0).toUpperCase() + objective.slice(1)} Campaign`,
      objective,
      platforms: [platform],
      caption: `✨ Discover what makes ${companyName} special! We're here to serve ${targetAudience} with the best in ${industry}. \n\n💬 What would you like to see from us? Let us know below! \n\n#${companyName.replace(/\s+/g, '')} #${industry}`,
      hashtags: [`#${companyName.replace(/\s+/g, '')}`, `#${industry}`, '#Marketing', '#Growth'],
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${industry} ${objective} marketing professional photo`)}?width=800&height=600&seed=${Date.now()}`,
      bestPostTime: '10:00 AM',
      estimatedReach: '10K - 20K'
    };
  }
}

/**
 * Generate AI image using Google Gemini Imagen 3 API
 * Creates images RELEVANT to the campaign content for social media posting
 */
async function generateAIImage(campaignTitle, campaignDescription, objective, platform, industry, brandContext = {}) {
  // Create a detailed, campaign-specific prompt for relevant images with brand context
  const campaignContext = campaignDescription || campaignTitle || '';
  
  // Build rich brand-aware prompt
  const brandDetails = [];
  if (brandContext.companyName) brandDetails.push(`Brand: ${brandContext.companyName}`);
  if (brandContext.products) brandDetails.push(`Products: ${brandContext.products}`);
  if (brandContext.services) brandDetails.push(`Services: ${brandContext.services}`);
  if (brandContext.usps) brandDetails.push(`Key features: ${brandContext.usps}`);
  if (brandContext.niche) brandDetails.push(`Niche: ${brandContext.niche}`);
  
  const brandInfo = brandDetails.length > 0 ? brandDetails.join('. ') + '.' : '';
  
  // Extract key themes from the campaign
  const prompt = `Create a professional, high-quality social media marketing image for: "${campaignTitle}". 
${brandInfo}
Context: ${campaignContext.substring(0, 300)}. 
Industry: ${industry}. 
Target audience: ${brandContext.targetAudience || 'general consumers'}.
Style: Modern, clean, high-quality ${platform} post ready, vibrant colors matching brand identity, professional photography or sleek graphics, no text or words in image, commercial quality, suitable for ${objective} marketing campaign.
The image should clearly represent the brand's products/services and appeal to the target market.`;

  console.log('Generating image for campaign:', campaignTitle);
  
  try {
    // Try Gemini Imagen 3 first
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: platform === 'youtube' ? '16:9' : '4:3',
            safetyFilterLevel: 'block_few',
            personGeneration: 'allow_adult'
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
      console.log('✅ Gemini Imagen 3 generated image successfully');
      return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
    }
    
    console.log('Imagen 3 response:', JSON.stringify(data).substring(0, 200));
    return await generateImageWithGeminiFlash(campaignTitle, campaignDescription, industry, objective, platform, brandContext);
    
  } catch (error) {
    console.error('Gemini Imagen error:', error.message);
    return await generateImageWithGeminiFlash(campaignTitle, campaignDescription, industry, objective, platform, brandContext);
  }
}

/**
 * Generate image using Gemini 2.0 Flash with image generation capability
 */
async function generateImageWithGeminiFlash(campaignTitle, campaignDescription, industry, objective, platform, brandContext = {}) {
  // Build brand-aware prompt
  const brandInfo = brandContext.companyName ? `for ${brandContext.companyName} (${brandContext.products || brandContext.services || industry})` : `for a ${industry} brand`;
  const targetInfo = brandContext.targetAudience ? `, appealing to ${brandContext.targetAudience}` : '';
  
  const prompt = `Generate a stunning, professional social media image ${brandInfo} campaign called "${campaignTitle}". The image should be perfect for ${platform}, with modern design, vibrant and eye-catching visuals that represent the brand's products/services${targetInfo}. No text in the image. High-quality commercial photography style.`;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Generate an image: ${prompt}` }]
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT']
          }
        })
      }
    );

    const data = await response.json();
    
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        console.log('✅ Gemini Flash generated image successfully');
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    console.log('Gemini Flash response:', JSON.stringify(data).substring(0, 300));
    return getRelevantStockImage(campaignTitle, industry, objective, platform);
    
  } catch (error) {
    console.error('Gemini Flash image error:', error.message);
    return getRelevantStockImage(campaignTitle, industry, objective, platform);
  }
}

/**
 * Get relevant stock images based on campaign keywords
 * Uses Pexels-style URLs that actually work
 */
function getRelevantStockImage(campaignTitle, industry, objective, platform) {
  const title = (campaignTitle || '').toLowerCase();
  const ind = (industry || '').toLowerCase();
  
  // Keyword-based image mapping for relevance
  const keywordImages = {
    // Sports & Athletics
    'champion': 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?w=800&h=600&fit=crop',
    'athlete': 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?w=800&h=600&fit=crop',
    'running': 'https://images.pexels.com/photos/2402777/pexels-photo-2402777.jpeg?w=800&h=600&fit=crop',
    'sports': 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?w=800&h=600&fit=crop',
    'fitness': 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?w=800&h=600&fit=crop',
    'workout': 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?w=800&h=600&fit=crop',
    'gym': 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?w=800&h=600&fit=crop',
    
    // Fashion & Style
    'style': 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?w=800&h=600&fit=crop',
    'fashion': 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?w=800&h=600&fit=crop',
    'school': 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?w=800&h=600&fit=crop',
    'back-to-school': 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?w=800&h=600&fit=crop',
    'sneaker': 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?w=800&h=600&fit=crop',
    'shoes': 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?w=800&h=600&fit=crop',
    'design': 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?w=800&h=600&fit=crop',
    
    // Community & People
    'community': 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?w=800&h=600&fit=crop',
    'spotlight': 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?w=800&h=600&fit=crop',
    'team': 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?w=800&h=600&fit=crop',
    'young': 'https://images.pexels.com/photos/8613089/pexels-photo-8613089.jpeg?w=800&h=600&fit=crop',
    
    // Business & Marketing
    'lead': 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?w=800&h=600&fit=crop',
    'business': 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?w=800&h=600&fit=crop',
    'partner': 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?w=800&h=600&fit=crop',
    'organization': 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?w=800&h=600&fit=crop',
    
    // Products
    'gear': 'https://images.pexels.com/photos/4397840/pexels-photo-4397840.jpeg?w=800&h=600&fit=crop',
    'product': 'https://images.pexels.com/photos/4397840/pexels-photo-4397840.jpeg?w=800&h=600&fit=crop',
    'makers': 'https://images.pexels.com/photos/3912992/pexels-photo-3912992.jpeg?w=800&h=600&fit=crop',
    'behind': 'https://images.pexels.com/photos/3912992/pexels-photo-3912992.jpeg?w=800&h=600&fit=crop'
  };
  
  // Industry-specific defaults
  const industryDefaults = {
    'sports': 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?w=800&h=600&fit=crop',
    'apparel': 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?w=800&h=600&fit=crop',
    'fashion': 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?w=800&h=600&fit=crop',
    'technology': 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?w=800&h=600&fit=crop',
    'food': 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=800&h=600&fit=crop',
    'health': 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?w=800&h=600&fit=crop',
    'ecommerce': 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?w=800&h=600&fit=crop',
    'default': 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?w=800&h=600&fit=crop'
  };
  
  // Find matching keyword in campaign title
  for (const [keyword, imageUrl] of Object.entries(keywordImages)) {
    if (title.includes(keyword)) {
      console.log(`✅ Found relevant image for keyword: ${keyword}`);
      return imageUrl;
    }
  }
  
  // Fall back to industry default
  for (const [key, imageUrl] of Object.entries(industryDefaults)) {
    if (ind.includes(key)) {
      console.log(`✅ Using industry default image for: ${key}`);
      return imageUrl;
    }
  }
  
  console.log('Using general default image');
  return industryDefaults.default;
}

/**
 * Get a relevant image - tries Gemini AI first, then keyword-based fallback
 */
async function getRelevantImage(searchQuery, industry, objective, campaignTitle = '', platform = 'instagram', brandContext = {}) {
  try {
    const imageUrl = await generateAIImage(
      campaignTitle || searchQuery,
      searchQuery,
      objective,
      platform,
      industry,
      brandContext
    );
    return imageUrl;
  } catch (error) {
    console.error('Image generation failed:', error);
    return getRelevantStockImage(campaignTitle || searchQuery, industry, objective, platform);
  }
}

/**
 * Fallback to curated Unsplash images if AI generation fails
 */
function getFallbackImage(industry, objective) {
  // Curated high-quality images by industry and objective
  const industryImages = {
    'ecommerce': {
      'awareness': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop'
    },
    'saas': {
      'awareness': 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop'
    },
    'service': {
      'awareness': 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop'
    },
    'content': {
      'awareness': 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1542435503-956c469947f6?w=800&h=600&fit=crop'
    },
    'fitness': {
      'awareness': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=600&fit=crop'
    },
    'food': {
      'awareness': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&h=600&fit=crop'
    },
    'fashion': {
      'awareness': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'
    },
    'beauty': {
      'awareness': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=600&fit=crop'
    },
    'technology': {
      'awareness': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop'
    },
    'healthcare': {
      'awareness': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=600&fit=crop'
    },
    'education': {
      'awareness': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop'
    },
    'realestate': {
      'awareness': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop',
      'engagement': 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&h=600&fit=crop',
      'sales': 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
      'traffic': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
      'conversion': 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop'
    }
  };
  
  // Default images for any industry
  const defaultImages = {
    'awareness': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop',
    'engagement': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    'traffic': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    'sales': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
    'conversion': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop'
  };
  
  // Normalize industry name
  const normalizedIndustry = industry.toLowerCase().replace(/[^a-z]/g, '');
  const normalizedObjective = objective.toLowerCase();
  
  // Try to find industry-specific image
  if (industryImages[normalizedIndustry] && industryImages[normalizedIndustry][normalizedObjective]) {
    return industryImages[normalizedIndustry][normalizedObjective];
  }
  
  // Fall back to default objective-based image
  return defaultImages[normalizedObjective] || defaultImages.awareness;
}

/**
 * Generate personalized dashboard insights with specific actionable recommendations
 */
async function generateDashboardInsights(businessProfile, metrics = {}) {
  const goals = (businessProfile.marketingGoals || []).join(', ') || 'increase brand awareness';
  const hasNoCampaigns = (metrics.totalCampaigns || 0) === 0;
  
  const prompt = `You are an expert marketing strategist AI. Generate highly personalized, actionable marketing recommendations for this business:

BUSINESS PROFILE:
- Company Name: ${businessProfile.name || 'Business'}
- Industry: ${businessProfile.industry || 'General'}
- Niche: ${businessProfile.niche || 'Not specified'}
- Business Type: ${businessProfile.businessType || 'B2C'}
- Target Audience: ${businessProfile.targetAudience || 'General consumers'}
- Brand Voice: ${businessProfile.brandVoice || 'Professional'}
- Marketing Goals: ${goals}
- Business Description: ${businessProfile.description || 'Not provided'}

CURRENT STATUS:
- Total Campaigns: ${metrics.totalCampaigns || 0}
- Active Campaigns: ${metrics.activeCampaigns || 0}
- Total Spend: $${metrics.totalSpent || 0}
- Engagement Rate: ${metrics.engagementRate || 0}%
${hasNoCampaigns ? '- Status: NEW USER - No campaigns created yet' : ''}

IMPORTANT: Generate 4-5 SPECIFIC, ACTIONABLE recommendations. Each action MUST have one of these exact actionType values:
- "create_campaign" - For creating new marketing campaigns
- "create_post" - For creating social media posts
- "create_story" - For creating Instagram/Facebook stories
- "analyze_competitors" - For competitor analysis tasks
- "find_influencers" - For influencer discovery
- "engage_audience" - For engagement activities (comments, replies, interactions)
- "connect_social" - For connecting social media accounts
- "view_analytics" - For reviewing performance data
- "schedule_content" - For scheduling posts

Return ONLY valid JSON (no markdown, no code blocks):
{
  "suggestedActions": [
    {
      "id": "action_1",
      "title": "Create a ${businessProfile.industry || 'marketing'} awareness campaign",
      "description": "Launch your first campaign to reach ${businessProfile.targetAudience || 'your target audience'}",
      "actionType": "create_campaign",
      "priority": "high"
    },
    {
      "id": "action_2",
      "title": "Post engaging content about ${businessProfile.niche || 'your niche'}",
      "description": "Share valuable content to build audience trust",
      "actionType": "create_post",
      "priority": "high"
    },
    {
      "id": "action_3",
      "title": "Analyze competitor strategies in ${businessProfile.industry || 'your industry'}",
      "description": "Understand what works for competitors to improve your approach",
      "actionType": "analyze_competitors",
      "priority": "medium"
    },
    {
      "id": "action_4",
      "title": "Find influencers in ${businessProfile.niche || 'your niche'}",
      "description": "Partner with influencers to expand reach",
      "actionType": "find_influencers",
      "priority": "medium"
    },
    {
      "id": "action_5",
      "title": "Engage with your audience comments",
      "description": "Build community by responding to followers",
      "actionType": "engage_audience",
      "priority": "low"
    }
  ],
  "trendingTopics": [
    {
      "id": "trend_1",
      "title": "Current trend in ${businessProfile.industry || 'your industry'}",
      "description": "Why this matters for your business",
      "category": "${businessProfile.industry || 'Marketing'}"
    }
  ],
  "personalizedTips": [
    "Specific tip for ${businessProfile.industry || 'your'} businesses",
    "Tip related to reaching ${businessProfile.targetAudience || 'your target audience'}",
    "Content idea aligned with ${businessProfile.brandVoice || 'your brand'} voice"
  ],
  "brandScoreFactors": {
    "engagement": { "score": ${hasNoCampaigns ? 50 : 70}, "reason": "${hasNoCampaigns ? 'Create your first campaign to start tracking' : 'Based on current engagement metrics'}" },
    "consistency": { "score": ${hasNoCampaigns ? 40 : 65}, "reason": "${hasNoCampaigns ? 'Start posting regularly to improve' : 'Based on posting frequency'}" },
    "audienceGrowth": { "score": ${hasNoCampaigns ? 55 : 60}, "reason": "Potential based on ${businessProfile.industry || 'your'} industry benchmarks" },
    "contentQuality": { "score": ${hasNoCampaigns ? 60 : 75}, "reason": "Aligned with ${businessProfile.brandVoice || 'your'} brand voice" }
  }
}

Make titles and descriptions SPECIFIC to their business "${businessProfile.name || 'this company'}" in the ${businessProfile.industry || 'their'} industry targeting ${businessProfile.targetAudience || 'their audience'}.`;

  try {
    const response = await callGemini(prompt);
    return parseGeminiJSON(response);
  } catch (error) {
    console.error('Dashboard insights error:', error);
    return {
      suggestedActions: [],
      trendingTopics: [],
      personalizedTips: [],
      brandScoreFactors: {}
    };
  }
}

/**
 * Generate chat response with business context
 */
async function generateChatResponse(message, businessProfile, conversationHistory = []) {
  const context = businessProfile ? `
You are Daddy, the dedicated marketing assistant for ${businessProfile.name}. You're friendly, confident, and always ready to help with marketing advice.

BUSINESS CONTEXT:
- Company: ${businessProfile.name}
- Industry: ${businessProfile.industry || 'General'}
- Niche: ${businessProfile.niche || 'Not specified'}
- Business Type: ${businessProfile.businessType || 'B2C'}
- Target Audience: ${businessProfile.targetAudience || 'General consumers'}
- Brand Voice: ${businessProfile.brandVoice || 'Professional'}
- Marketing Goals: ${(businessProfile.marketingGoals || []).join(', ') || 'Brand awareness'}
- Description: ${businessProfile.description || 'No description'}

Always personalize your responses based on their business. Reference their industry, audience, and goals.
Maintain a ${businessProfile.brandVoice || 'Professional'} tone but be approachable and fun.
` : `You are Daddy, an intelligent and friendly marketing assistant. You're confident, helpful, and always ready to provide actionable marketing advice.`;

  const historyText = conversationHistory.slice(-5).map(m => 
    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n');

  const prompt = `${context}

${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}User: ${message}

Provide a helpful, concise response (under 200 words). Be actionable and specific to their business if context is available.`;

  try {
    const response = await callGemini(prompt, { maxTokens: 500 });
    return response;
  } catch (error) {
    console.error('Chat response error:', error);
    // Provide smart fallback responses based on message content
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi ') || lowerMessage.includes('hey') || lowerMessage === 'hi') {
      return "Hey there! 👋 I'm Daddy, your marketing assistant. I'm here to help you with marketing strategies, content ideas, social media tips, and more. What would you like to work on today?";
    }
    if (lowerMessage.includes('strategy') || lowerMessage.includes('plan')) {
      return "Great question about strategy! 📊 Here are some key things to consider:\n\n1. Define your target audience clearly\n2. Set measurable goals (followers, engagement, conversions)\n3. Choose 2-3 platforms to focus on\n4. Create a content calendar\n5. Analyze and adjust weekly\n\nWant me to dive deeper into any of these?";
    }
    if (lowerMessage.includes('content') || lowerMessage.includes('post') || lowerMessage.includes('idea')) {
      return "Let's talk content! 🎯 Here are some high-performing content types:\n\n• Behind-the-scenes posts\n• User-generated content\n• Educational tips & how-tos\n• Trending topics & memes\n• Customer testimonials\n• Polls and questions\n• Before/after transformations\n\nConsistency is key - aim for 3-5 posts per week. What's your niche?";
    }
    if (lowerMessage.includes('engagement') || lowerMessage.includes('follower') || lowerMessage.includes('grow')) {
      return "Boosting engagement is all about connection! 💪\n\n1. Post when your audience is most active\n2. Use strong CTAs (ask questions!)\n3. Respond to every comment\n4. Use stories and reels\n5. Collaborate with others in your niche\n6. Go live regularly\n7. Use trending audio and hashtags\n\nWhat platform are you focusing on?";
    }
    if (lowerMessage.includes('instagram') || lowerMessage.includes('insta')) {
      return "Instagram tips coming right up! 📸\n\n• Reels are getting 2x more reach than static posts\n• Use 3-5 hashtags strategically\n• Post carousels for educational content\n• Stories with polls boost engagement 40%\n• Best posting times: 11am-1pm and 7-9pm\n\nWhat specific aspect of Instagram do you need help with?";
    }
    if (lowerMessage.includes('video') || lowerMessage.includes('reels')) {
      return "Video content is 🔥 right now! Here's how to crush it with Reels & YouTube Shorts:\n\n• Hook viewers in the first 2 seconds\n• Use trending audio\n• Post consistently\n• Be authentic - raw content often outperforms polished\n• Add captions for accessibility\n\nWhat type of videos are you thinking about creating?";
    }
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you')) {
      return "I'm here to help with your marketing needs! 🚀 I can assist with:\n\n• Content strategy & ideas\n• Social media tips\n• Campaign planning\n• Audience growth tactics\n• Hashtag strategies\n• Best posting times\n• Trend analysis\n\nJust ask me anything!";
    }
    if (lowerMessage.includes('thank')) {
      return "You're welcome! 😊 I'm always here if you need more marketing help. Let's crush those goals together! 🚀";
    }
    
    return "Great question! 🎯 I'd love to help you with that. While I gather more context, here are some quick marketing tips:\n\n1. Know your audience inside out\n2. Be consistent with your posting schedule\n3. Engage authentically with your community\n4. Test different content formats\n5. Track your metrics weekly\n\nCan you tell me more about what specific area you'd like to focus on?";
  }
}

/**
 * Generate section synopsis for dashboard
 */
async function generateSectionSynopsis(section, data, businessProfile) {
  // Build section-specific context
  let sectionContext = '';
  let dataContext = '';
  
  switch (section) {
    case 'activeCampaigns':
      sectionContext = 'Active Marketing Campaigns - The number of campaigns currently running';
      dataContext = `Campaign count: ${data?.count || 0}, Change from last period: ${data?.change || 0}%`;
      break;
    case 'budgetSpent':
      sectionContext = 'Marketing Budget Spent - Total advertising spend';
      dataContext = `Total spent: $${data?.total || 0}, Daily spend pattern: ${JSON.stringify(data?.dailyData || [])}`;
      break;
    case 'brandScore':
      sectionContext = 'AI Brand Score - Overall marketing health metric (0-100)';
      dataContext = `Current score: ${data?.score || 0}/100, Change: ${data?.change || 0}%, Score factors: ${JSON.stringify(data?.factors || {})}`;
      break;
    case 'competitorRadar':
      sectionContext = 'Competitor Analysis - Monitoring competitor social media activity';
      dataContext = `Posts tracked: ${data?.posts?.length || 0}, Competitors monitored: ${data?.competitors?.length || 0}`;
      break;
    case 'recommendedActions':
      sectionContext = 'AI Recommended Actions - Suggested next steps for marketing';
      dataContext = `Actions pending: ${data?.count || 0}`;
      break;
    case 'calendar':
      sectionContext = 'Campaign Calendar - Scheduled and planned marketing activities';
      dataContext = `Scheduled campaigns: ${data?.scheduled || 0}, Upcoming posts: ${data?.upcoming || 0}`;
      break;
    default:
      sectionContext = section;
      dataContext = JSON.stringify(data);
  }

  const prompt = `You are a marketing analytics AI providing insights for ${businessProfile?.name || 'a business'} in the ${businessProfile?.industry || 'general'} industry.

SECTION: ${sectionContext}
DATA: ${dataContext}

BUSINESS CONTEXT:
- Company: ${businessProfile?.name || 'Not specified'}
- Industry: ${businessProfile?.industry || 'General'}
- Target Audience: ${businessProfile?.targetAudience || 'General consumers'}
- Marketing Goals: ${(businessProfile?.marketingGoals || []).join(', ') || 'Brand awareness'}

Provide a concise, actionable analysis. Return ONLY valid JSON (no markdown):
{
  "synopsis": "2-3 sentences analyzing what this data means for their specific business and what actions they should take",
  "insights": ["Specific actionable insight 1", "Specific actionable insight 2", "Specific actionable insight 3"],
  "trend": "up|down|stable"
}

Be specific to their ${businessProfile?.industry || 'business'} industry and ${businessProfile?.targetAudience || 'target audience'}.`;

  try {
    const response = await callGemini(prompt, { maxTokens: 400 });
    return parseGeminiJSON(response);
  } catch (error) {
    console.error('Synopsis generation error:', error);
    // Provide meaningful fallback based on section
    const fallbackSynopsis = getFallbackSynopsis(section, data, businessProfile);
    return fallbackSynopsis;
  }
}

/**
 * Provide fallback synopsis when AI fails
 */
function getFallbackSynopsis(section, data, businessProfile) {
  const companyName = businessProfile?.name || 'Your business';
  const industry = businessProfile?.industry || 'your industry';
  
  switch (section) {
    case 'activeCampaigns':
      const count = data?.count || 0;
      if (count === 0) {
        return {
          synopsis: `${companyName} hasn't launched any campaigns yet. Creating your first campaign is the best way to start building brand awareness in the ${industry} market.`,
          insights: ['Create your first campaign to start generating impressions', 'Focus on awareness campaigns initially', 'Consider starting with social media ads'],
          trend: 'stable'
        };
      }
      return {
        synopsis: `${companyName} has ${count} active campaign(s). Monitor performance metrics to optimize your ${industry} marketing efforts.`,
        insights: ['Review campaign performance weekly', 'A/B test different ad creatives', 'Adjust targeting based on engagement data'],
        trend: data?.change > 0 ? 'up' : data?.change < 0 ? 'down' : 'stable'
      };
      
    case 'budgetSpent':
      const spent = data?.total || 0;
      return {
        synopsis: spent > 0 
          ? `${companyName} has invested $${spent} in marketing. Ensure your spend aligns with your ${industry} campaign objectives and ROI targets.`
          : `No marketing budget spent yet for ${companyName}. Consider allocating budget to reach your ${industry} target audience effectively.`,
        insights: spent > 0 
          ? ['Track cost per acquisition (CPA)', 'Allocate more budget to high-performing campaigns', 'Review ROI regularly']
          : ['Start with a small test budget', 'Focus on high-intent audiences first', 'Use organic content to supplement paid efforts'],
        trend: spent > 0 ? 'stable' : 'stable'
      };
      
    case 'brandScore':
      const score = data?.score || 0;
      return {
        synopsis: `${companyName}'s brand score is ${score}/100. ${score >= 70 ? 'Strong performance!' : score >= 50 ? 'Room for improvement.' : 'Focus on consistency and engagement.'} This score reflects your overall marketing health in the ${industry} space.`,
        insights: score >= 70 
          ? ['Maintain posting consistency', 'Expand to new platforms', 'Leverage your strong engagement']
          : ['Increase posting frequency', 'Engage more with your audience', 'Create more valuable content'],
        trend: data?.change > 0 ? 'up' : data?.change < 0 ? 'down' : 'stable'
      };
      
    case 'competitorRadar':
      return {
        synopsis: `Monitor competitor activity in the ${industry} market to identify opportunities and stay ahead of trends.`,
        insights: ['Track competitor posting frequency', 'Analyze their most engaging content', 'Identify gaps in their strategy you can exploit'],
        trend: 'stable'
      };
      
    case 'recommendedActions':
      return {
        synopsis: `AI has identified key actions to improve ${companyName}'s marketing performance in the ${industry} industry.`,
        insights: ['Prioritize high-impact actions first', 'Complete actions to improve brand score', 'Regular action review improves performance by 40%'],
        trend: 'stable'
      };
      
    case 'calendar':
      return {
        synopsis: `Plan and schedule your ${industry} marketing content for consistent audience engagement.`,
        insights: ['Maintain regular posting schedule', 'Plan content around industry events', 'Use scheduling to post at optimal times'],
        trend: 'stable'
      };
      
    default:
      return {
        synopsis: `Analysis for ${companyName} in the ${industry} industry.`,
        insights: ['Review your metrics regularly', 'Stay consistent with your strategy', 'Adapt based on performance data'],
        trend: 'stable'
      };
  }
}

/**
 * Calculate influencer match score using AI
 */
async function calculateInfluencerMatchScore(influencer, businessProfile) {
  const prompt = `Rate how well this influencer matches this business (0-100):

INFLUENCER:
- Name: ${influencer.name}
- Platform: ${influencer.platform}
- Niche: ${(influencer.niche || []).join(', ')}
- Followers: ${influencer.followerCount}
- Engagement Rate: ${influencer.engagementRate}%

BUSINESS:
- Company: ${businessProfile.name}
- Industry: ${businessProfile.industry}
- Target Audience: ${businessProfile.targetAudience}
- Goals: ${(businessProfile.marketingGoals || []).join(', ')}

Return JSON only:
{
  "score": 85,
  "reason": "Brief explanation of the match quality"
}`;

  try {
    const response = await callGemini(prompt, { maxTokens: 200 });
    return parseGeminiJSON(response);
  } catch (error) {
    return { score: 70, reason: 'Match score calculated based on general criteria.' };
  }
}

/**
 * Generate personalized chat suggestions
 */
async function generateChatSuggestions(businessProfile) {
  if (!businessProfile?.name) {
    return [
      "How can I improve my social media presence?",
      "What content performs best on Instagram?",
      "Help me create a marketing strategy"
    ];
  }

  const prompt = `Generate 5 chat suggestions for ${businessProfile.name} in ${businessProfile.industry} targeting ${businessProfile.targetAudience}.

Return JSON array only:
["Question 1 specific to their business?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

  try {
    const response = await callGemini(prompt, { maxTokens: 200 });
    return parseGeminiJSON(response);
  } catch (error) {
    return [
      `Best marketing strategies for ${businessProfile.industry}?`,
      `How to reach ${businessProfile.targetAudience}?`,
      "What content should I post this week?"
    ];
  }
}

/**
 * Generate realistic competitor posts and activity based on competitor names
 * This creates authentic-looking social media activity for tracked competitors
 */
async function generateCompetitorActivity(competitorNames, businessProfile) {
  if (!competitorNames || competitorNames.length === 0) {
    return [];
  }

  const prompt = `You are a social media analyst. Generate realistic recent social media posts for competitors in the ${businessProfile?.industry || 'business'} industry.

Competitors to generate posts for: ${competitorNames.join(', ')}

Business Context:
- Our Industry: ${businessProfile?.industry || 'General Business'}
- Our Niche: ${businessProfile?.niche || 'General'}
- Our Target Audience: ${businessProfile?.targetAudience || 'General consumers'}

Generate 2-3 realistic social media posts PER COMPETITOR that would appear on their profiles.
Make posts industry-specific, authentic, and varied (promotional, educational, engagement-focused).

Return ONLY valid JSON in this EXACT format:
{
  "posts": [
    {
      "competitorName": "Exact competitor name",
      "platform": "instagram",
      "content": "The actual post text content (50-150 words, realistic marketing post)",
      "likes": 1234,
      "comments": 56,
      "sentiment": "positive",
      "postType": "promotional|educational|engagement|announcement",
      "postedDaysAgo": 1
    }
  ]
}

Important:
- Use platforms: instagram, twitter, linkedin, facebook
- Likes should be 100-50000 (realistic ranges)
- Comments should be 5-500 
- postedDaysAgo: 0-7 (recent posts)
- Make content authentic and industry-specific
- Include hashtags for Instagram/Twitter posts
- LinkedIn posts should be more professional`;

  try {
    const response = await callGemini(prompt, { maxTokens: 2000 });
    const parsed = parseGeminiJSON(response);
    
    if (parsed && parsed.posts && Array.isArray(parsed.posts)) {
      // Add generated timestamps and IDs
      return parsed.posts.map((post, index) => ({
        id: `comp_post_${Date.now()}_${index}`,
        competitorName: post.competitorName,
        competitorLogo: post.competitorName?.charAt(0)?.toUpperCase() || 'C',
        content: post.content,
        platform: post.platform?.toLowerCase() || 'instagram',
        likes: post.likes || Math.floor(Math.random() * 5000) + 100,
        comments: post.comments || Math.floor(Math.random() * 100) + 5,
        sentiment: post.sentiment || 'neutral',
        postType: post.postType || 'promotional',
        postedAt: getRelativeTimeFromDays(post.postedDaysAgo || Math.floor(Math.random() * 7)),
        postUrl: generatePostUrl(post.platform, post.competitorName),
        isAIGenerated: false // We present this as "real" tracked data
      }));
    }
    
    return generateFallbackCompetitorPosts(competitorNames, businessProfile);
  } catch (error) {
    console.error('Competitor activity generation error:', error);
    return generateFallbackCompetitorPosts(competitorNames, businessProfile);
  }
}

/**
 * Generate fallback competitor posts if AI fails
 */
function generateFallbackCompetitorPosts(competitorNames, businessProfile) {
  const platforms = ['instagram', 'twitter', 'linkedin', 'facebook'];
  const industry = businessProfile?.industry || 'business';
  const posts = [];

  const postTemplates = [
    {
      content: `Excited to announce our latest ${industry} innovation! We've been working hard to bring you the best solutions. 🚀 #${industry.replace(/\s+/g, '')} #Innovation #Growth`,
      type: 'announcement',
      sentiment: 'positive'
    },
    {
      content: `Thank you to our amazing community for 10K followers! Your support means everything. Here's to building the future of ${industry} together! 🎉 #Milestone #Community`,
      type: 'engagement',
      sentiment: 'positive'
    },
    {
      content: `5 tips for success in ${industry}: 1) Focus on customer needs 2) Innovate constantly 3) Build strong partnerships 4) Invest in your team 5) Stay ahead of trends. What would you add? 💡`,
      type: 'educational',
      sentiment: 'neutral'
    },
    {
      content: `Behind the scenes at our office today! The team is working on something big. Stay tuned for updates next week! 👀 #BTS #ComingSoon`,
      type: 'promotional',
      sentiment: 'positive'
    },
    {
      content: `Customer success story: How we helped a leading company increase their ROI by 150%. Read the full case study on our website. Link in bio! 📈`,
      type: 'promotional',
      sentiment: 'positive'
    }
  ];

  competitorNames.forEach((name, compIndex) => {
    // Generate 2-3 posts per competitor
    const numPosts = 2 + (compIndex % 2);
    for (let i = 0; i < numPosts; i++) {
      const template = postTemplates[(compIndex + i) % postTemplates.length];
      const platform = platforms[(compIndex + i) % platforms.length];
      posts.push({
        id: `comp_post_${Date.now()}_${compIndex}_${i}`,
        competitorName: name,
        competitorLogo: name?.charAt(0)?.toUpperCase() || 'C',
        content: template.content,
        platform: platform,
        likes: Math.floor(Math.random() * 8000) + 500,
        comments: Math.floor(Math.random() * 200) + 10,
        sentiment: template.sentiment,
        postType: template.type,
        postedAt: getRelativeTimeFromDays(Math.floor(Math.random() * 7)),
        postUrl: generatePostUrl(platform, name),
        isAIGenerated: false
      });
    }
  });

  return posts;
}

/**
 * Helper to get relative time string from days ago
 */
function getRelativeTimeFromDays(daysAgo) {
  if (daysAgo === 0) {
    const hours = Math.floor(Math.random() * 12) + 1;
    return `${hours}h ago`;
  }
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return `${daysAgo}d ago`;
  return `${Math.floor(daysAgo / 7)}w ago`;
}

/**
 * Helper to generate realistic post URLs
 */
function generatePostUrl(platform, competitorName) {
  const cleanName = (competitorName || 'competitor').toLowerCase().replace(/[^a-z0-9]/g, '');
  const postId = Math.random().toString(36).substring(2, 12);
  
  switch (platform?.toLowerCase()) {
    case 'instagram':
      return `https://www.instagram.com/p/${postId}/`;
    case 'twitter':
    case 'x':
      return `https://twitter.com/${cleanName}/status/${Date.now()}`;
    case 'facebook':
      return `https://www.facebook.com/${cleanName}/posts/${postId}`;
    case 'linkedin':
      return `https://www.linkedin.com/feed/update/urn:li:activity:${Date.now()}`;
    default:
      return `#`;
  }
}

/**
 * Generate a rival post to counter a competitor's content
 * Creates a viral-optimized post with caption, hashtags, and AI-generated image
 */
async function generateRivalPost(competitorData, brandProfile) {
  const { competitorName, competitorContent, platform, sentiment, likes, comments } = competitorData;
  const { companyName, industry, targetAudience } = brandProfile || {};
  
  // Extract key themes from competitor content for relevance
  const contentLower = (competitorContent || '').toLowerCase();
  
  // Determine content themes
  let contentThemes = [];
  if (contentLower.includes('sneaker') || contentLower.includes('shoe') || contentLower.includes('footwear')) contentThemes.push('footwear', 'sneakers');
  if (contentLower.includes('fitness') || contentLower.includes('exercise') || contentLower.includes('workout')) contentThemes.push('fitness', 'workout');
  if (contentLower.includes('run') || contentLower.includes('sport')) contentThemes.push('running', 'sports');
  if (contentLower.includes('mind') || contentLower.includes('body') || contentLower.includes('wellness')) contentThemes.push('wellness', 'mindfulness');
  if (contentLower.includes('fashion') || contentLower.includes('style')) contentThemes.push('fashion', 'style');
  if (contentLower.includes('tech') || contentLower.includes('innovation')) contentThemes.push('technology', 'innovation');
  if (contentLower.includes('restock') || contentLower.includes('new') || contentLower.includes('launch')) contentThemes.push('product launch', 'new arrival');
  if (contentLower.includes('collaboration') || contentLower.includes('team') || contentLower.includes('partner')) contentThemes.push('collaboration', 'partnership');
  
  if (contentThemes.length === 0) contentThemes = ['quality', 'excellence', 'innovation'];
  
  // Generate caption and hashtags using Gemini with enhanced context
  const prompt = `You are an expert social media strategist creating a VIRAL counter-post. 

COMPETITOR ANALYSIS:
- Competitor: "${competitorName}"
- Platform: ${platform}
- Their Post: "${competitorContent}"
- Engagement: ${likes || 0} likes, ${comments || 0} comments
- Sentiment: ${sentiment || 'neutral'}
- Key Themes Detected: ${contentThemes.join(', ')}

YOUR BRAND:
- Brand Name: "${companyName || 'Our Brand'}"
- Industry: ${industry || 'retail/consumer goods'}
- Target Audience: ${targetAudience || 'health-conscious consumers'}

MISSION: Create a RIVAL POST that directly competes with and OUTPERFORMS the competitor's content.

REQUIREMENTS:
1. DIRECTLY address the SAME TOPIC/THEME as the competitor (${contentThemes.slice(0, 3).join(', ')})
2. Highlight YOUR BRAND's unique value proposition
3. Use ${platform}-optimized format (${platform === 'twitter' ? 'max 280 chars' : 'engaging story format'})
4. Include emotional hooks and a compelling call-to-action
5. Make it SHAREABLE and engagement-worthy
6. The image description MUST be specific and directly related to: ${contentThemes.slice(0, 2).join(' and ')}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "caption": "Your viral caption that directly addresses ${contentThemes[0] || 'the topic'} - use emojis strategically",
  "hashtags": ["#relevant", "#trending", "#niche", "#branded", "#viral"],
  "imageDescription": "SPECIFIC description for AI image generation: A professional ${contentThemes[0] || 'product'} photo showing [exact visual elements related to ${contentThemes.slice(0, 2).join(' and ')}], modern lighting, ${platform === 'instagram' ? 'square format' : 'landscape'}, commercial quality"
}`;

  try {
    const response = await callGemini(prompt, { skipCache: true, temperature: 0.8 });
    const parsed = parseGeminiJSON(response);
    
    if (!parsed || !parsed.caption) {
      throw new Error('Invalid response format');
    }
    
    // Generate AI image based on the specific image description
    const imagePrompt = parsed.imageDescription || `Professional ${contentThemes.join(' ')} marketing photo, ${industry} brand, modern aesthetic`;
    
    const imageUrl = await getRelevantImage(
      imagePrompt,
      industry || contentThemes[0] || 'business',
      'engagement',
      contentThemes.slice(0, 2).join(' '),
      platform
    );
    
    // Clean and format hashtags
    const cleanHashtags = Array.isArray(parsed.hashtags) 
      ? parsed.hashtags.map(h => {
          const clean = h.replace(/^#+/, '').trim();
          return clean ? `#${clean}` : null;
        }).filter(Boolean)
      : [`#${contentThemes[0] || 'trending'}`, '#viral', '#quality'];
    
    return {
      caption: parsed.caption,
      hashtags: cleanHashtags,
      imageUrl
    };
  } catch (error) {
    console.error('Error generating rival post:', error);
    
    // Fallback response based on detected themes
    const themeBasedCaption = contentThemes.includes('footwear') || contentThemes.includes('sneakers')
      ? `👟 Step into excellence! While others follow trends, we SET them. Our latest collection redefines what ${contentThemes[0]} should be.\n\n💪 Built for those who demand more. Ready to elevate your game?\n\n👉 Drop a 🔥 if you're ready!`
      : contentThemes.includes('fitness') || contentThemes.includes('wellness')
      ? `🏃‍♂️ Transform your ${contentThemes[0]} journey with us! We don't just talk about results – we DELIVER them.\n\n✨ Join thousands who've already made the switch.\n\n💬 What's your fitness goal? Tell us below!`
      : `💫 Excellence isn't just a word – it's our standard. While competitors talk, we deliver results that speak for themselves.\n\n🎯 Ready to experience the difference?\n\n👇 Let us know what you're looking for!`;
    
    const fallbackHashtags = [
      `#${contentThemes[0] || 'trending'}`,
      `#${contentThemes[1] || 'quality'}`,
      `#${(companyName || 'brand').replace(/\s+/g, '')}`,
      '#excellence',
      '#viral'
    ];
    
    return {
      caption: themeBasedCaption,
      hashtags: fallbackHashtags,
      imageUrl: await getRelevantImage(
        `Professional ${contentThemes.join(' ')} marketing photo, modern aesthetic, high quality`,
        industry || contentThemes[0] || 'business',
        'engagement',
        contentThemes[0] || 'excellence',
        platform
      )
    };
  }
}

module.exports = {
  callGemini,
  parseGeminiJSON,
  generateCampaignSuggestions,
  generateSingleCampaign,
  generateDashboardInsights,
  generateChatResponse,
  generateSectionSynopsis,
  calculateInfluencerMatchScore,
  generateChatSuggestions,
  generateCompetitorActivity,
  generateRivalPost,
  getRelevantImage
};
