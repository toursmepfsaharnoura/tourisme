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
  // Vérification simple : utilisateur doit être connecté et être un guide
  if (!req.session.user || req.session.user.role !== 'GUIDE') {
    return res.redirect('/auth/login');
  }
  
  // Pour l'instant, on permet à tous les guides d'accéder
  // Plus tard, vous pouvez décommenter la vérification du statut
  /*
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
  */
  
  next();
};