const express = require('express');
const router = express.Router();
const accueilController = require('../controllers/accueilController');

router.get('/search-suggestions', accueilController.getSearchSuggestions);

module.exports = router;
