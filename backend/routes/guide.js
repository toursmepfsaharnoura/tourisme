const express = require('express');
const router = express.Router();
const guideController = require('../controllers/guideController');
const planController = require('../controllers/planController');
const abonnementController = require('../controllers/abonnementController');
const avisController = require('../controllers/avisController');
const reservationController = require('../controllers/reservationController');
const guidesService = require('../services/guidesService');
const { verifGuide, checkGuideValidated } = require('../middlewares/auth'); // ou middlewares selon le nom
const upload = require('../middlewares/upload');

// === PUBLIC API ROUTES (No authentication required) ===

// Récupérer tous les guides certifiés
router.get('/all', async (req, res) => {
  try {
    const guides = await guidesService.getAllGuides();
    res.json({
      success: true,
      count: guides.length,
      guides: guides
    });
  } catch (error) {
    console.error('Get all guides error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des guides'
    });
  }
});

// Récupérer les guides par spécialité
router.get('/specialite/:specialite', async (req, res) => {
  try {
    const guides = await guidesService.getGuidesBySpecialite(req.params.specialite);
    res.json({
      success: true,
      count: guides.length,
      guides: guides
    });
  } catch (error) {
    console.error('Get guides by specialite error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche par spécialité'
    });
  }
});

// Récupérer les guides par gouvernorat
router.get('/gouvernorat/:gouvernoratId', async (req, res) => {
  try {
    const guides = await guidesService.getGuidesByGouvernorat(req.params.gouvernoratId);
    res.json({
      success: true,
      count: guides.length,
      guides: guides
    });
  } catch (error) {
    console.error('Get guides by gouvernorat error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche par gouvernorat'
    });
  }
});

// === AUTHENTICATED GUIDE ROUTES ===
// Middleware pour routes authentifiées
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

router.get('/upload-docs', guideController.getUploadDocs);
router.post('/upload-docs', upload.docs.fields([{ name: 'cv', maxCount: 1 }, { name: 'diplome', maxCount: 1 }]), guideController.uploadDocs);

// Supporter l'ancienne URL pour compatibilité
router.get('/documents/upload', guideController.getUploadDocs);
router.post('/documents/upload', upload.docs.fields([{ name: 'cv', maxCount: 1 }, { name: 'diplome', maxCount: 1 }]), guideController.uploadDocs);

// Avis routes
router.get('/avis', avisController.getGuideAvis);
router.put('/avis/:id', avisController.updateAvis);
router.delete('/avis/:id', avisController.deleteAvis);

// Reservations routes
router.get('/reservations', reservationController.getGuideReservations);
router.put('/reservations/:id/status', reservationController.updateReservationStatus);
router.delete('/reservations/:id', reservationController.cancelReservation);

// Notifications redirect - pour compatibilité avec /guide/notifications/:id
router.get('/notifications/:id', (req, res) => {
  res.redirect('/notifications');
});

// === PUBLIC API ROUTES (continued) ===
// Récupérer un guide par ID (must come after specific routes)
router.get('/:id', async (req, res) => {
  try {
    const guide = await guidesService.getGuideById(req.params.id);
    
    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'Guide non trouvé'
      });
    }

    res.json({
      success: true,
      guide: guide
    });
  } catch (error) {
    console.error('Get guide by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du guide'
    });
  }
});

module.exports = router;