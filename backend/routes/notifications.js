const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifAdmin, verifUser } = require('../middlewares/auth');

// GET notifications page (for guide) - Web interface
router.get('/', verifUser, notificationController.getNotifications);

// GET notifications specifically for admin - API
router.get('/admin', verifAdmin, notificationController.getAdminNotifications);

// GET notifications for API requests (JSON)
router.get('/api', verifUser, notificationController.getNotifications);

// GET unread count
router.get('/unread-count', verifUser, notificationController.getUnreadCount);

// POST mark notification as read
router.post('/mark-read', verifUser, notificationController.markAsRead);

// POST mark all notifications as read
router.post('/mark-all-read', verifUser, notificationController.markAllAsRead);

// POST create new notification (API endpoint)
router.post('/create', verifUser, notificationController.createNotification);

// Admin routes
router.get('/all', verifAdmin, notificationController.getAdminNotifications);
router.post('/create', verifAdmin, notificationController.createNotification);
router.delete('/:id', verifAdmin, notificationController.deleteNotification);
router.put('/read/:id', verifAdmin, notificationController.markAsRead);

// Legacy routes for backward compatibility - MUST be after specific routes
router.get('/user/:userId', verifUser, notificationController.getNotifications);
router.get('/count/:userId', verifUser, notificationController.getUnreadCount);
router.get('/:userId', verifUser, notificationController.getNotifications);

module.exports = router;
