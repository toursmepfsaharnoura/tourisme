const Guide = require('../models/Guide');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Plan = require('../models/Plan');
const path = require('path');
const fs = require('fs');

/* ===================== DASHBOARD ===================== */
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

/* ===================== UPLOAD DOCS ===================== */
exports.uploadDocs = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const cvFile = req.files['cv']
      ? `/uploads/cv/${req.files['cv'][0].filename}`
      : null;

    const diplomeFile = req.files['diplome']
      ? `/uploads/diplomes/${req.files['diplome'][0].filename}`
      : null;

    await Guide.update(userId, {
      cv: cvFile,
      diplome: diplomeFile,
      cv_approved: 0,
      diplome_approved: 0,
      date_soumission: new Date()
    });

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

/* ===================== PROFILE ===================== */
exports.getProfile = async (req, res) => {
  const userId = req.session.user.id;

  try {
    const user = await User.findById(userId);
    const guide = await Guide.findByUserId(userId);

    res.render('guide/profile', {
      id: user?.id,
      nom_complet: user?.nom_complet || '',
      email: user?.email || '',
      telephone: user?.telephone || '',
      bio: guide?.bio || 'Guide touristique professionnel',
      photo_profil: user?.photo_profil || '/images/default-avatar.png',
      guide,
      abonnement_actif: guide?.abonnement_actif || 0,
      abonnement_fin: guide?.abonnement_fin || null,
      success: req.query.success || null,
      error: req.query.error || null,
      hideNavbar: true,
      hideFooter: true
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

/* ===================== UPDATE PROFILE ===================== */
exports.updateProfile = async (req, res) => {
  const userId = req.session.user.id;
  const { nom_complet, telephone, bio } = req.body;

  try {
    const errors = [];

    if (!nom_complet || nom_complet.trim() === '') {
      errors.push('Nom complet requis');
    }

    if (!telephone || !/^\d{8}$/.test(telephone.trim())) {
      errors.push('Téléphone invalide (8 chiffres)');
    }

    if (errors.length > 0) {
      return res.redirect(`/guide/profile?error=${errors.join(', ')}`);
    }

    await User.update(userId, {
      nom_complet: nom_complet.trim(),
      telephone: telephone.trim()
    });

    const bioValue = bio?.trim() || 'Guide touristique professionnel';

    const guide = await Guide.findByUserId(userId);
    if (guide) {
      await Guide.updateProfile(userId, { bio: bioValue });
    }

    req.session.user.nom_complet = nom_complet.trim();
    req.session.user.telephone = telephone.trim();

    return res.redirect('/guide/profile?success=Profil mis à jour');

  } catch (err) {
    console.error(err);
    return res.redirect('/guide/profile?error=Erreur serveur');
  }
};

/* ===================== PHOTO ===================== */
exports.uploadPhoto = async (req, res) => {
  try {
    const userId = req.session.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false });
    }

    const photoPath = `/uploads/photos-profil/${req.file.filename}`;

    await User.update(userId, { photo_profil: photoPath });
    req.session.user.photo_profil = photoPath;

    res.json({
      success: true,
      photoPath
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/* ===================== PLANS ===================== */
exports.getCreatePlan = async (req, res) => {
  res.render('guide/create-plan', { user: req.session.user });
};

exports.createPlan = async (req, res) => {
  const userId = req.session.user.id;

  try {
    const { titre, description, prix } = req.body;

    if (!titre || !description || !prix) {
      return res.redirect('/guide/plans?error=Champs manquants');
    }

    await Plan.create({
      id_guide: userId,
      titre,
      description,
      prix
    });

    res.redirect('/guide/plans?success=Plan créé');

  } catch (err) {
    console.error(err);
    res.redirect('/guide/plans?error=Erreur création');
  }
};

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.findByGuide(req.session.user.id);

    res.render('guide/plans', {
      user: req.session.user,
      plans
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

/* ===================== MESSAGES ===================== */
exports.sendMessage = async (req, res) => {
  const guideId = req.session.user.id;
  const { contenu } = req.body;

  if (!contenu?.trim()) {
    return res.status(400).json({ success: false });
  }

  try {
    const admin = await User.findAdmin();

    const newMessageId = await Message.create({
      id_expediteur: guideId,
      id_destinataire: admin.id,
      contenu: contenu.trim(),
      type_message: 'TEXT'
    });

    await Notification.create({
      id_utilisateur: admin.id,
      type: 'MESSAGE',
      contenu: `Nouveau message: ${contenu.trim()}`
    });

    const io = req.app.get('io');
    if (io) {
      io.to('adminRoom').emit('admin_notification', {
        message: contenu.trim(),
        from: req.session.user.nom_complet
      });
    }

    res.json({
      success: true,
      messageId: newMessageId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};