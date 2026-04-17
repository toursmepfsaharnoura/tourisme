const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { verifTouriste, verifGuide } = require('../middlewares/auth');

// Tourist routes
router.get('/create/:planId', verifTouriste, reservationController.getCreateReservationForm);
router.get('/touriste/reservations', verifTouriste, reservationController.getTouristReservations);
router.post('/touriste/reservations', verifTouriste, reservationController.createReservation);
router.get('/touriste/reservations/paiement', verifTouriste, reservationController.getReservationPaymentPage);
router.post('/touriste/reservations/paiement', verifTouriste, reservationController.completeReservationPayment);
router.post('/touriste/reservations/:id/cancel', verifTouriste, reservationController.cancelReservation);

// Guide routes
router.get('/guide/reservations', verifGuide, reservationController.getGuideReservations);
router.post('/guide/reservations/:id/status', verifGuide, reservationController.updateReservationStatus);

module.exports = router;
