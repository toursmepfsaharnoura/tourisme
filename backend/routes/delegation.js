const express = require('express');
const router = express.Router();
const delegationController = require('../controllers/delegationController');

// All delegations page
router.get('/', delegationController.getAllDelegations);

// Public delegation detail page (sans préfixe delegations)
router.get('/delegation/:id', delegationController.getDelegationDetail);

// API routes
router.get('/api/delegations', delegationController.getAllDelegationsAPI);
router.get('/delegations/:id', delegationController.getDelegation);
router.get('/gouvernorats/:gouvernoratId/delegations', delegationController.getDelegationsByGovernorate);
router.post('/delegations', delegationController.createDelegation);
router.put('/delegations/:id', delegationController.updateDelegation);
router.delete('/delegations/:id', delegationController.deleteDelegation);

module.exports = router;
