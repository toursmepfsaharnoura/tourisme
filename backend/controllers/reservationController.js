const Reservation = require('../models/Reservation');
const Plan = require('../models/Plan');
const User = require('../models/User');

/**
 * Create a new reservation
 */
exports.createReservation = async (req, res) => {
  const touristeId = req.session.user.id;
  const { id_plan, date_reservation, nombre_personnes } = req.body;

  try {
    // Check if plan exists
    const plan = await Plan.findById(id_plan);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const reservationId = await Reservation.create({
      id_touriste: touristeId,
      id_plan,
      date_reservation,
      nombre_personnes,
      statut: 'EN_ATTENTE'
    });

    res.json({ success: true, reservationId });
  } catch (err) {
    console.error('Error creating reservation:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all reservations for a tourist
 */
exports.getTouristReservations = async (req, res) => {
  const touristeId = req.session.user.id;

  try {
    const reservations = await Reservation.findByTourist(touristeId);
    
    // Enrich with plan details
    const enrichedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const plan = await Plan.findById(reservation.id_plan);
        return { ...reservation, plan };
      })
    );

    res.render('touriste/reservations', {
      user: req.session.user,
      reservations: enrichedReservations
    });
  } catch (err) {
    console.error('Error getting tourist reservations:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Get all reservations for a guide
 */
exports.getGuideReservations = async (req, res) => {
  const guideId = req.session.user.id;

  try {
    const reservations = await Reservation.findByGuide(guideId);
    
    // Enrich with plan and tourist details
    const enrichedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const [plan, tourist] = await Promise.all([
          Plan.findById(reservation.id_plan),
          User.findById(reservation.id_touriste)
        ]);
        return { ...reservation, plan, tourist };
      })
    );

    res.render('guide/reservations', {
      user: req.session.user,
      reservations: enrichedReservations,
      layout: 'main'
    });
  } catch (err) {
    console.error('Error getting guide reservations:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Update reservation status
 */
exports.updateReservationStatus = async (req, res) => {
  const reservationId = req.params.id;
  const { statut } = req.body;

  try {
    await Reservation.update(reservationId, { statut });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating reservation status:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Cancel a reservation
 */
exports.cancelReservation = async (req, res) => {
  const reservationId = req.params.id;
  const userId = req.session.user.id;

  try {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if user owns this reservation
    if (reservation.id_touriste !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Reservation.update(reservationId, { statut: 'ANNULEE' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error canceling reservation:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
