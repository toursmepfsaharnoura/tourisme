const Guide = require('../models/Guide');
const User = require('../models/User');
const Plan = require('../models/Plan');
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
    
const today = new Date();
const dateFin = guide.abonnement_fin ? new Date(guide.abonnement_fin) : null;

const abonnement_valide = dateFin && dateFin >= today;

res.render('guide/dashboard', {
  user,
  guide,
  cv_approved: guide.cv_approved || 0,
  abonnement_valide, // 👈 الجديد
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
        contenu: 'Nouveau dossier guide à valider'
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
 * Met à jour les informations du profil (nom, téléphone, bio) et la photo.
 */
exports.updateProfile = async (req, res) => {
  const userId = req.session.user.id;
  const { nom_complet, telephone, bio } = req.body;

  try {
    const errors = [];
    
    if (nom_complet === undefined || nom_complet === null) {
      errors.push('Le nom complet est requis (non reçu)');
    } else if (typeof nom_complet !== 'string') {
      errors.push('Le nom complet doit être une chaîne de caractères');
    } else if (nom_complet.trim() === '') {
      errors.push('Le nom complet est requis (vide)');
    }
    
    if (!telephone || telephone.trim() === '') {
      errors.push('Le numéro de téléphone est requis');
    } else if (!/^\d{8}$/.test(telephone.trim())) {
      errors.push('Le numéro de téléphone doit contenir exactement 8 chiffres');
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

    return res.redirect('/guide/profile?success=Profil mis à jour avec succès');

  } catch (err) {
    console.error(err);
    return res.redirect('/guide/profile?error=Erreur lors de la mise à jour du profil');
  }
};

/**
 * Upload de la photo de profil (appelé en AJAX depuis le formulaire dédié).
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
      message: 'Photo de profil mise à jour avec succès',
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

/**
 * Affiche la conversation entre le guide et l'administrateur.
 */
exports.getMessages = async (req, res) => {
  const guideId = req.session.user.id;
  try {
    const admin = await User.findAdmin();
    if (!admin) {
      return res.status(500).send('Aucun administrateur trouvé.');
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
 * Envoie un message du guide à l'administrateur.
 */
exports.sendMessage = async (req, res) => {
  const guideId = req.session.user.id;
  const { contenu, type_message = 'TEXT' } = req.body;

  if (!contenu || contenu.trim() === '') {
    return res.redirect('/guide/messages');
  }

  try {
    const admin = await User.findAdmin();
    if (!admin) {
      return res.status(500).send('Aucun administrateur trouvé.');
    }
    const adminId = admin.id;

    await Message.create({
      id_expediteur: guideId,
      id_destinataire: adminId,
      contenu: contenu.trim(),
      type_message: type_message
    });

    await Notification.create({
      id_utilisateur: adminId,
      type: 'MESSAGE',
      contenu: `Nouveau message de ${req.session.user.nom_complet}`
    });

    res.redirect('/guide/messages');
  } catch (err) {
    console.error('Erreur envoi message:', err);
    res.status(500).send('Erreur serveur : ' + err.message);
  }
};

exports.markNotificationsRead = async (req, res) => {
  res.send('Marquer notifications lues - à implémenter');
};

exports.refreshNotifications = async (req, res) => {
  res.send('Rafraîchir notifications - à implémenter');
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