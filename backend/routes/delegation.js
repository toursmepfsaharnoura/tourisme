const express = require('express');
const router = express.Router();
const delegationController = require('../controllers/delegationController');

// Public delegation detail page (sans préfixe delegations)
router.get('/delegation/:id', delegationController.getDelegationDetail);

// API routes
router.get('/delegations', delegationController.getAllDelegations);
router.get('/delegations/:id', delegationController.getDelegation);
// router.get('/gouvernorats/:gouvernoratId/delegations', delegationController.getDelegationsByGovernorate); // Conflit avec gouvernorat.js
router.post('/delegations', delegationController.createDelegation);
router.put('/delegations/:id', delegationController.updateDelegation);
router.delete('/delegations/:id', delegationController.deleteDelegation);

module.exports = router;
