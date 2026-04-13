const Plan = require('../models/Plan');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Tableau de bord touriste : affiche la liste des plans disponibles.
 */
exports.getDashboard = async (req, res) => {
  try {
    const plans = await Plan.findAll();
    res.render('touriste/dashboard', {
      user: req.session.user,
      plans
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

/**
 * Affiche la liste des conversations du touriste.
 */
exports.getMessages = async (req, res) => {
  const touristeId = req.session.user.id;

  try {
    // Récupérer toutes les conversations du touriste
    const guides = await User.findGuidesWithConversations(touristeId);
    
    res.render('touriste/messages', {
      user: req.session.user,
      guides
    });
  } catch (err) {
    console.error('Erreur chargement messages touriste:', err);
    res.status(500).send('Erreur serveur');
  }
};