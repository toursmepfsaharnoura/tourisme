const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifAdmin } = require('../middlewares/auth');

router.use(verifAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/cv-attente', adminController.getCvAttente);
router.post('/cv/:id/approve', adminController.approveCv);
router.get('/guides-docs', adminController.getGuidesDocs);
router.get('/accept-docs/:id', adminController.acceptDocs);
router.get('/refuse-docs/:id', adminController.refuseDocs);
router.post('/guide/:id/:action', adminController.toggleGuideStatus);
router.get('/messages', adminController.getMessagesList);
router.get('/messages/', adminController.getMessagesList); // Handle trailing slash
router.get('/messages/:guideId', adminController.getConversation);
router.post('/messages/:guideId', adminController.sendMessage);
router.get('/messages/:guideId/refresh', adminController.refreshConversation);

// Chat routes
router.get('/chat', adminController.getChatList);
router.get('/chat/:guideId', adminController.getChatWithGuide);
router.post('/chat/:guideId/send', adminController.sendMessageToGuide);

// Routes pour répondre aux messages des guides
router.get('/reply-message', adminController.getReplyForm);
router.post('/reply-message', adminController.replyToGuide);

module.exports = router;