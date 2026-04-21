const Reservation = require('../models/Reservation');
const Paiement = require('../models/paiement');
const Plan = require('../models/Plan');
const User = require('../models/User');
const db = require('../config/db');

/**
 * Show reservation creation form
 */
exports.getCreateReservationForm = async (req, res) => {
  const planId = req.params.planId;
  const touristeId = req.session.user.id;

  try {
    // Get plan details
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).render('404', { message: 'Plan not found' });
    }

    // Get guide info for the plan
    const [guideInfo] = await db.query(
      'SELECT u.nom_complet as guide_nom FROM utilisateurs u JOIN guides g ON u.id = g.id_utilisateur WHERE g.id_utilisateur = ?',
      [plan.id_guide]
    );
    plan.guide_nom = guideInfo ? guideInfo.guide_nom : 'Guide inconnu';

    // Get tourist details
    const tourist = await User.findById(touristeId);

    res.render('touriste/create-reservation', {
      user: req.session.user,
      plan,
      tourist
    });
  } catch (err) {
    console.error('Error getting reservation form:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Create a new reservation and redirect to payment
 */
exports.createReservation = async (req, res) => {
  const touristeId = req.session.user.id;
  const {
    id_plan,
    date_reservation,
    nombre_personnes,
    email_contact,
    telephone_contact,
    message
  } = req.body;

  try {
    const plan = await Plan.findById(id_plan);
    if (!plan) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      return res.status(404).render('404', { message: 'Plan not found' });
    }

    const requestedPeople = parseInt(nombre_personnes, 10);
    if (Number.isNaN(requestedPeople) || requestedPeople <= 0) {
      return res.status(400).json({ error: 'Veuillez saisir un nombre de personnes valide.' });
    }

    if (plan.capacite_max != null && plan.places_restantes != null && requestedPeople > plan.places_restantes) {
      return res.status(400).json({ error: `Il ne reste plus que ${plan.places_restantes} place${plan.places_restantes > 1 ? 's' : ''}.` });
    }

    req.session.pendingReservation = {
      id_plan,
      date_reservation,
      nombre_personnes: requestedPeople,
      email_contact,
      telephone_contact,
      message,
      plan
    };

    const payUrl = '/touriste/reservations/paiement';

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, payUrl });
    }

    return res.redirect(payUrl);
  } catch (err) {
    console.error('Error creating reservation:', err);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(500).send('Server error');
  }
};

exports.getReservationPaymentPage = async (req, res) => {
  const pending = req.session.pendingReservation;
  if (!pending || !pending.id_plan) {
    return res.redirect('/touriste/plans');
  }

  try {
    res.render('touriste/reservation-payment', {
      user: req.session.user,
      pending,
      totalAmount: pending.plan.prix ? pending.plan.prix * pending.nombre_personnes : 0,
      layout: 'minimal',
      title: 'Paiement de réservation'
    });
  } catch (err) {
    console.error('Error loading payment page:', err);
    res.status(500).send('Server error');
  }
};

exports.completeReservationPayment = async (req, res) => {
  const touristeId = req.session.user.id;
  const pending = req.session.pendingReservation;

  if (!pending || !pending.id_plan) {
    return res.redirect('/touriste/plans');
  }

  try {
    const plan = await Plan.findById(pending.id_plan);
    if (!plan) {
      return res.redirect('/touriste/plans');
    }

    const requestedPeople = parseInt(pending.nombre_personnes, 10);
    if (Number.isNaN(requestedPeople) || requestedPeople <= 0) {
      return res.redirect('/touriste/plans');
    }

    if (plan.capacite_max != null && plan.places_restantes != null && requestedPeople > plan.places_restantes) {
      return res.redirect('/touriste/plans');
    }

    const reservationId = await Reservation.create({
      id_touriste: touristeId,
      id_plan: pending.id_plan,
      date_reservation: pending.date_reservation,
      nombre_personnes: pending.nombre_personnes,
      email_contact: pending.email_contact,
      telephone_contact: pending.telephone_contact,
      message: pending.message,
      statut: 'CONFIRMEE'
    });

    const montant = plan.prix ? plan.prix * pending.nombre_personnes : 0;
    await Paiement.create({
      id_reservation: reservationId,
      montant,
      type: 'reservation',
      statut: 'PAYE'
    });

    delete req.session.pendingReservation;

    return res.redirect('/touriste/reservations');
  } catch (err) {
    console.error('Error completing payment:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Get all reservations for a tourist
 */
exports.getTouristReservations = async (req, res) => {
  const touristeId = req.session.user.id;

  try {
    const reservations = await Reservation.findByTouristPaid(touristeId);
    
    // Enrich with plan details
    const enrichedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const plan = await Plan.findById(reservation.id_plan);
        if (!plan) {
          return {
            ...reservation,
            plan: {
              titre: 'Plan indisponible',
              description: 'Ce circuit a été supprimé ou n’est plus disponible.',
              date_debut: '--',
              date_fin: '--',
              prix: 0,
              guide_nom: 'Guide inconnu'
            }
          };
        }

        const [guideInfo] = await db.query(
          'SELECT u.nom_complet as guide_nom FROM utilisateurs u JOIN guides g ON u.id = g.id_utilisateur WHERE g.id_utilisateur = ?',
          [plan.id_guide]
        );
        plan.guide_nom = guideInfo ? guideInfo.guide_nom : 'Guide inconnu';
        
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
    const reservations = await Reservation.findByGuidePaid(guideId);
    
    // Enrich with plan and tourist details
    const enrichedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const plan = await Plan.findById(reservation.id_plan);
        // Get guide info for the plan
        const [guideInfo] = await db.query(
          'SELECT u.nom_complet as guide_nom FROM utilisateurs u JOIN guides g ON u.id = g.id_utilisateur WHERE g.id_utilisateur = ?',
          [plan.id_guide]
        );
        plan.guide_nom = guideInfo ? guideInfo.guide_nom : 'Guide inconnu';
        
        const tourist = await User.findById(reservation.id_touriste);
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
    const success = await Reservation.updateStatus(reservationId, statut);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Reservation not found' });
    }
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
