const User = require('../models/User');
const Guide = require('../models/Guide');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Plan = require('../models/Plan');

// Helper function to format notifications
const formatNotifications = (notifications) => {
  return notifications.map(n => {
    let contenu = n.contenu;

    // Try to parse JSON content
    try {
      if (typeof contenu === 'string') {
        contenu = JSON.parse(contenu);
      }
    } catch (e) {
      // Keep as string if parsing fails
    }

    return {
      ...n,
      contenu,
      isObject: typeof contenu === 'object'
    };
  });
};

/**
 * Affiche le tableau de bord administrateur avec statistiques et listes.
 */
exports.getDashboard = async (req, res) => {
  const adminId = req.session.user.id;
  try {
    // Statistiques : requêtes parallèles pour optimisation
    const [guidesActifs, guidesEnAttente, notificationsNonLues, totalPlans] = await Promise.all([
      Guide.findAll('ACTIF'),                      // guides avec statut ACTIF
      Guide.findPending(),                          // guides avec documents en attente
      Notification.getUnreadCount(adminId),
      Plan.findAll().then(plans => plans.length)    // nombre total de plans
    ]);

    // Get notifications by type for tabs
    const [messageNotifications, reservationNotifications, cvNotifications] = await Promise.all([
      Notification.findByType(adminId, 'MESSAGE'),
      Notification.findByType(adminId, 'RESERVATION'),
      Notification.findByType(adminId, 'CV')
    ]);

    // Get user information for messages and format them
    const db = require('../config/db');
    const messageNotificationsWithUsers = await Promise.all(
      messageNotifications.map(async (notification) => {
        const [userRows] = await db.query(
          'SELECT nom_complet, email FROM utilisateurs WHERE id = ?',
          [notification.id_utilisateur]
        );
        return {
          ...notification,
          sender: userRows[0] || { nom_complet: 'Utilisateur inconnu', email: '' }
        };
      })
    );

    // Format all notifications with proper JSON parsing
    const formattedMessages = formatNotifications(messageNotificationsWithUsers);
    const formattedPlans = formatNotifications(reservationNotifications);
    const formattedDocuments = formatNotifications(cvNotifications);

    // 10 derniers guides actifs (avec leurs plans)
    const actifsAvecPlans = await Promise.all(
      guidesActifs.slice(0, 10).map(async (guide) => {
        const plans = await Plan.findByGuide(guide.id);
        return { ...guide, nb_plans: plans.length };
      })
    );

    // Notifications récentes
    const notifications = await Notification.findByUser(adminId, 10);
    const fixedGuidesAttente = guidesEnAttente.map(g => ({
      ...g,
      id: g.id_utilisateur
    }));

    // Prepare notification data for tabs
    const notificationTabs = {
      messages: formattedMessages,
      plans: formattedPlans,
      documents: formattedDocuments,
      unreadCounts: {
        messages: formattedMessages.filter(n => !n.est_vu).length,
        plans: formattedPlans.filter(n => !n.est_vu).length,
        documents: formattedDocuments.filter(n => !n.est_vu).length
      }
    };

    res.render('admin/dashboard', {
      user: req.session.user,
      stats: {
        guides_actifs: guidesActifs.length,
        guides_en_attente: guidesEnAttente.length,
        notifications_non_lues: notificationsNonLues,
        total_plans: totalPlans
      },
      guides_actifs: actifsAvecPlans,
      guides_attente: fixedGuidesAttente,
      notifications,
      notificationTabs,
      layout: 'main'
    });
  } catch (err) {
    console.error('Erreur dashboard admin:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Liste des CV en attente (ancienne route, peut être fusionnée avec guides-docs).
 */
exports.getCvAttente = async (req, res) => {
  try {
    const cvs = await Guide.findPending();
    res.render('admin/cv-attente', {
      user: req.session.user,
      cvs,
      layout: 'main'
    });
  } catch (err) {
    console.error('Erreur cv-attente:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Approuve le CV d'un guide et active son compte.
 */
exports.approveCv = async (req, res) => {
  const guideId = req.params.id;
  try {
    await Guide.approveDocuments(guideId);
    // Notification au guide
    await Notification.create({
      id_utilisateur: guideId,
      type: 'CV',
      contenu: 'Votre CV a été approuvé !'
    });
    res.redirect('/admin/cv-attente');
  } catch (err) {
    console.error('Erreur approbation CV:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Liste des guides ayant soumis leurs documents (CV et diplôme) en attente.
 */
exports.getGuidesDocs = async (req, res) => {
  try {
    const list = await Guide.findPending(); // déjà fait
    res.render('admin/guides_docs', { 
      list,
      layout: 'main' 
    });
  } catch (err) {
    console.error('Erreur guides-docs:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Accepte les documents (CV + diplôme) d'un guide.
 */
exports.acceptDocs = async (req, res) => {
  const guideId = req.params.id;
  try {
    await Guide.approveDocuments(guideId);
    await Notification.create({
      id_utilisateur: guideId,
      type: 'VALIDATION',
      contenu: 'Félicitations ! Vos documents ont été approuvés. Vous êtes maintenant guide actif.'
    });
    res.redirect('/admin/guides-docs');
  } catch (err) {
    console.error('Erreur acceptation docs:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Refuse les documents d'un guide.
 */
exports.refuseDocs = async (req, res) => {
  const guideId = req.params.id;
  try {
    await Guide.refuseDocuments(guideId);
    await Notification.create({
      id_utilisateur: guideId,
      type: 'VALIDATION',
      contenu: 'Vos documents ont été refusés. Veuillez les corriger et les renvoyer.'
    });
    res.redirect('/admin/guides-docs');
  } catch (err) {
    console.error('Erreur refus docs:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Bascule le statut d'un guide (bloquer / activer).
 */
exports.toggleGuideStatus = async (req, res) => {
  const guideId = req.params.id;
  const action = req.params.action; // 'bloquer' ou 'activer'
  const newStatut = action === 'bloquer' ? 'BLOQUE' : 'ACTIF';
  try {
    await Guide.update(guideId, { statut: newStatut });
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Erreur changement statut:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Liste des conversations (derniers messages) pour l'admin.
 */
exports.getMessagesList = async (req, res) => {
  const adminId = req.session.user.id;
  try {
    const messages = await Message.getLastMessagesForUser(adminId);
    // Enrichir avec le statut du guide
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const otherId = msg.other_user_id;
        const user = await User.findById(otherId);
        if (user && user.role === 'GUIDE') {
          const guide = await Guide.findByUserId(otherId);
          return { ...msg, guide_status: guide ? guide.statut : null };
        }
        return msg;
      })
    );
    res.render('admin/messages', {
      messages: enriched,
      user: req.session.user,
      layout: 'main'
    });
  } catch (err) {
    console.error('Erreur liste messages:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Affiche la conversation avec un guide spécifique.
 */
exports.getConversation = async (req, res) => {
  const adminId = req.session.user.id;
  const guideId = req.params.guideId;

  try {
    // Marquer les messages de ce guide comme lus
    await Message.markAsRead(guideId, adminId);

    // Récupérer les messages
    const messages = await Message.findConversation(adminId, guideId);

    // Récupérer les infos du guide
    const guide = await User.findById(guideId);

    res.render('admin/conversation', {
      user: req.session.user,
      guide,
      messages,
      layout: 'main'
    });
  } catch (err) {
    console.error('Erreur conversation:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Envoie un message de l'admin vers un guide.
 */
exports.sendMessage = async (req, res) => {
  const adminId = req.session.user.id;
  const guideId = req.params.guideId;
  const { contenu } = req.body;

  try {
    await Message.create({
      id_expediteur: adminId,
      id_destinataire: guideId,
      contenu
    });

    // Notification au guide
    await Notification.create({
      id_utilisateur: guideId,
      type: 'MESSAGE',
      contenu: 'Nouveau message de l\'admin'
    });

    res.redirect(`/admin/messages/${guideId}`);
  } catch (err) {
    console.error('Erreur envoi message admin:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Rafraîchit la conversation (AJAX) – renvoie les messages au format JSON.
 */
exports.refreshConversation = async (req, res) => {
  const adminId = req.session.user.id;
  const guideId = req.params.guideId;

  try {
    const messages = await Message.findConversation(adminId, guideId);
    res.json(messages);
  } catch (err) {
    console.error('Erreur rafraîchissement conversation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Affiche le formulaire de réponse à un message de guide.
 */
exports.getReplyForm = async (req, res) => {
  const adminId = req.session.user.id;
  const guideId = req.query.guideId;

  try {
    // Récupérer les infos du guide
    const guide = await User.findById(guideId);
    if (!guide) {
      return res.status(404).send('Guide non trouvé');
    }

    // Récupérer les messages récents avec ce guide
    const messages = await Message.findConversation(adminId, guideId);

    res.render('admin/reply', {
      user: req.session.user,
      guide,
      guideId: guide.id, // Ajouter explicitement l'ID du guide
      messages: messages.slice(-5), // 5 derniers messages
      layout: 'main'
    });
  } catch (err) {
    console.error('Erreur formulaire réponse:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Envoie une réponse à un guide.
 */
exports.replyToGuide = async (req, res) => {
  const adminId = req.session.user.id;
  const { guideId, contenu } = req.body;

  if (!contenu || contenu.trim() === '') {
    return res.redirect(`/admin/reply-message?guideId=${guideId}&error=Le message ne peut pas être vide`);
  }

  try {
    // Créer le message
    await Message.create({
      id_expediteur: adminId,
      id_destinataire: guideId,
      contenu: contenu.trim()
    });

    // Notification au guide
    const guide = await User.findById(guideId);
    await Notification.create({
      id_utilisateur: guideId,
      type: 'MESSAGE',
      contenu: `Nouvelle réponse de l'administrateur`
    });

    // Envoyer la notification en temps réel au guide
    const io = req.app.get('io');
    if (io) {
      io.to(`guide_${guideId}`).emit('guide_message', {
        id: Date.now(),
        content: contenu.trim(),
        from: 'admin',
        date: new Date()
      });
    }

    res.redirect(`/admin/reply-message?guideId=${guideId}&success=Message envoyé avec succès`);
  } catch (err) {
    console.error('Erreur réponse au guide:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Affiche la page de chat avec un guide spécifique
 */
exports.getChatWithGuide = async (req, res) => {
  const adminId = req.session.user.id;
  const guideId = req.params.guideId;

  try {
    // Récupérer les informations du guide
    const guide = await User.findById(guideId);
    if (!guide) {
      return res.status(404).send('Guide non trouvé');
    }

    // Récupérer la conversation
    const messages = await Message.findConversation(adminId, guideId);
    
    // Marquer les messages du guide comme lus
    await Message.markConversationAsRead(guideId, adminId);

    // Récupérer tous les guides pour la sidebar
    const guides = await Guide.findAll();
    const guidesWithUnread = await Message.getConversationsWithUnreadCounts(adminId);

    res.render('admin/chat', {
      user: req.session.user,
      selectedGuide: guide,
      guides: guidesWithUnread,
      messages: messages,
      hideNavbar: true
    });
  } catch (err) {
    console.error('Erreur getChatWithGuide:', err);
    res.status(500).send('Erreur serveur : ' + err.message);
  }
};

/**
 * Affiche la liste des guides pour le chat
 */
exports.getChatList = async (req, res) => {
  const adminId = req.session.user.id;

  try {
    // Récupérer tous les guides avec leurs informations complètes
    const allGuides = await Guide.findAll();
    
    // Récupérer les conversations avec les compteurs de messages non lus
    const conversations = await Message.getConversationsWithUnreadCounts(adminId);
    
    // Fusionner les informations des guides avec les conversations
    const guidesWithConversations = allGuides.map(guide => {
      const conversation = conversations.find(conv => conv.id === guide.id_utilisateur);
      
      return {
        id: guide.id_utilisateur,
        nom_complet: guide.nom_complet || `${guide.prenom} ${guide.nom}`,
        email: guide.email,
        photo_profil: guide.photo_profil,
        statut: guide.statut,
        unread_count: conversation ? conversation.unread_count : 0,
        last_message: conversation ? conversation.last_message : null,
        last_message_date: conversation ? conversation.last_message_time : null
      };
    });

    // Trier par date de dernier message (les plus récents en premier)
    guidesWithConversations.sort((a, b) => {
      if (!a.last_message_date) return 1;
      if (!b.last_message_date) return -1;
      return new Date(b.last_message_date) - new Date(a.last_message_date);
    });

    res.render('admin/chat-list', {
      user: req.session.user,
      guides: guidesWithConversations,
      hideNavbar: true
    });
  } catch (err) {
    console.error('Erreur getChatList:', err);
    res.status(500).send('Erreur serveur : ' + err.message);
  }
};

/**
 * Envoie un message à un guide
 */
exports.sendMessageToGuide = async (req, res) => {
  const adminId = req.session.user.id;
  const guideId = req.params.guideId;
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Le message ne peut pas être vide.' 
    });
  }

  try {
    // Créer le message
    await Message.create({
      id_expediteur: adminId,
      id_destinataire: guideId,
      contenu: message.trim(),
      type_message: 'TEXT'
    });

    // Notification au guide
    await Notification.create({
      id_utilisateur: guideId,
      type: 'MESSAGE',
      contenu: `Nouveau message de l'administrateur: ${message.trim()}`
    });

    // Envoyer la notification en temps réel au guide
    const io = req.app.get('io');
    if (io) {
      io.to(`guide_${guideId}`).emit('guide_message', {
        id: Date.now(),
        content: message.trim(),
        from: 'admin',
        date: new Date()
      });

      // Notifier l'admin lui-même
      io.to('adminRoom').emit('admin_notification', {
        id: Date.now(),
        message: `Message envoyé à ${guide.nom_complet}`,
        type: 'message',
        from: req.session.user.nom_complet,
        content: message.trim(),
        date: new Date()
      });
    }

    res.json({ 
      success: true, 
      message: 'Message envoyé avec succès!' 
    });
  } catch (err) {
    console.error('Erreur envoi message:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur : ' + err.message 
    });
  }
};