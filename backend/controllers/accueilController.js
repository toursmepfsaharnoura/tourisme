const Accueil = require('../models/Accueil');
const Gouvernorat = require('../models/Gouvernorat');

exports.getAccueil = async (req, res) => {
  try {
    const [accueilData, gouvernorats] = await Promise.all([
      Accueil.getAccueilData(),
      Gouvernorat.findAll()
    ]);
    
    res.render('public/accueil', {
      ...accueilData,
      gouvernorats,
      isHome: true,
      user: req.session.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

exports.getSearch = async (req, res) => {
  const { q } = req.query;
  
  try {
    const gouvernorats = await Gouvernorat.findAll();
    
    // Filter gouvernorats based on search query
    const filteredGouvernorats = gouvernorats.filter(gouv => 
      gouv.nom.toLowerCase().includes(q.toLowerCase())
    );
    
    res.render('public/rechercher', {
      query: q,
      gouvernorats: filteredGouvernorats,
      resultsCount: filteredGouvernorats.length,
      user: req.session.user || null
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).send('Erreur serveur');
  }
};

exports.getGuides = async (req, res) => {
  try {
    const featuredGuides = await Accueil.getFeaturedGuides();
    res.render('public/guides', { 
      guides: featuredGuides,
      user: req.session.user || null,
      layout: 'main'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

exports.getSearchSuggestions = async (req, res) => {
  const { q } = req.query;
  
  try {
    const suggestions = await Accueil.getSearchSuggestions(q);
    res.json(suggestions);
  } catch (err) {
    console.error('Error getting search suggestions:', err);
    res.status(500).json({ error: 'Server error' });
  }
};