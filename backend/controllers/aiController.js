const unifiedAIService = require('../services/unifiedAIService');

/**
 * AI Controller - Handle AI-related requests
 */
class AIController {
  /**
   * Display AI chat page (public)
   */
  async showChatPage(req, res) {
    try {
      res.render('ai/chat-public', {
        title: 'AI Assistant - Tourism Tunisia',
        user: req.session.user || null,
        layout: 'main'
      });
    } catch (error) {
      console.error('Error rendering AI chat page:', error);
      res.status(500).render('error', {
        message: 'Unable to load AI chat',
        error: error.message
      });
    }
  }

  /**
   * Display AI chat page (protected for logged-in users)
   */
  async showChatPageProtected(req, res) {
    try {
      res.render('ai/chat', {
        title: 'AI Assistant - Tourism Tunisia',
        user: req.session.user || null,
        layout: 'main'
      });
    } catch (error) {
      console.error('Error rendering AI chat page:', error);
      res.status(500).render('error', {
        message: 'Unable to load AI chat',
        error: error.message
      });
    }
  }

  /**
   * Display AI interactive chat page (enhanced with navigation)
   */
  async showChatInteractive(req, res) {
    try {
      res.render('ai/chat-interactive', {
        title: 'Smart Tourism Assistant - Interactive',
        user: req.session.user || null,
        layout: 'main'
      });
    } catch (error) {
      console.error('Error rendering AI interactive chat page:', error);
      res.status(500).render('error', {
        message: 'Unable to load AI interactive chat',
        error: error.message
      });
    }
  }

  /**
   * Process user message and return AI response (public)
   */
  async askQuestion(req, res) {
    try {
      const { message } = req.body;

      // Validation
      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      if (message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message cannot be empty'
        });
      }

      if (message.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Message too long (max 1000 characters)'
        });
      }

      // Get Unified AI response (RAG + Context)
      const unifiedResponse = await unifiedAIService.askUnified(message.trim());

      // Return success response with rich metadata
      res.json({
        success: true,
        response: unifiedResponse.response,
        type: unifiedResponse.type,
        approach: unifiedResponse.approach,
        hasData: unifiedResponse.hasData,
        sources: unifiedResponse.sources,
        contextUsed: unifiedResponse.contextUsed,
        timestamp: new Date().toISOString(),
        user: req.session.user || null
      });

    } catch (error) {
      console.error('Error in AI askQuestion:', error);
      
      let statusCode = 500;
      let errorMessage = 'An error occurred while processing your request';

      if (error.message.includes('Invalid API key')) {
        statusCode = 500;
        errorMessage = 'AI service configuration error';
      } else if (error.message.includes('Rate limit')) {
        statusCode = 429;
        errorMessage = 'Too many requests - please wait a moment';
      } else if (error.message.includes('timeout')) {
        statusCode = 408;
        errorMessage = 'Request timeout - please try again';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Process user message and return AI response (protected for logged-in users)
   */
  async askQuestionProtected(req, res) {
    // Same logic but with user session tracking
    return this.askQuestion(req, res);
  }

  /**
   * Check AI service status
   */
  async checkStatus(req, res) {
    try {
      const isValid = await unifiedAIService.validateAPIKey();
      const statistics = await unifiedAIService.getStatistics();
      
      res.json({
        success: true,
        status: isValid ? 'online' : 'offline',
        message: isValid ? 'Unified AI (RAG + Context) is ready' : 'AI service configuration issue',
        statistics: statistics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'error',
        message: 'Unable to check AI service status'
      });
    }
  }
}

module.exports = new AIController();
