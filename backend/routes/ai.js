const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifUser } = require('../middlewares/auth');

/**
 * AI Routes - Handle AI assistant functionality
 */

// Public AI chat page (no authentication required)
router.get('/chat', aiController.showChatPage);

// Public AI interactive chat page (enhanced with navigation)
router.get('/chat-interactive', aiController.showChatInteractive);

// Public API endpoint for asking questions (no authentication required)
router.post('/ask', aiController.askQuestion);

// Public AI service status (no authentication required)
router.get('/status', aiController.checkStatus);

// Protected AI chat page (for logged-in users with history)
router.get('/chat-protected', verifUser, aiController.showChatPageProtected);

// Protected API endpoint for logged-in users
router.post('/ask-protected', verifUser, aiController.askQuestionProtected);

module.exports = router;
