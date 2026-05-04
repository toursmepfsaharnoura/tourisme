const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifAdmin } = require('../middlewares/auth');

router.use(verifAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/cv-attente', adminController.getCvAttente);
router.post('/cv/:id/approve', adminController.approveCv);
router.get('/guides-docs', adminController.getGuidesDocs);
router.post('/guides-docs/:id/approve', adminController.acceptDocs);
router.post('/guides-docs/:id/reject', adminController.refuseDocs);
router.post('/guide/:id/:action', adminController.toggleGuideStatus);
router.get('/messages', adminController.getMessagesList);

router.get('/messages/:guideId', adminController.getConversation);
router.post('/messages/:guideId', adminController.sendMessage);
router.get('/messages/:guideId/refresh', adminController.refreshConversation);

// API routes for AJAX calls
router.get('/api/messages/:guideId', adminController.getMessagesApi);
router.post('/send-message', adminController.sendMessageApi);

// Route de test pour créer des messages exemples
router.get('/create-test-messages', adminController.createTestMessages);

// Routes pour répondre aux messages des guides
router.get('/reply-message', adminController.getReplyForm);
router.post('/reply-message', adminController.replyToGuide);

// Notifications management
router.get('/notifications', (req, res) => {
  res.render('admin/notifications');
});

// Guides management
router.get('/guides-management', (req, res) => {
  res.render('admin/guides-management');
});

// Reservations management
router.get('/reservations', adminController.getReservations);
router.get('/reservations/:id/view', adminController.viewReservation);
router.delete('/reservations/:id/delete', adminController.deleteReservation);

module.exports = router;