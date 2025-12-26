/**
 * Outreach AI Service
 * 
 * AI-powered outreach content generation service.
 * Uses ContextBuilder to ensure all content is personalized
 * based on company context and lead data.
 * 
 * CRITICAL: Never generates generic content. Always requires full context.
 */

const contextBuilder = require('./contextBuilder');
const geminiService = require('./geminiAI');

class OutreachAIService {
  
  /**
   * Generate a cold email for a lead
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {Object} options - Generation options
   * @returns {Object} Generated email with subject and body
   */
  async generateColdEmail(userId, leadId, options = {}) {
    return this.generateContent(userId, leadId, 'cold_email', options);
  }
  
  /**
   * Generate a follow-up email
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {number} followUpNumber - Which follow-up (1, 2, 3...)
   * @param {Object} options - Generation options
   */
  async generateFollowUpEmail(userId, leadId, followUpNumber = 1, options = {}) {
    return this.generateContent(userId, leadId, 'follow_up', {
      ...options,
      customInstructions: `This is follow-up email #${followUpNumber}. ${options.customInstructions || ''}`
    });
  }
  
  /**
   * Generate a breakup/final email
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {Object} options - Generation options
   */
  async generateBreakupEmail(userId, leadId, options = {}) {
    return this.generateContent(userId, leadId, 'breakup', options);
  }
  
  /**
   * Generate a value-add email
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {Object} options - Generation options
   */
  async generateValueAddEmail(userId, leadId, options = {}) {
    return this.generateContent(userId, leadId, 'value_add', options);
  }
  
  /**
   * Generate a meeting request email
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {Object} options - Generation options
   */
  async generateMeetingRequest(userId, leadId, options = {}) {
    return this.generateContent(userId, leadId, 'meeting_request', options);
  }
  
  /**
   * Generate a cold call script
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {Object} options - Generation options
   */
  async generateCallScript(userId, leadId, options = {}) {
    return this.generateContent(userId, leadId, 'call_script', options);
  }
  
  /**
   * Generate LinkedIn connection request
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {Object} options - Generation options
   */
  async generateLinkedInConnection(userId, leadId, options = {}) {
    return this.generateContent(userId, leadId, 'linkedin_connection', options);
  }
  
  /**
   * Generate LinkedIn message
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {Object} options - Generation options
   */
  async generateLinkedInMessage(userId, leadId, options = {}) {
    return this.generateContent(userId, leadId, 'linkedin_message', options);
  }
  
  /**
   * Generate objection handling responses
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID (optional)
   * @param {Object} options - Generation options
   */
  async generateObjectionHandling(userId, leadId = null, options = {}) {
    // For objection handling, lead context is optional
    const companyResult = await contextBuilder.getCompanyContext(userId);
    
    if (!companyResult.success) {
      return {
        success: false,
        error: companyResult.error,
        message: companyResult.message,
        missingFields: companyResult.missingFields
      };
    }
    
    let fullContext = { company: companyResult.context, lead: null };
    
    if (leadId) {
      const leadResult = await contextBuilder.getLeadContext(leadId);
      if (leadResult.success) {
        fullContext.lead = leadResult.context;
      }
    }
    
    const systemPrompt = contextBuilder.buildSystemPrompt(fullContext, 'objection_response');
    
    const userPrompt = `Generate responses to common sales objections for ${companyResult.context.company.name}.
    
Include objections like:
- "It's too expensive"
- "We're already using a competitor"
- "We don't have time for this"
- "I need to talk to my team"
- "Send me some information"
- "We're not interested"

Return as JSON with an "objections" array.`;

    try {
      const response = await geminiService.callGemini(
        `${systemPrompt}\n\n${userPrompt}`,
        { skipCache: true, timeout: 30000 }
      );
      
      const content = this.parseAIResponse(response);
      
      return {
        success: true,
        content,
        contentType: 'objection_response',
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('OutreachAI.generateObjectionHandling error:', error);
      return {
        success: false,
        error: 'GENERATION_FAILED',
        message: 'Failed to generate objection handling responses.',
        details: error.message
      };
    }
  }
  
  /**
   * Core content generation method
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {string} contentType - Type of content to generate
   * @param {Object} options - Generation options
   */
  async generateContent(userId, leadId, contentType, options = {}) {
    console.log(`📝 Generating ${contentType} for lead ${leadId}`);
    
    // Step 1: Build full context
    const contextResult = await contextBuilder.buildFullContext(userId, leadId);
    
    if (!contextResult.success) {
      console.warn(`⚠️ Context building failed: ${contextResult.error}`);
      return {
        success: false,
        error: contextResult.error,
        message: contextResult.message,
        missingFields: contextResult.missingFields
      };
    }
    
    const { context } = contextResult;
    
    // Step 2: Build system prompt with full context
    const systemPrompt = contextBuilder.buildSystemPrompt(context, contentType);
    
    // Step 3: Build user prompt
    const userPrompt = contextBuilder.buildUserPrompt(context, contentType, options);
    
    // Step 4: Call Gemini AI
    try {
      const response = await geminiService.callGemini(
        `${systemPrompt}\n\n${userPrompt}`,
        { skipCache: true, timeout: 30000 }
      );
      
      // Step 5: Parse and validate response
      const content = this.parseAIResponse(response);
      
      return {
        success: true,
        content,
        contentType,
        leadId,
        context: {
          companyName: context.company.company.name,
          leadName: context.lead.personal.fullName,
          leadCompany: context.lead.company.name,
          brandTone: context.company.brandTone
        },
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`OutreachAI.generateContent error:`, error);
      return {
        success: false,
        error: 'GENERATION_FAILED',
        message: 'Failed to generate content. Please try again.',
        details: error.message
      };
    }
  }
  
  /**
   * Generate multiple variations of content
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {string} contentType - Type of content
   * @param {number} variations - Number of variations (1-5)
   * @param {Object} options - Generation options
   */
  async generateVariations(userId, leadId, contentType, variations = 3, options = {}) {
    const numVariations = Math.min(Math.max(1, variations), 5);
    
    // Build context once
    const contextResult = await contextBuilder.buildFullContext(userId, leadId);
    
    if (!contextResult.success) {
      return {
        success: false,
        error: contextResult.error,
        message: contextResult.message
      };
    }
    
    const { context } = contextResult;
    const systemPrompt = contextBuilder.buildSystemPrompt(context, contentType);
    
    const variationPrompt = `Generate ${numVariations} different variations of a ${contentType.replace('_', ' ')} for ${context.lead.personal.fullName} at ${context.lead.company.name}.

Each variation should have a different:
- Hook/opening
- Angle or value proposition focus
- Call to action style

Return as JSON with a "variations" array, each containing the required fields for this content type.

${options.customInstructions || ''}`;

    try {
      const response = await geminiService.callGemini(
        `${systemPrompt}\n\n${variationPrompt}`,
        { skipCache: true, timeout: 45000 }
      );
      
      const content = this.parseAIResponse(response);
      
      return {
        success: true,
        variations: content.variations || [content],
        contentType,
        leadId,
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('OutreachAI.generateVariations error:', error);
      return {
        success: false,
        error: 'GENERATION_FAILED',
        message: 'Failed to generate variations.',
        details: error.message
      };
    }
  }
  
  /**
   * Regenerate content with feedback
   * @param {string} userId - User ID
   * @param {string} leadId - Lead ID
   * @param {string} contentType - Type of content
   * @param {string} previousContent - Previously generated content
   * @param {string} feedback - User feedback for improvement
   */
  async regenerateWithFeedback(userId, leadId, contentType, previousContent, feedback) {
    const contextResult = await contextBuilder.buildFullContext(userId, leadId);
    
    if (!contextResult.success) {
      return {
        success: false,
        error: contextResult.error,
        message: contextResult.message
      };
    }
    
    const { context } = contextResult;
    const systemPrompt = contextBuilder.buildSystemPrompt(context, contentType);
    
    const regeneratePrompt = `Previous content generated:
${JSON.stringify(previousContent, null, 2)}

User feedback for improvement:
"${feedback}"

Please regenerate the ${contentType.replace('_', ' ')} incorporating this feedback while maintaining brand tone and personalization.

Return as JSON with the standard fields for this content type.`;

    try {
      const response = await geminiService.callGemini(
        `${systemPrompt}\n\n${regeneratePrompt}`,
        { skipCache: true, timeout: 30000 }
      );
      
      const content = this.parseAIResponse(response);
      
      return {
        success: true,
        content,
        contentType,
        incorporatedFeedback: feedback,
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('OutreachAI.regenerateWithFeedback error:', error);
      return {
        success: false,
        error: 'GENERATION_FAILED',
        message: 'Failed to regenerate content.',
        details: error.message
      };
    }
  }
  
  /**
   * Parse AI response and extract JSON content
   * @param {string} response - Raw AI response
   * @returns {Object} Parsed content
   */
  parseAIResponse(response) {
    if (!response) {
      throw new Error('Empty response from AI');
    }
    
    // Try to extract JSON from response
    let jsonStr = response;
    
    // Check for markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Try to find JSON object or array
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    
    if (objectMatch) {
      jsonStr = objectMatch[0];
    } else if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
    
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // If JSON parsing fails, return structured text response
      console.warn('Failed to parse JSON, returning text response');
      
      // Try to structure the response
      if (response.includes('Subject:') || response.includes('subject:')) {
        const subjectMatch = response.match(/[Ss]ubject:\s*(.+?)(?:\n|$)/);
        const bodyMatch = response.match(/[Bb]ody:\s*([\s\S]+)/);
        
        return {
          subject: subjectMatch ? subjectMatch[1].trim() : 'Follow up',
          body: bodyMatch ? bodyMatch[1].trim() : response
        };
      }
      
      return { content: response };
    }
  }
  
  /**
   * Validate that onboarding is complete before any generation
   * @param {string} userId - User ID
   * @returns {Object} Validation result
   */
  async validateReadiness(userId) {
    const contextResult = await contextBuilder.getCompanyContext(userId);
    
    if (!contextResult.success) {
      return {
        isReady: false,
        error: contextResult.error,
        message: contextResult.message,
        missingFields: contextResult.missingFields || []
      };
    }
    
    return {
      isReady: true,
      companyName: contextResult.context.company.name,
      brandTone: contextResult.context.brandTone,
      primaryGoal: contextResult.context.goals.primary
    };
  }
}

module.exports = new OutreachAIService();
