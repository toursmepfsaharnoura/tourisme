const db = require('../config/db');

exports.verifUser = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

exports.verifTouriste = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'TOURISTE') {
    return res.redirect('/auth/login');
  }
  next();
};

exports.verifAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'ADMIN') {
    // Vérifier si c'est une requête AJAX
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'Non autorisé - Admin requis' });
    }
    return res.redirect('/auth/login');
  }
  next();
};

exports.verifGuide = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'GUIDE') {
    return res.redirect('/auth/login');
  }
  next();
};

exports.checkGuideValidated = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'GUIDE') {
    return res.redirect('/auth/login');
  }
  db.query(
    'SELECT statut FROM guides WHERE id_utilisateur = ?',
    [req.session.user.id],
    (err, rows) => {
      if (err || rows.length === 0 || rows[0].statut !== 'ACTIF') {
        return res.status(403).render('guide/non-valide', {
          user: req.session.user,
          message: "Votre compte doit être activé par l'administrateur avant d'accéder à cette fonctionnalité"
        });
      }
      next();
    }
  );
};