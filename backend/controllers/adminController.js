const User = require('../models/User');
const Guide = require('../models/Guide');
const Admin = require('../models/Admin');
const Message = require('../models/Message');
const Plan = require('../models/Plan');
const Reservation = require('../models/Reservation');
const NotificationService = require('../services/notificationService');
const db = require('../config/db');

/**
 * Affiche le tableau de bord administrateur avec statistiques et listes.
 */
exports.getDashboard = async (req, res) => {
  const adminId = req.session.user.id;
  try {
    // Statistiques : requêtes parallèles pour optimisation
    const [guidesActifs, guidesEnAttente, totalPlans, messages] = await Promise.all([
      Guide.findAll('ACTIF'),                      // guides avec statut ACTIF
      Guide.findPending(),                          // guides avec documents en attente
      Plan.findAll().then(plans => plans.length),    // nombre total de plans
      Message.getLastMessagesForUser(adminId)        // messages pour l'admin
    ]);

    // 10 derniers guides actifs (avec leurs plans)
    const actifsAvecPlans = await Promise.all(
      guidesActifs.slice(0, 10).map(async (guide) => {
        const plans = await Plan.findByGuide(guide.id);
        return { ...guide, nb_plans: plans.length };
      })
    );

    // Debug: Vérifier les messages bruts
    console.log('Messages bruts récupérés:', messages);
    console.log('Nombre de messages:', messages.length);
    
    // Enrichir les messages avec les infos des expéditeurs
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const otherId = msg.other_user_id;
        console.log('Traitement message - other_user_id:', otherId);
        
        const user = await User.findById(otherId);
        console.log('Utilisateur trouvé:', user ? user.nom_complet : 'Non trouvé');
        
        let guideStatus = null;
        if (user && user.role === 'GUIDE') {
          const guide = await Guide.findByUserId(otherId);
          guideStatus = guide ? guide.statut : null;
          console.log('Statut guide:', guideStatus);
        }
        
        return { 
          ...msg, 
          sender_name: user ? user.nom_complet : 'Unknown',
          guide_status: guideStatus 
        };
      })
    );
    
    console.log('Messages enrichis:', enrichedMessages);

    const fixedGuidesAttente = guidesEnAttente.map(g => ({
      ...g,
      id: g.id_utilisateur
    }));
    
    res.render('admin/dashboard', {
      user: req.session.user,
      stats: {
        guides_actifs: guidesActifs.length,
        guides_en_attente: guidesEnAttente.length,
        total_plans: totalPlans
      },
      guides_actifs: actifsAvecPlans,
      guides_attente: fixedGuidesAttente,
      messages: enrichedMessages,
      layout: 'minimal'
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
      layout: 'minimal'
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
      layout: 'admin',
      activePage: 'guides-docs',
      title: 'Documents des Guides - Admin Panel',
      user: req.session.user
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
    
    // Récupérer les infos du guide pour la notification
    const [guide] = await db.query(
      'SELECT nom_complet FROM utilisateurs WHERE id = ?',
      [guideId]
    );
    
    if (guide.length > 0) {
      // Notifier que le guide a été validé
      await NotificationService.createAdminNotification('CV', `Guide validé: ${guide[0].nom_complet} - Documents approuvés avec succès`);
    }
    
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
      layout: 'minimal'
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
      layout: 'minimal'
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
      layout: 'minimal'
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

    res.redirect(`/admin/reply-message?guideId=${guideId}&success=Message envoyé avec succès`);
  } catch (err) {
    console.error('Erreur réponse au guide:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Affiche la liste des réservations organisées par guide et par plan
 */
exports.getReservations = async (req, res) => {
  try {
    // Récupérer tous les guides actifs
    const guidesActifs = await Guide.findAll('ACTIF');
    
    // Organiser les réservations par guide et par plan
    const guidesWithReservations = await Promise.all(
      guidesActifs.map(async (guide) => {
        // Récupérer les plans du guide
        const plans = await Plan.findByGuide(guide.id);
        
        // Pour chaque plan, récupérer les réservations
        const plansWithReservations = await Promise.all(
          plans.map(async (plan) => {
            const reservations = await Reservation.findByPlan(plan.id);
            
            // Enrichir les réservations avec les infos des touristes
            const enrichedReservations = await Promise.all(
              reservations.map(async (reservation) => {
                const tourist = await User.findById(reservation.id_touriste);
                return {
                  ...reservation,
                  tourist: tourist || { nom_complet: 'Touriste inconnu', email: 'N/A' }
                };
              })
            );
            
            return {
              ...plan,
              reservations: enrichedReservations
            };
          })
        );
        
        return {
          ...guide,
          plans: plansWithReservations
        };
      })
    );
    
    res.render('admin/reservations', {
      user: req.session.user,
      guidesWithReservations,
      layout: 'admin',
      activePage: 'reservations',
      title: 'Réservations - Admin Panel'
    });
  } catch (err) {
    console.error('Erreur getReservations:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Affiche les détails d'une réservation spécifique
 */
exports.viewReservation = async (req, res) => {
  const reservationId = req.params.id;
  
  try {
    // Récupérer la réservation avec tous les détails
    const reservation = await Reservation.getFullDetails(reservationId);
    
    if (!reservation) {
      return res.status(404).render('error', { 
        message: 'Réservation non trouvée',
        user: req.session.user 
      });
    }
    
    res.render('admin/reservation-details', {
      user: req.session.user,
      reservation,
      layout: 'admin',
      activePage: 'reservations',
      title: 'Détails Réservation - Admin Panel'
    });
  } catch (err) {
    console.error('Erreur viewReservation:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Supprime une réservation
 */
exports.deleteReservation = async (req, res) => {
  const reservationId = req.params.id;
  
  try {
    // Vérifier si la réservation existe
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Réservation non trouvée' 
      });
    }
    
    // Supprimer la réservation
    const success = await Reservation.delete(reservationId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Réservation supprimée avec succès' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Erreur lors de la suppression' 
      });
    }
  } catch (err) {
    console.error('Erreur deleteReservation:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur' 
    });
  }
};

/**
 * API: Get messages for a specific guide (JSON format)
 */
exports.getMessagesApi = async (req, res) => {
  const adminId = req.session.user.id;
  const guideId = req.params.guideId;

  try {
    const messages = await Message.findConversation(adminId, guideId);
    
    // Enrich messages with sender info
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const sender = await User.findById(msg.id_expediteur);
        return {
          ...msg,
          sender_name: sender ? sender.nom_complet : 'Unknown'
        };
      })
    );
    
    res.json(enrichedMessages);
  } catch (err) {
    console.error('Erreur getMessagesApi:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * API: Send message from admin to any user (JSON response)
 */
exports.sendMessageApi = async (req, res) => {
  const adminId = req.session.user.id;
  const { guideId, recipientId, contenu } = req.body;

  console.log('🔍 Debug sendMessageApi:');
  console.log('  - adminId:', adminId);
  console.log('  - guideId:', guideId);
  console.log('  - recipientId:', recipientId);
  console.log('  - contenu:', contenu);
  console.log('  - req.body:', req.body);
  console.log('  - headers:', req.headers);

  try {
    // Support pour guideId (ancien) et recipientId (nouveau)
    const finalRecipientId = recipientId || guideId;
    
    // Validation des entrées
    if (!finalRecipientId || !contenu || !contenu.trim()) {
      console.log('❌ Validation échouée - recipientId ou contenu manquant');
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient ID and message content are required',
        details: {
          guideId: guideId,
          recipientId: recipientId,
          finalRecipientId: finalRecipientId,
          contenu: contenu,
          received: req.body
        }
      });
    }

    console.log('✅ Validation passée, création du message...');

    // Créer le message
    const messageId = await Message.create({
      id_expediteur: adminId,
      id_destinataire: finalRecipientId,
      contenu: contenu.trim()
    });

    console.log('✅ Message créé avec ID:', messageId);

    // Récupérer le message créé avec les infos de l'expéditeur
    const message = await Message.findById(messageId);
    const sender = await User.findById(adminId);

    // Émission Socket.io immédiate du message
    if (global.io) {
      const messageData = {
        id: messageId,
        id_expediteur: adminId,
        id_destinataire: finalRecipientId,
        contenu: contenu.trim(),
        sender_name: sender ? sender.nom_complet : 'Admin',
        date_creation: message.date_creation,
        type: 'NEW_MESSAGE'
      };
      
      // Envoyer au destinataire spécifique
      global.io.to(`notifications_${finalRecipientId}`).emit('newMessage', messageData);
      global.io.to(`user_${finalRecipientId}`).emit('newMessage', messageData);
      
      console.log('🚀 Message Socket.io envoyé directement au destinataire:', finalRecipientId);
    }

    // Créer une notification pour le destinataire
    await NotificationService.notifyNewMessage(adminId, finalRecipientId, contenu.trim());

    console.log('✅ Notification envoyée au destinataire');
    console.log('✅ Message récupéré, envoi de la réponse');

    // Réponse JSON pour les requêtes AJAX
    res.json({ 
      success: true, 
      message: {
        ...message,
        sender_name: sender ? sender.nom_complet : 'Admin'
      }
    });

  } catch (err) {
    console.error('❌ Erreur sendMessageApi:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur',
      details: err.message
    });
  }
};

/**
 * Créer des messages de test pour vérifier l'interface
 */
exports.createTestMessages = async (req, res) => {
  const adminId = req.session.user.id;
  
  try {
    // Récupérer quelques guides pour créer des messages
    const guides = await Guide.findAll('ACTIF');
    
    if (guides.length === 0) {
      return res.status(400).send('Aucun guide trouvé pour créer des messages de test');
    }

    // Créer des messages de test de quelques guides vers l'admin
    const testMessages = [
      { guideId: guides[0].id, contenu: "Bonjour, j'ai une question sur mes plans touristiques", senderName: guides[0].nom_complet },
      { guideId: guides[1] ? guides[1].id : guides[0].id, contenu: "Merci pour votre aide!", senderName: guides[1] ? guides[1].nom_complet : guides[0].nom_complet },
      { guideId: guides[0].id, contenu: "Pouvez-vous vérifier mon dernier plan?", senderName: guides[0].nom_complet }
    ];

    for (const msg of testMessages) {
      await Message.create({
        id_expediteur: msg.guideId,
        id_destinataire: adminId,
        contenu: msg.contenu
      });
    }

    res.send(`Messages de test créés avec succès! ${testMessages.length} messages ajoutés.`);
  } catch (err) {
    console.error('Erreur création messages de test:', err);
    res.status(500).send('Erreur lors de la création des messages de test');
  }
};