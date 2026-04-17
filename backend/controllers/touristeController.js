const Plan = require('../models/Plan');
const Avis = require('../models/Avis');
const Message = require('../models/Message');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

/**
 * Tableau de bord touriste : affiche la liste des guides et plans disponibles.
 */
exports.getDashboard = async (req, res) => {
  try {
    const plans = await Plan.findAllWithDetails();
    const guideIds = [...new Set(plans.map(plan => plan.id_guide))];

    const guideRatings = await Avis.getSummaryForGuides(guideIds);
    const ratingByGuide = guideRatings.reduce((acc, row) => {
      acc[row.id_guide] = {
        moyenne: row.moyenne ? Number(row.moyenne.toFixed(1)) : 0,
        total: row.total || 0
      };
      return acc;
    }, {});

    const guides = Object.values(plans.reduce((acc, plan) => {
      if (!acc[plan.id_guide]) {
        acc[plan.id_guide] = {
          id: plan.id_guide,
          nom: plan.guide_nom,
          email: plan.guide_email,
          photo_profil: plan.guide_photo,
          statut: plan.guide_statut,
          abonnement: plan.guide_abonnement,
          avis: ratingByGuide[plan.id_guide] || { moyenne: 0, total: 0 },
          plans: []
        };
      }
      acc[plan.id_guide].plans.push(plan);
      return acc;
    }, {}));

    const plansCount = guides.reduce((count, guide) => count + guide.plans.length, 0);

    const reservations = await Reservation.findByTourist(req.session.user.id);
    const enrichedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const plan = await Plan.findById(reservation.id_plan);
        return { ...reservation, plan };
      })
    );

    res.render('touriste/dashboard', {
      title: 'Dashboard Touriste',
      user: req.session.user,
      guides,
      plansCount,
      reservations: enrichedReservations
    });
  } catch (err) {
    console.error('Erreur dashboard touriste:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Affiche la conversation avec un guide spécifique.
 */
exports.getChat = async (req, res) => {
  const touristeId = req.session.user.id;
  const guideId = req.params.guideId;

  try {
    const messages = await Message.findConversation(touristeId, guideId);
    // On peut marquer les messages comme lus si nécessaire
    await Message.markAsRead(guideId, touristeId);

    res.render('touriste/chat', {
      user: req.session.user,
      messages,
      id_guide: guideId
    });
  } catch (err) {
    console.error('Erreur chargement chat:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Envoie un message du touriste vers un guide.
 */
exports.postChat = async (req, res) => {
  const touristeId = req.session.user.id;
  const guideId = req.params.guideId;
  const contenu = req.body.contenu;

  try {
    await Message.create({
      id_expediteur: touristeId,
      id_destinataire: guideId,
      contenu
    });

    // Optionnel : créer une notification pour le guide
    // await Notification.create({ id_utilisateur: guideId, type: 'MESSAGE', contenu: 'Nouveau message d\'un touriste' });

    res.redirect(`/touriste/chat/${guideId}`);
  } catch (err) {
    console.error('Erreur envoi message touriste:', err);
    res.status(500).send('Erreur serveur');
  }
};