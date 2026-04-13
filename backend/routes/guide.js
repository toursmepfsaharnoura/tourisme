const express = require('express');
const router = express.Router();
const guideController = require('../controllers/guideController');
const planController = require('../controllers/planController');
const abonnementController = require('../controllers/abonnementController');
const { verifGuide, checkGuideValidated } = require('../middlewares/auth'); // ou middlewares selon le nom
const upload = require('../middlewares/upload');
router.use(verifGuide);

router.get('/dashboard', guideController.getDashboard);          // ligne ~10
router.get('/profile', guideController.getProfile);
router.post('/profile/update', guideController.updateProfile);
router.post('/profile/photo', upload.photo.single('photo'), guideController.uploadPhoto);

router.get('/abonnement', checkGuideValidated, abonnementController.getSubscription);
router.post('/abonnement/activate', checkGuideValidated, abonnementController.activateSubscription);
router.get('/paiement', abonnementController.getPayment);
router.post('/paiement', abonnementController.processPayment);
router.post('/abonnement/cancel', abonnementController.cancelSubscription);
router.get('/abonnement/history', abonnementController.getSubscriptionHistory);

router.get('/plans', planController.getGuidePlans);
router.get('/create-plan', planController.getNewPlan);
router.post('/create-plan', planController.createPlan);
router.put('/plans/:id', planController.updatePlan);
router.delete('/plans/:id', planController.deletePlan);

// Routes de messagerie spécifiques aux guides
router.get('/messages', guideController.getMessages);                 // Messages avec l'admin (URL principale)
router.get('/admin-messages', guideController.getMessages);           // Messages avec l'admin (URL alternative)
router.post('/send-message', guideController.sendMessage);            // Envoyer message à l'admin (URL principale)
router.post('/admin-messages/send', guideController.sendMessage);      // Envoyer à l'admin (URL alternative)
router.post('/notifications/read', guideController.markNotificationsRead);
router.get('/notifications/refresh', guideController.refreshNotifications);

router.get('/upload-docs', guideController.getUploadDocs);
router.post('/upload-docs', upload.docs.fields([{ name: 'cv', maxCount: 1 }, { name: 'diplome', maxCount: 1 }]), guideController.uploadDocs);

// Supporter l'ancienne URL pour compatibilité
router.get('/documents/upload', guideController.getUploadDocs);
router.post('/documents/upload', upload.docs.fields([{ name: 'cv', maxCount: 1 }, { name: 'diplome', maxCount: 1 }]), guideController.uploadDocs);

module.exports = router;