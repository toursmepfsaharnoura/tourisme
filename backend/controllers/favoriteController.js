const Favorite = require('../models/Favorite');

/**
 * Toggle favorite status for a plan
 */
exports.toggleFavorite = async (req, res) => {
  const touristId = req.session.user?.id;
  const { planId } = req.body;

  if (!touristId) {
    return res.json({ success: false, message: 'Veuillez vous connecter', redirect: '/auth/login' });
  }

  if (!planId) {
    return res.json({ success: false, message: 'Plan non trouvé' });
  }

  try {
    const isFav = await Favorite.toggleFavorite(touristId, planId);
    res.json({ success: true, isFavorite: isFav, message: isFav ? 'Ajouté à vos favoris' : 'Retiré de vos favoris' });
  } catch (err) {
    console.error('Erreur toggle favorite:', err);
    res.json({ success: false, message: 'Erreur serveur' });
  }
};

/**
 * Get all favorites for logged-in tourist
 */
exports.getFavorites = async (req, res) => {
  const touristId = req.session.user?.id;

  if (!touristId) {
    return res.redirect('/auth/login');
  }

  try {
    const favorites = await Favorite.findByTourist(touristId);
    res.render('touriste/favorites', {
      user: req.session.user,
      favorites,
      layout: false
    });
  } catch (err) {
    console.error('Erreur chargement favoris:', err);
    res.status(500).send('Erreur serveur');
  }
};

/**
 * Check if a plan is favorite (for AJAX)
 */
exports.isFavorite = async (req, res) => {
  const touristId = req.session.user?.id;
  const { planId } = req.query;

  if (!touristId || !planId) {
    return res.json({ isFavorite: false });
  }

  try {
    const isFav = await Favorite.isFavorite(touristId, parseInt(planId));
    res.json({ isFavorite: isFav });
  } catch (err) {
    console.error('Erreur check favorite:', err);
    res.json({ isFavorite: false });
  }
};

module.exports = exports;
