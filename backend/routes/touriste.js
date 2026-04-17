const express = require('express');
const router = express.Router();
const touristeController = require('../controllers/touristeController');
const favoriteController = require('../controllers/favoriteController');
const { verifTouriste } = require('../middlewares/auth');

// Public routes (no auth required) - will handle redirects
router.post('/favorites/toggle', favoriteController.toggleFavorite);
router.get('/favorites/check', favoriteController.isFavorite);

// Protected routes
router.use(verifTouriste);

router.get('/dashboard', (req, res) => res.redirect('/touriste/plans'));
router.get('/chat/:guideId', touristeController.getChat);
router.post('/chat/:guideId', touristeController.postChat);
router.get('/favorites', favoriteController.getFavorites);

module.exports = router;