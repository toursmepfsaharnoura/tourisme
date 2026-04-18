const express = require('express');
const router = express.Router();
const touristeController = require('../controllers/touristeController');
const { verifTouriste } = require('../middlewares/auth');

router.use(verifTouriste);

router.get('/dashboard', touristeController.getDashboard);
router.get('/messages', touristeController.getMessages);
router.get('/chat/:guideId', touristeController.getChat);
router.post('/chat/:guideId', touristeController.postChat);

module.exports = router;