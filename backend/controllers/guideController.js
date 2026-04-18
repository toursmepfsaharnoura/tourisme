const Guide = require('../models/Guide');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const path = require('path');
const fs = require('fs');

exports.getDashboard = async (req, res) => {
  const userId = req.session.user.id;
  try {
    let guide = await Guide.findByUserId(userId);
    if (!guide) {
      await Guide.create(userId);
      guide = await Guide.findByUserId(userId);
    }
    const user = await User.findById(userId);
    
    res.render('guide/dashboard', {
      user,
      guide,
      cv_approved: guide.cv_approved || 0,
      abonnement_actif: guide.abonnement_actif || 0,
      abonnement_fin: guide.abonnement_fin,
      statut: guide.statut || 'ATTENTE',
      hideNavbar: true,
      hideFooter: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

exports.uploadDocs = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const cvFile = req.files['cv'] ? `/uploads/cv/${req.files['cv'][0].filename}` : null;
    const diplomeFile = req.files['diplome'] ? `/uploads/diplomes/${req.files['diplome'][0].filename}` : null;

    await Guide.update(userId, {
      cv: cvFile,
      diplome: diplomeFile,
      cv_approved: 0,
      diplome_approved: 0,
      date_soumission: new Date()
    });

    // Trouver l'admin dynamiquement
    const admin = await User.findAdmin();
    if (admin) {
      await Notification.create({
        id_utilisateur: admin.id,
        type: 'CV',
        contenu: 'Nouveau dossier guide ├á valider'
      });
    }

    res.redirect('/guide/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur upload');
  }
};

exports.getUploadDocs = (req, res) => {
  res.render('guide/upload-cv',{
    hideNavbar: true,
    hideFooter: true
  });
};

/**
 * Get guide profile
 */
exports.getProfile = async (req, res) => {
  const userId = req.session.user.id;
  try {
    const user = await User.findById(userId);
    const guide = await Guide.findByUserId(userId);
    
    const profileData = {
      id: user?.id,
      nom_complet: user?.nom_complet || '',
      email: user?.email || '',
      telephone: user?.telephone || '',
      bio: guide?.bio || 'Guide touristique professionnel',
      photo_profil: user?.photo_profil || '/images/default-avatar.png',
      success: req.query.success || null,
      error: req.query.error || null,
      guide: guide,
      abonnement_actif: guide?.abonnement_actif || 0,
      abonnement_fin: guide?.abonnement_fin || null,
      hideNavbar: true,
      hideFooter: true
    };
    
    res.render('guide/profile', profileData);
  } catch (err) {
    console.error('Error getting profile:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Met ├á jour les informations du profil (nom, t├®l├®phone, bio) et la photo.
 */
exports.updateProfile = async (req, res) => {
  const userId = req.session.user.id;
  const { nom_complet, telephone, bio } = req.body;

  try {
    const errors = [];
    
    if (nom_complet === undefined || nom_complet === null) {
      errors.push('Le nom complet est requis (non re├ºu)');
    } else if (typeof nom_complet !== 'string') {
      errors.push('Le nom complet doit ├¬tre une cha├«ne de caract├¿res');
    } else if (nom_complet.trim() === '') {
      errors.push('Le nom complet est requis (vide)');
    }
    
    if (!telephone || telephone.trim() === '') {
      errors.push('Le num├®ro de t├®l├®phone est requis');
    } else if (!/^\d{8}$/.test(telephone.trim())) {
      errors.push('Le num├®ro de t├®l├®phone doit contenir exactement 8 chiffres');
    }
    
    const bioValue = (bio && bio.trim() !== '') ? bio.trim() : 'Guide touristique professionnel';

    if (errors.length > 0) {
      return res.redirect(`/guide/profile?error=${encodeURIComponent(errors.join(', '))}`);
    }

    await User.update(userId, { 
      nom_complet: nom_complet.trim(),
      telephone: telephone.trim()
    });

    const guide = await Guide.findByUserId(userId);
    if (guide) {
      await Guide.updateProfile(userId, { bio: bioValue });
    } else {
      await Guide.create(userId);
      await Guide.updateProfile(userId, { bio: bioValue });
    }

    req.session.user.nom_complet = nom_complet.trim();
    req.session.user.telephone = telephone.trim();
    req.session.user.bio = bioValue;

    return res.redirect('/guide/profile?success=Profil mis ├á jour avec succ├¿s');

  } catch (err) {
    console.error(err);
    return res.redirect('/guide/profile?error=Erreur lors de la mise ├á jour du profil');
  }
};

/**
 * Upload de la photo de profil (appel├® en AJAX depuis le formulaire d├®di├®).
 */
exports.uploadPhoto = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const photoPath = `/uploads/photos-profil/${req.file.filename}`;
    console.log('Photo upload:', photoPath);

    await User.update(userId, { photo_profil: photoPath });
    req.session.user.photo_profil = photoPath;

    return res.json({
      success: true,
      message: 'Photo de profil mise ├á jour avec succ├¿s',
      photoPath
    });

  } catch (err) {
    console.error('Error uploading photo:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
};

const Plan = require('../models/Plan'); // Ï¬Ïú┘âÏ» ┘à┘å ┘êÏ¼┘êÏ»┘ç

/**
 * Afficher la page de cr├®ation de plan
 */
exports.getCreatePlan = async (req, res) => {
  try {
    res.render('guide/create-plan', {
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Cr├®er un nouveau plan touristique
 */
exports.createPlan = async (req, res) => {
  const userId = req.session.user.id;

  const {
    titre,
    description,
    prix,
    date_debut,
    date_fin,
    max_participants,
    id_gouvernorat,
    id_delegation,
    lieux
  } = req.body;

  try {
    // Validation Ï¿Ï│┘èÏÀÏ®
    if (!titre || !description || !prix) {
      return res.redirect('/guide/plans/new?error=Champs obligatoires manquants');
    }

    // ÏÑ┘åÏ┤ÏºÏí plan
    await Plan.create({
      id_guide: userId,
      titre,
      description,
      prix,
      date_debut,
      date_fin,
      max_participants,
      id_gouvernorat,
      id_delegation,
      lieux
    });

    return res.redirect('/guide/plans?success=Plan cr├®├® avec succ├¿s');
  } catch (err) {
    console.error('ÔØî Erreur createPlan:', err);
    return res.redirect('/guide/plans?error=Erreur lors de la cr├®ation');
  }
};

/**
 * Liste des plans du guide
 */
exports.getPlans = async (req, res) => {
  const userId = req.session.user.id;

  try {
    const plans = await Plan.findByGuide(userId);

    res.render('guide/plans', {
      user: req.session.user,
      plans
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};
 
exports.getMessages = async (req, res) => {
  const guideId = req.session.user.id;
  try {
    const admin = await User.findAdmin();
    if (!admin) {
      return res.status(500).send('Aucun administrateur trouv├®.');
    }
    const adminId = admin.id;

    await Message.markConversationAsRead(adminId, guideId);
    const messages = await Message.findConversation(guideId, adminId);

    res.render('guide/messages', {
      user: req.session.user,
      messages,
      adminId,
      admin: admin,
      hideNavbar: true,
      hideFooter: true
    });
  } catch (err) {
    console.error('Erreur dans getMessages:', err);
    res.status(500).send('Erreur serveur : ' + err.message);
  }
};

/**
 * Affiche la conversation entre le guide et l'admin
 */
exports.getConversation = async (req, res) => {
  const guideId = req.session.user.id;
  
  try {
    // Trouver l'administrateur
    const admin = await User.findAdmin();
    if (!admin) {
      return res.status(500).send('Aucun administrateur trouv├®.');
    }
    const adminId = admin.id;

    // R├®cup├®rer la conversation
    const messages = await Message.findConversation(guideId, adminId);
    
    // Marquer les messages de l'admin comme lus
    await Message.markConversationAsRead(adminId, guideId);

    res.render('guide/conversation', {
      user: req.session.user,
      admin: admin,
      messages: messages,
      hideNavbar: true
    });
  } catch (err) {
    console.error('ÔØî Erreur dans getConversation:', err);
    res.status(500).send('Erreur serveur : ' + err.message);
  }
};

/**
 * Envoie un message du guide ├á l'administrateur.
 */
exports.sendMessage = async (req, res) => {
  const guideId = req.session.user.id;
  const { contenu, isResponse = false, type_message = 'TEXT' } = req.body;

  if (!contenu || contenu.trim() === '') {
    return res.status(400).json({ success: false, message: 'Le message ne peut pas ├¬tre vide.' });
  }

  try {
    const admin = await User.findAdmin();
    if (!admin) {
      return res.status(500).json({ success: false, message: 'Aucun administrateur trouv├®.' });
    }
    const adminId = admin.id;


    // Cr├®er le message
    const newMessageId = await Message.create({
      id_expediteur: guideId,
      id_destinataire: adminId,
      contenu: contenu.trim(),
      type_message: type_message
    });

    await Notification.create({
      id_utilisateur: adminId,
      type: 'MESSAGE',
      contenu: `${isResponse ? 'R├®ponse de' : 'Nouveau message de'} ${req.session.user.nom_complet}: ${contenu.trim()}`
    });

    // Envoyer la notification en temps r├®el ├á l'admin
    const io = req.app.get('io');
    if (io) {
      io.to('adminRoom').emit('admin_notification', {
        id: Date.now(),
        message: `${isResponse ? 'R├®ponse de' : 'Nouveau message de'} ${req.session.user.nom_complet}`,
        type: 'message',
        from: req.session.user.nom_complet,
        content: contenu.trim(),
        date: new Date()
      });
    }

    res.json({ 
      success: true, 
      message: 'Message envoy├® avec succ├¿s!',
      messageId: newMessageId
    });
  } catch (err) {
    console.error('Erreur envoi message:', err);

    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur : ' + err.message 
    });
  }
};
exports.markMessagesAsRead = async (req, res) => {
  const guideId = req.session.user.id;
  const { messageId } = req.body;

  try {
    if (messageId) {
      // Marquer un message sp├®cifique comme lu
      await Message.markAsRead(messageId);
    } else {
      // Marquer tous les messages de l'admin comme lus
      const admin = await User.findAdmin();
      if (admin) {
        await Message.markConversationAsRead(admin.id, guideId);
      }
    }

    res.json({ 
      success: true, 
      message: 'Messages marqu├®s comme lus' 
    });
  } catch (err) {
    console.error('Erreur markMessagesAsRead:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur : ' + err.message 
    });
  }
};

exports.markNotificationsRead = async (req, res) => {
  res.send('Marquer notifications lues - ├á impl├®menter');
};

exports.refreshNotifications = async (req, res) => {
  res.send('Rafra├«chir notifications - ├á impl├®menter');
};

/**
 * Get all guides for admin view
 */
exports.getAllGuides = async (req, res) => {
  try {
    const guides = await Guide.findAll();
    console.log('All guides:', guides);
    
    res.render('admin/guides-list', {
      guides,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error getting guides:', err);
    res.status(500).send('Erreur serveur');
  }
};
// ... toutes les autres fonctions : getProfile, updateProfile, uploadPhoto, getAbonnement, getPaiement, postPaiement, getPlans, getNewPlan, postPlan, getMessages, sendMessage, markNotificationsRead, refreshNotifications, etc.
