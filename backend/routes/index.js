const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const homePageController = require('../controllers/homePageController');
const delegationController = require('../controllers/delegationController');
const authController = require('../controllers/authController');
const gouvernoratController = require('../controllers/gouvernoratController');

// Modern homepage routes
router.get('/', homePageController.getHomePage);
router.get('/search', homePageController.searchGovernorats);

// Public delegation detail page
router.get('/delegation/:id', delegationController.getDelegationDetail);

// Public governorat details page with delegations
router.get('/gouvernorats/:id', gouvernoratController.getGovernoratWithDelegations);

// Legacy routes
router.get('/accueil', homeController.getAccueil);
router.get('/guides', homeController.getGuides);
router.get('/inscription', authController.getRegister);
router.post('/inscription', authController.postInscription);
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/verification', authController.getVerification);
router.post('/verification', authController.postVerification);
router.get('/logout', authController.logout);

module.exports = router;