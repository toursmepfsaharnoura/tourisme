const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const upload = require('../middlewares/upload');
const { verifGuide, verifTouriste, checkGuideValidated } = require('../middlewares/auth');
const { planImage, planImageOptional } = require('../middlewares/upload');


// =========================
// PUBLIC
// =========================
router.get('/', planController.getAllPlans);
router.get('/plans', planController.getAllPlans);
router.get('/public', planController.getAllPlans);
router.get('/public/:id', planController.getPlanDetails);


// =========================
// GUIDE
// =========================

router.post('/guide/create-plan', planImage.single('image'), planController.createPlan);
router.post('/guide/plans', planImage.single('image'), planController.createPlan);

// Création
router.get('/guide/create-plan', verifGuide, planController.getNewPlan);
router.get('/guide/plans/new', verifGuide, planController.getNewPlan);

router.post('/guide/create-plan', verifGuide, planController.createPlan);
router.post('/guide/plans', verifGuide, planController.createPlan);

// =========================
// 🔥 IMPORTANT (EDIT PAGE)
// =========================
router.get('/guide/plans/:id/edit', verifGuide, planController.getEditPlan);

// Détails
router.get('/guide/plans/:id', verifGuide, planController.getPlanDetails);

// Update
router.put('/guide/plans/:id', verifGuide, checkGuideValidated, planController.updatePlan);

// Delete
router.delete('/guide/plans/:id', verifGuide, checkGuideValidated, planController.deletePlan);

// Edit plan form route
router.get('/guide/plans/:id/edit', verifGuide, checkGuideValidated, planController.getEditPlan);
router.get('/guide/plans/:id/details', verifGuide, checkGuideValidated, planController.getPlanDetails);

// Public plan details
router.get('/plans/:id', planController.getPlanForView);

// Tourist routes
router.get('/touriste/plans', verifTouriste, planController.getAllPlans);
router.get('/touriste/plans/:id', planController.getPlanDetails);


module.exports = router;