const express = require('express');
const router = express.Router();
const accueilController = require('../controllers/accueilController');
const delegationController = require('../controllers/delegationController');
const authController = require('../controllers/authController');
const planController = require('../controllers/planController');

// Modern homepage routes
router.get('/', accueilController.getAccueil);
router.get('/search', accueilController.getSearch);

// Public delegation detail page
router.get('/delegation/:id', delegationController.getDelegationDetail);

// Legacy routes
router.get('/accueil', accueilController.getAccueil);
router.get('/guides', accueilController.getGuides);
router.get('/inscription', authController.getRegister);
router.post('/inscription', authController.postInscription);
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/verification', authController.getVerification);
router.post('/verification', authController.postVerification);
router.get('/logout', authController.logout);

// Plans Public Routes
router.get('/plans', planController.getAllPlans);
router.get('/plans/:id', planController.getPlanForView);

module.exports = router;