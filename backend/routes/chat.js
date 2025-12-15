const express = require('express');
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System prompt for the marketing assistant
const SYSTEM_PROMPT = `You are Nebulaa AI, an intelligent marketing assistant. You help users with:
- Social media marketing strategies
- Content creation and campaign ideas
- Analytics and performance insights
- Platform-specific best practices (Instagram, Facebook, Twitter, LinkedIn, YouTube, TikTok)
- Influencer marketing guidance
- Competitor analysis
- Brand voice and messaging

Be helpful, concise, and actionable. Use emojis sparingly to keep responses friendly.
If asked about something outside marketing, politely redirect to marketing topics.
Keep responses under 150 words unless more detail is specifically requested.`;

// Chat completion endpoint
router.post('/message', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Chat service not configured'
      });
    }

    // Build messages array
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', data);
      return res.status(500).json({
        success: false,
        message: 'Failed to get response from AI'
      });
    }

    const aiResponse = data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.';

    res.json({
      success: true,
      response: aiResponse,
      usage: data.usage
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Quick suggestions endpoint
router.get('/suggestions', (req, res) => {
  const suggestions = [
    "How can I improve my Instagram engagement?",
    "What's the best time to post on social media?",
    "Help me create a content calendar",
    "How do I analyze my competitors?",
    "Tips for growing my YouTube channel"
  ];

  res.json({
    success: true,
    suggestions
  });
});

module.exports = router;
