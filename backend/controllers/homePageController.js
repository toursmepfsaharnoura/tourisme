const Gouvernorat = require('../models/Gouvernorat');

/**
 * Controller for the modern homepage
 */
exports.getHomePage = async (req, res) => {
  try {
    // Fetch all governorats from database
    const gouvernorats = await Gouvernorat.findAll();
    
    res.render('accueil', {
      gouvernorats,
      title: 'Explorez la Tunisie - Découvrez les merveilles de la Tunisie',
      user: req.session.user || null
    });
  } catch (err) {
    console.error('Error loading homepage:', err);
    res.status(500).render('500', { error: err.message });
  }
};

/**
 * Search governorats
 */
exports.searchGovernorats = async (req, res) => {
  const { q } = req.query;
  
  try {
    let gouvernorats = await Gouvernorat.findAll();
    
    // Filter based on search query
    if (q) {
      gouvernorats = gouvernorats.filter(gouv => 
        gouv.nom.toLowerCase().includes(q.toLowerCase())
      );
    }
    
    res.render('search-results', {
      gouvernorats,
      query: q,
      resultsCount: gouvernorats.length,
      title: q ? `Résultats pour "${q}"` : 'Tous les gouvernorats',
      user: req.session.user || null
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).render('500', { error: err.message });
  }
};
