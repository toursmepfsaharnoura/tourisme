const Delegation = require('../models/Delegation');
const Gouvernorat = require('../models/Gouvernorat');

/**
 * Get all delegations (public view)
 */
exports.getAllDelegations = async (req, res) => {
  try {
    const delegations = await Delegation.findAll();
    
    // Get governorat information for each delegation
    const delegationsWithGouvernorat = await Promise.all(
      delegations.map(async (delegation) => {
        const gouvernorat = await Gouvernorat.findById(delegation.id_gouvernorat);
        return {
          ...delegation,
          gouvernorat_nom: gouvernorat ? gouvernorat.nom : 'Inconnu'
        };
      })
    );
    
    res.render('public/delegations', {
      delegations: delegationsWithGouvernorat,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error getting all delegations:', error);
    res.status(500).render('404', { url: req.originalUrl });
  }
};

/**
 * Get delegation detail page (public view)
 */
exports.getDelegationDetail = async (req, res) => {
  const delegationId = req.params.id;

  try {
    // Get delegation details with governorat info
    const delegation = await Delegation.findById(delegationId);
    
    if (!delegation) {
      return res.status(404).render('404', { url: req.originalUrl });
    }

    // Get governorat information
    const gouvernorat = await Gouvernorat.findById(delegation.id_gouvernorat);
    
    // Get related delegations in the same governorat
    const relatedDelegations = await Delegation.findByGouvernorat(delegation.id_gouvernorat);
    
    // Filter out current delegation from related
    const otherDelegations = relatedDelegations.filter(d => d.id !== parseInt(delegationId));

    // Get local guides from database
    const db = require('../config/db');
    const [guidesLocaux] = await db.query(
      `SELECT id, nom_complet, photo_profil, role, telephone 
       FROM utilisateurs 
       WHERE role='GUIDE' AND est_actif=1 
       ORDER BY date_creation DESC 
       LIMIT 6`
    );

    res.render('public/delegation-detail', {
      delegation,
      gouvernorat,
      relatedDelegations: otherDelegations.slice(0, 4), // Max 4 related
      guidesLocaux,
      user: req.session.user || null,
      title: `${delegation.nom} - Tunisie Authentique`
    });
  } catch (err) {
    console.error('Error getting delegation detail:', err);
    res.status(500).render('500', { error: err.message });
  }
};

/**
 * Get all delegations (API)
 */
exports.getAllDelegationsAPI = async (req, res) => {
  try {
    const delegations = await Delegation.findAll();
    res.json(delegations);
  } catch (err) {
    console.error('Error getting delegations:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get delegations by governorate
 */
exports.getDelegationsByGovernorate = async (req, res) => {
  const governorateId = req.params.gouvernoratId;

  try {
    const delegations = await Delegation.findByGovernorate(gouvernoratId);
    res.json(delegations);
  } catch (err) {
    console.error('Error getting delegations by governorate:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get single delegation
 */
exports.getDelegation = async (req, res) => {
  const delegationId = req.params.id;

  try {
    const delegation = await Delegation.findById(delegationId);
    if (!delegation) {
      return res.status(404).json({ error: 'Delegation not found' });
    }
    res.json(delegation);
  } catch (err) {
    console.error('Error getting delegation:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Create new delegation
 */
exports.createDelegation = async (req, res) => {
  const { nom, id_gouvernorat } = req.body;

  try {
    const delegationId = await Delegation.create({
      nom,
      id_gouvernorat
    });
    res.json({ success: true, delegationId });
  } catch (err) {
    console.error('Error creating delegation:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Update delegation
 */
exports.updateDelegation = async (req, res) => {
  const delegationId = req.params.id;
  const { nom, id_gouvernorat } = req.body;

  try {
    await Delegation.update(delegationId, { nom, id_gouvernorat });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating delegation:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete delegation
 */
exports.deleteDelegation = async (req, res) => {
  const delegationId = req.params.id;

  try {
    await Delegation.delete(delegationId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting delegation:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
