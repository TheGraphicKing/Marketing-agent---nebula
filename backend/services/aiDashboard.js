/**
 * AI Dashboard Service
 * Uses Groq API to generate personalized dashboard content based on user's business profile
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Generate personalized dashboard data using AI
 * @param {Object} user - User object with businessProfile
 * @returns {Object} - AI-generated dashboard data
 */
async function generatePersonalizedDashboard(user) {
  const businessProfile = user.businessProfile || {};
  const connectedSocials = user.connectedSocials || [];
  
  // Build context about the user's business
  const businessContext = `
Business Name: ${businessProfile.name || 'Unknown'}
Industry: ${businessProfile.industry || 'General'}
Niche: ${businessProfile.niche || 'Not specified'}
Business Type: ${businessProfile.businessType || 'B2C'}
Target Audience: ${businessProfile.targetAudience || 'General consumers'}
Brand Voice: ${businessProfile.brandVoice || 'Professional'}
Marketing Goals: ${(businessProfile.marketingGoals || []).join(', ') || 'Brand awareness'}
Business Description: ${businessProfile.description || 'No description provided'}
Competitors: ${(businessProfile.competitors || []).join(', ') || 'Not specified'}
Connected Platforms: ${connectedSocials.map(s => s.platform).join(', ') || 'None'}
  `.trim();

  const prompt = `You are a marketing analytics AI. Based on the following business profile, generate personalized marketing dashboard data.

${businessContext}

Generate a JSON response with the following structure (return ONLY valid JSON, no markdown):
{
  "suggestedActions": [
    {
      "id": "1",
      "title": "Actionable marketing task",
      "description": "Brief explanation of why this matters",
      "type": "campaign|social|content",
      "priority": "high|medium|low",
      "estimatedImpact": "Brief impact description"
    }
  ],
  "competitorInsights": [
    {
      "id": "c1",
      "competitorName": "Relevant competitor name",
      "platform": "instagram|facebook|linkedin|twitter|tiktok",
      "content": "Example of what they might be posting",
      "sentiment": "positive|neutral|negative",
      "likes": number,
      "comments": number,
      "insight": "What you can learn from this"
    }
  ],
  "trendingTopics": [
    {
      "id": "t1",
      "title": "Trending topic relevant to their industry",
      "description": "Why this matters for their business",
      "category": "Category name",
      "relevanceScore": 0.0-1.0
    }
  ],
  "campaignIdeas": [
    {
      "id": "camp1",
      "name": "Campaign name idea",
      "objective": "awareness|engagement|traffic|sales|conversion",
      "platforms": ["platform names"],
      "description": "Brief campaign description",
      "estimatedBudget": "$X-$Y",
      "targetAudience": "Specific audience segment"
    }
  ],
  "brandScoreFactors": {
    "engagement": { "score": 0-100, "reason": "Why this score" },
    "consistency": { "score": 0-100, "reason": "Why this score" },
    "audienceGrowth": { "score": 0-100, "reason": "Why this score" },
    "contentQuality": { "score": 0-100, "reason": "Why this score" }
  },
  "personalizedTips": [
    "Tip 1 specific to their business",
    "Tip 2 specific to their industry",
    "Tip 3 specific to their goals"
  ]
}

Generate 3-4 suggested actions, 2-3 competitor insights, 3 trending topics, 2-3 campaign ideas, and 3 personalized tips. Make everything specific to their ${businessProfile.industry || 'business'} industry and ${businessProfile.targetAudience || 'target audience'}.`;

  try {
    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not set, returning default dashboard data');
      return getDefaultDashboardData(businessProfile);
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { 
            role: 'system', 
            content: 'You are a marketing analytics AI that generates personalized marketing insights. Always respond with valid JSON only, no markdown formatting or code blocks.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.9
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', data);
      return getDefaultDashboardData(businessProfile);
    }

    const aiContent = data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      return getDefaultDashboardData(businessProfile);
    }

    // Parse JSON response, handling potential markdown code blocks
    let parsedData;
    try {
      // Remove markdown code blocks if present
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      parsedData = JSON.parse(cleanedContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw AI response:', aiContent);
      return getDefaultDashboardData(businessProfile);
    }

    return {
      ...parsedData,
      generatedAt: new Date().toISOString(),
      businessContext: {
        name: businessProfile.name,
        industry: businessProfile.industry,
        targetAudience: businessProfile.targetAudience
      }
    };

  } catch (error) {
    console.error('AI Dashboard generation error:', error);
    return getDefaultDashboardData(businessProfile);
  }
}

/**
 * Generate competitor analysis using AI
 */
async function generateCompetitorAnalysis(user, competitorNames = []) {
  const businessProfile = user.businessProfile || {};
  const competitors = competitorNames.length > 0 
    ? competitorNames 
    : (businessProfile.competitors || ['Competitor A', 'Competitor B']);

  const prompt = `Analyze competitors for a ${businessProfile.industry || 'general'} business targeting ${businessProfile.targetAudience || 'general consumers'}.

Competitors to analyze: ${competitors.join(', ')}

Generate detailed competitor insights in JSON format (return ONLY valid JSON):
{
  "competitors": [
    {
      "name": "Competitor name",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "recentActivity": [
        {
          "platform": "instagram|facebook|linkedin",
          "content": "What they posted",
          "engagement": "high|medium|low",
          "sentiment": "positive|neutral|negative"
        }
      ],
      "opportunities": ["How you can differentiate"],
      "threatLevel": "high|medium|low"
    }
  ],
  "marketGaps": ["Gap 1 you can exploit", "Gap 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

  try {
    if (!GROQ_API_KEY) {
      return getDefaultCompetitorData(competitors);
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a competitive analysis AI. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return getDefaultCompetitorData(competitors);
    }

    let aiContent = data.choices?.[0]?.message?.content || '';
    
    // Clean markdown
    if (aiContent.startsWith('```')) {
      aiContent = aiContent.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(aiContent.trim());
  } catch (error) {
    console.error('Competitor analysis error:', error);
    return getDefaultCompetitorData(competitors);
  }
}

/**
 * Generate campaign suggestions using AI
 */
async function generateCampaignSuggestions(user, count = 3) {
  const businessProfile = user.businessProfile || {};
  
  const prompt = `Generate ${count} creative marketing campaign ideas for:

Business: ${businessProfile.name || 'A business'}
Industry: ${businessProfile.industry || 'General'}
Target Audience: ${businessProfile.targetAudience || 'General consumers'}
Brand Voice: ${businessProfile.brandVoice || 'Professional'}
Goals: ${(businessProfile.marketingGoals || ['Brand awareness']).join(', ')}

Return JSON only:
{
  "campaigns": [
    {
      "id": "unique-id",
      "name": "Creative campaign name",
      "tagline": "Catchy tagline",
      "objective": "awareness|engagement|traffic|sales",
      "platforms": ["instagram", "facebook"],
      "description": "Detailed campaign description",
      "contentIdeas": ["Content idea 1", "Content idea 2"],
      "estimatedBudget": { "min": 100, "max": 500, "currency": "USD" },
      "duration": "1 week|2 weeks|1 month",
      "expectedResults": "What to expect",
      "keyMessages": ["Message 1", "Message 2"]
    }
  ]
}`;

  try {
    if (!GROQ_API_KEY) {
      return { campaigns: getDefaultCampaigns(businessProfile) };
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a creative marketing strategist. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1500
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { campaigns: getDefaultCampaigns(businessProfile) };
    }

    let aiContent = data.choices?.[0]?.message?.content || '';
    if (aiContent.startsWith('```')) {
      aiContent = aiContent.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(aiContent.trim());
  } catch (error) {
    console.error('Campaign suggestions error:', error);
    return { campaigns: getDefaultCampaigns(businessProfile) };
  }
}

// Default data fallbacks
function getDefaultDashboardData(businessProfile) {
  const industry = businessProfile.industry || 'your industry';
  const audience = businessProfile.targetAudience || 'your audience';
  
  return {
    suggestedActions: [
      { id: '1', title: 'Create your first campaign', description: `Start engaging with ${audience}`, type: 'campaign', priority: 'high' },
      { id: '2', title: 'Connect social accounts', description: 'Link your social media for better insights', type: 'social', priority: 'high' },
      { id: '3', title: 'Define your competitors', description: 'Add competitors to track their activity', type: 'social', priority: 'medium' }
    ],
    competitorInsights: [
      { id: 'c1', competitorName: 'Industry Leader', platform: 'instagram', content: 'Engaging content about ' + industry, sentiment: 'positive', likes: 500, comments: 45, insight: 'Strong visual branding' }
    ],
    trendingTopics: [
      { id: 't1', title: 'AI in Marketing', description: 'Leverage AI for personalized content', category: 'Technology', relevanceScore: 0.9 },
      { id: 't2', title: 'Short-form Video', description: 'Reels and TikTok continue to dominate', category: 'Content', relevanceScore: 0.85 }
    ],
    campaignIdeas: [
      { id: 'camp1', name: 'Brand Awareness Push', objective: 'awareness', platforms: ['instagram', 'facebook'], description: `Introduce your brand to ${audience}`, estimatedBudget: '$200-$500' }
    ],
    brandScoreFactors: {
      engagement: { score: 50, reason: 'Start posting to build engagement' },
      consistency: { score: 50, reason: 'Maintain regular posting schedule' },
      audienceGrowth: { score: 50, reason: 'Focus on growing followers' },
      contentQuality: { score: 50, reason: 'Create high-quality content' }
    },
    personalizedTips: [
      `Focus on ${audience} pain points in your content`,
      `Use industry hashtags to increase visibility in ${industry}`,
      'Post consistently at optimal times for your audience'
    ],
    generatedAt: new Date().toISOString()
  };
}

function getDefaultCompetitorData(competitors) {
  return {
    competitors: competitors.map((name, idx) => ({
      name,
      strengths: ['Strong brand presence', 'Active social media'],
      weaknesses: ['Limited engagement', 'Inconsistent posting'],
      recentActivity: [{ platform: 'instagram', content: 'Recent post', engagement: 'medium', sentiment: 'neutral' }],
      opportunities: ['Differentiate with unique content'],
      threatLevel: idx === 0 ? 'high' : 'medium'
    })),
    marketGaps: ['Personalized customer experience', 'Niche content'],
    recommendations: ['Focus on your unique value proposition', 'Engage more with your community']
  };
}

function getDefaultCampaigns(businessProfile) {
  return [
    {
      id: 'default-1',
      name: 'Launch Campaign',
      tagline: 'Introducing something new',
      objective: 'awareness',
      platforms: ['instagram', 'facebook'],
      description: `A campaign to introduce your ${businessProfile.industry || 'business'} to new audiences`,
      contentIdeas: ['Behind-the-scenes content', 'Product showcase'],
      estimatedBudget: { min: 100, max: 300, currency: 'USD' },
      duration: '2 weeks',
      expectedResults: 'Increased brand awareness'
    }
  ];
}

/**
 * Generate AI-powered synopsis for a dashboard section
 * @param {Object} params - Section data and context
 * @returns {Object} - AI synopsis with insights
 */
async function generateSectionSynopsis(params) {
  const { section, data, businessProfile, previousData } = params;
  
  // Map frontend camelCase section names to backend format
  const sectionMap = {
    'activeCampaigns': 'active_campaigns',
    'budgetSpent': 'budget_spent',
    'brandScore': 'brand_score',
    'competitorRadar': 'competitor_radar',
    'recommendedActions': 'suggested_actions',
    'calendar': 'calendar'
  };
  
  const normalizedSection = sectionMap[section] || section;
  
  const sectionPrompts = {
    'budget_spent': `Analyze the marketing budget data:
Current spend: $${data?.total || data?.current || 0}
Daily data: ${JSON.stringify(data?.dailyData || [])}

Provide a JSON response with:
{
  "synopsis": "2-3 sentence analysis of spending patterns and efficiency",
  "insights": ["insight 1", "insight 2"],
  "trend": "up" or "down" or "stable"
}`,

    'active_campaigns': `Analyze the campaign activity:
Active campaigns: ${data?.count || 0}
Change from last period: ${data?.change || 0}%

Provide a JSON response with:
{
  "synopsis": "2-3 sentence analysis of campaign activity and visibility",
  "insights": ["insight 1", "insight 2"],
  "trend": "up" or "down" or "stable"
}`,

    'brand_score': `Analyze the brand score:
Current score: ${data?.score || 0}/100
Change: ${data?.change || 0}%
Factors: ${JSON.stringify(data?.factors || {})}

Provide a JSON response with:
{
  "synopsis": "2-3 sentence analysis of brand health and key factors",
  "insights": ["insight 1", "insight 2"],
  "trend": "up" or "down" or "stable"
}`,

    'competitor_radar': `Analyze competitor activity:
Current competitor: ${data?.current?.competitorName || 'Unknown'}
Total competitors tracked: ${data?.competitors?.length || 0}
Recent post: ${data?.current?.content || 'N/A'}
Sentiment: ${data?.current?.sentiment || 'neutral'}

Provide a JSON response with:
{
  "synopsis": "2-3 sentence analysis of competitor activity and opportunities",
  "insights": ["insight 1", "insight 2"],
  "trend": "up" or "down" or "stable"
}`,

    'suggested_actions': `Analyze the AI recommendations:
Actions: ${JSON.stringify(data?.actions?.slice(0, 3) || [])}

Provide a JSON response with:
{
  "synopsis": "2-3 sentence analysis of why these actions matter",
  "insights": ["insight 1", "insight 2"],
  "trend": "up" or "down" or "stable"
}`,

    'calendar': `Analyze the content calendar:
Campaigns: ${data?.campaigns?.length || 0} scheduled
Current week: ${data?.currentWeek || 'This week'}

Provide a JSON response with:
{
  "synopsis": "2-3 sentence analysis of content scheduling and consistency",
  "insights": ["insight 1", "insight 2"],
  "trend": "up" or "down" or "stable"
}`
  };

  const prompt = sectionPrompts[normalizedSection] || `Analyze this marketing data and provide a JSON response with synopsis, insights array, and trend (up/down/stable): ${JSON.stringify(data)}`;

  const businessContext = businessProfile ? `
For context, this is for a ${businessProfile.industry || 'general'} business targeting ${businessProfile.targetAudience || 'general consumers'} with goals: ${(businessProfile.marketingGoals || []).join(', ') || 'brand awareness'}.
` : '';

  try {
    if (!GROQ_API_KEY) {
      return getDefaultSynopsis(normalizedSection, data);
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { 
            role: 'system', 
            content: `You are a marketing analytics AI providing brief, actionable insights. Always respond with valid JSON only, no markdown. ${businessContext}` 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', result);
      return getDefaultSynopsis(normalizedSection, data);
    }

    const aiContent = result.choices?.[0]?.message?.content?.trim();
    
    // Parse JSON response
    let parsed;
    try {
      let cleanedContent = aiContent;
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      parsed = JSON.parse(cleanedContent.trim());
    } catch (parseError) {
      // If JSON parsing fails, use the raw text as synopsis
      return {
        success: true,
        synopsis: aiContent || getDefaultSynopsis(normalizedSection, data).synopsis,
        insights: [],
        trend: 'stable',
        section: normalizedSection,
        generatedAt: new Date().toISOString(),
        aiPowered: true
      };
    }
    
    return {
      success: true,
      synopsis: parsed.synopsis || aiContent,
      insights: parsed.insights || [],
      trend: parsed.trend || 'stable',
      section: normalizedSection,
      generatedAt: new Date().toISOString(),
      aiPowered: true
    };

  } catch (error) {
    console.error('Synopsis generation error:', error);
    return getDefaultSynopsis(section, data);
  }
}

/**
 * Get default synopsis when AI is unavailable
 */
function getDefaultSynopsis(section, data) {
  const defaults = {
    'budget_spent': {
      synopsis: `Your marketing spend of $${data?.total || data?.current || 0} shows ${(data?.change || 0) > 0 ? 'increased investment' : 'steady spending'}. ${(data?.change || 0) > 10 ? 'Consider monitoring ROI closely.' : 'There may be room to scale successful campaigns.'}`,
      insights: ['Track your cost per acquisition', 'Compare spend across platforms'],
      trend: (data?.change || 0) > 0 ? 'up' : 'stable'
    },
    'active_campaigns': {
      synopsis: `You have ${data?.count || 0} active campaigns. ${(data?.count || 0) > 2 ? 'Good activity level - ensure you can manage quality across all.' : 'Consider launching more campaigns to increase visibility.'}`,
      insights: ['Monitor campaign performance daily', 'A/B test your top performers'],
      trend: (data?.count || 0) > 2 ? 'up' : 'stable'
    },
    'brand_score': {
      synopsis: `Your brand score of ${data?.score || 50}/100 indicates ${(data?.score || 50) > 70 ? 'strong' : (data?.score || 50) > 50 ? 'moderate' : 'developing'} brand health. Focus on ${(data?.engagement || 50) < 60 ? 'engagement' : 'consistency'} to improve further.`,
      insights: ['Engage more with your audience', 'Post consistently at optimal times'],
      trend: (data?.change || 0) > 0 ? 'up' : (data?.change || 0) < 0 ? 'down' : 'stable'
    },
    'competitor_radar': {
      synopsis: `Tracking competitor activity helps you stay ahead. ${data?.current?.competitorName ? `${data.current.competitorName} shows ${data.current.sentiment || 'neutral'} sentiment.` : 'Monitor competitors regularly for opportunities.'}`,
      insights: ['Identify content gaps to fill', 'Learn from competitor successes'],
      trend: 'stable'
    },
    'suggested_actions': {
      synopsis: `${data?.actions?.length || 0} actions recommended to optimize your marketing. Start with the highest priority items for maximum impact.`,
      insights: ['Focus on quick wins first', 'Track progress on each action'],
      trend: 'up'
    },
    'calendar': {
      synopsis: `Your content calendar helps maintain posting consistency. ${data?.campaigns?.length || 0} campaigns are scheduled for optimal timing.`,
      insights: ['Plan content 2 weeks ahead', 'Use best posting times for each platform'],
      trend: 'stable'
    }
  };

  const defaultData = defaults[section] || {
    synopsis: 'Analysis in progress. Check back soon for insights.',
    insights: [],
    trend: 'stable'
  };

  return {
    success: true,
    synopsis: defaultData.synopsis,
    insights: defaultData.insights,
    trend: defaultData.trend,
    section,
    generatedAt: new Date().toISOString(),
    aiPowered: false
  };
}

/**
 * Get section info descriptions
 */
function getSectionInfo(section) {
  const info = {
    'budget_spent': {
      title: 'Budget Spent',
      description: 'This shows the total amount you have spent on marketing campaigns across all connected social media platforms and ad networks. It includes paid promotions, boosted posts, and advertising spend.',
      metrics: ['Total ad spend', 'Boosted post costs', 'Promotion expenses'],
      tip: 'Track your spend against conversions to measure ROI effectively.'
    },
    'active_campaigns': {
      title: 'Active Campaigns',
      description: 'The number of marketing campaigns currently running or scheduled across your connected platforms. This includes both organic content campaigns and paid advertising campaigns.',
      metrics: ['Running campaigns', 'Scheduled posts', 'Ongoing promotions'],
      tip: 'Maintain 2-4 active campaigns for optimal engagement without audience fatigue.'
    },
    'brand_score': {
      title: 'AI Brand Score',
      description: 'A comprehensive AI-calculated metric (0-100) measuring your overall brand health based on engagement rates, content consistency, audience growth, and campaign performance across all platforms.',
      metrics: ['Engagement Rate (30%)', 'Content Consistency (25%)', 'Audience Growth (25%)', 'Campaign Performance (20%)'],
      tip: 'Aim for a score above 70 for strong brand presence.'
    },
    'competitor_radar': {
      title: 'Competitor Radar',
      description: 'Monitors and analyzes your competitors\' social media activity, including their recent posts, engagement levels, and content strategies to help you stay competitive.',
      metrics: ['Post frequency', 'Engagement rates', 'Content themes', 'Audience sentiment'],
      tip: 'Use competitor insights to identify gaps and opportunities in your strategy.'
    },
    'suggested_actions': {
      title: 'AI Recommended Actions',
      description: 'AI-generated marketing recommendations based on your business profile, current performance, and industry trends. Actions are prioritized by potential impact and effort required.',
      metrics: ['Priority level', 'Expected impact', 'Effort required', 'Relevance score'],
      tip: 'Focus on high-priority actions first for maximum ROI.'
    },
    'calendar': {
      title: 'Content Calendar',
      description: 'A weekly view of your scheduled and posted content across all platforms. Helps you visualize your content distribution and maintain consistent posting schedules.',
      metrics: ['Scheduled posts', 'Posted content', 'Platform distribution', 'Time slots'],
      tip: 'Aim for consistent posting times when your audience is most active.'
    }
  };

  return info[section] || {
    title: section,
    description: 'Information about this section.',
    metrics: [],
    tip: 'Check back for more insights.'
  };
}

module.exports = {
  generatePersonalizedDashboard,
  generateCompetitorAnalysis,
  generateCampaignSuggestions,
  generateSectionSynopsis,
  getSectionInfo
};
