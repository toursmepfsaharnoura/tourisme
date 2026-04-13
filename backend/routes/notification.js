const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');

// API ONLY
router.get('/', controller.getAdminNotifications);

// Routes pour les notifications guides
router.post('/sendToGuide', controller.sendToGuide);
router.post('/sendToAllGuides', controller.sendToAllGuides);

// Page des notifications pour les guides
router.get('/guide', controller.getGuideNotifications);

module.exports = router;