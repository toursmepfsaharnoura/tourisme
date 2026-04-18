const Gouvernorat = require('../models/Gouvernorat');
const Delegation = require('../models/Delegation');

/**
 * Get all governorats
 */
exports.getAllGovernorats = async (req, res) => {
  try {
    const governorats = await Gouvernorat.findAll();
    res.json(governorats);
  } catch (err) {
    console.error('Error getting governorats:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get single governorat
 */
exports.getGovernorat = async (req, res) => {
  const governoratId = req.params.id;

  try {
    const governorat = await Gouvernorat.findById(governoratId);
    if (!governorat) {
      return res.status(404).json({ error: 'Governorat not found' });
    }
    res.json(governorat);
  } catch (err) {
    console.error('Error getting governorat:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get governorat with delegations (public view)
 */
exports.getGovernoratWithDelegations = async (req, res) => {
  const governoratId = req.params.id;

  try {
    const [gouvernorat, delegations] = await Promise.all([
      Gouvernorat.findById(governoratId),
      Delegation.findByGouvernorat(governoratId)
    ]);

    if (!gouvernorat) {
      return res.status(404).render('404', { url: req.originalUrl });
    }

    res.render('public/gouvernorat-details', {
      gouvernorat,
      delegations,
      user: req.session.user || null
    });
  } catch (err) {
    console.error('Error getting governorat with delegations:', err);
    res.status(500).render('500', { error: err.message });
  }
};

/**
 * Create new governorat
 */
exports.createGovernorat = async (req, res) => {
  const { nom } = req.body;

  try {
    const governoratId = await Gouvernorat.create({ nom });
    res.json({ success: true, governoratId });
  } catch (err) {
    console.error('Error creating governorat:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Update governorat
 */
exports.updateGovernorat = async (req, res) => {
  const governoratId = req.params.id;
  const { nom } = req.body;

  try {
    await Gouvernorat.update(governoratId, { nom });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating governorat:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete governorat
 */
exports.deleteGovernorat = async (req, res) => {
  const governoratId = req.params.id;

  try {
    await Gouvernorat.delete(governoratId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting governorat:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
