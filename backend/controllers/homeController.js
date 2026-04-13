const Home = require('../models/Home');
const Gouvernorat = require('../models/Gouvernorat');

exports.getAccueil = async (req, res) => {
  try {
    const [homeData, gouvernorats] = await Promise.all([
      Home.getHomePageData(),
      Gouvernorat.findAll()
    ]);
    
    res.render('accueil', {
      ...homeData,
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
    
    res.render('search', {
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
    const featuredGuides = await Home.getFeaturedGuides();
    res.render('guides', { 
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
    const suggestions = await Home.getSearchSuggestions(q);
    res.json(suggestions);
  } catch (err) {
    console.error('Error getting search suggestions:', err);
    res.status(500).json({ error: 'Server error' });
  }
};