const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const upload = require('../middlewares/upload');
const { verifGuide, verifTouriste, checkGuideValidated } = require('../middlewares/auth');


// =========================
// PUBLIC
// =========================
router.get('/', planController.getAllPlans);
router.get('/public', planController.getAllPlans);
router.get('/public/:id', planController.getPlanDetails);


// =========================
// GUIDE
// =========================

// Liste des plans
router.get('/guide/plans', verifGuide, planController.getGuidePlans);

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


// =========================
// LIEUX
// =========================
router.post('/guide/plans/:id/lieux', verifGuide, upload.lieu.single('image'), planController.addLieuToPlan);

router.delete('/guide/plans/:id/lieux/:lieuId', verifGuide, planController.removeLieuFromPlan);


// ❌ نحينا duplication على خاطر ما تحبهاش
// router.post('/guide/plans/:id/duplicate', verifGuide, planController.duplicatePlan);


// =========================
// TOURISTE
// =========================
router.get('/touriste/plans', verifTouriste, planController.getAllPlans);
router.get('/touriste/plans/:id', planController.getPlanDetails);


module.exports = router;