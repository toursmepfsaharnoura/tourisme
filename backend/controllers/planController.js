const Plan = require('../models/Plan');
const Guide = require('../models/Guide');
const PlanLieu = require('../models/PlanLieu');
const db = require('../config/db');

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
};

// Helper function to truncate text
const truncateText = (text, maxLength = 150) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Get all plans for a guide
 */
exports.getGuidePlans = async (req, res) => {
  const userId = req.session.user.id;

  try {
    console.log('🔍 userId:', userId);
    const guide = await Guide.findByUserId(userId);
    console.log('🔍 guide trouvé:', guide);
    
    if (!guide) {
      return res.status(404).send('Guide not found');
    }

    console.log('🔍 guide.id_utilisateur:', guide.id_utilisateur);
    const plans = await Plan.findByGuide(guide.id_utilisateur);
    console.log('🔍 plans trouvés:', plans);
    
    // Format dates and truncate descriptions for better display
    const formattedPlans = plans.map(plan => ({
      ...plan,
      date_debut_formatee: formatDate(plan.date_debut),
      date_fin_formatee: formatDate(plan.date_fin),
      periode: `${formatDate(plan.date_debut)} - ${formatDate(plan.date_fin)}`,
      description_courte: truncateText(plan.description, 150)
    }));
    
    res.render('guide/plans', {
      user: req.session.user,
      plans: formattedPlans,
      guide,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error getting guide plans:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Get form to create a new plan
 */
exports.getNewPlan = async (req, res) => {
  try {
    const [gouvernorats] = await db.query('SELECT * FROM gouvernorats ORDER BY nom');
    const [delegations] = await db.query(`
      SELECT d.*, g.nom as gouvernorat_nom 
      FROM delegations d 
      LEFT JOIN gouvernorats g ON d.id_gouvernorat = g.id 
      ORDER BY d.nom
    `);

    res.render('guide/create-plan', {
      user: req.session.user,
      governorates: gouvernorats,
      delegations: delegations,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error getting new plan form:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Create a new plan
 */
exports.createPlan = async (req, res) => {
  const userId = req.session.user.id;
  
  // CRITICAL DEBUGGING - Check what's actually received
  console.log("=== CRITICAL DEBUGGING ===");
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  console.log("BODY KEYS:", Object.keys(req.body));
  console.log("CONTENT-TYPE:", req.get('Content-Type'));
  console.log("========================");
  
  // Extract fields with proper handling
  const { 
    titre, 
    description, 
    date_debut, 
    date_fin, 
    prix, 
    max_participants, 
    id_gouvernorat, 
    id_delegation, 
    lieux 
  } = req.body;

  // Debug logging for each field
  console.log('Extracted fields:', {
    titre: titre ? `"${titre}"` : 'undefined',
    description: description ? `"${description.substring(0, 50)}..."` : 'undefined',
    date_debut,
    date_fin,
    prix,
    max_participants,
    id_gouvernorat,
    id_delegation,
    lieux: Array.isArray(lieux) ? `${lieux.length} items` : lieux,
    file: req.file ? req.file.filename : 'No file'
  });

  try {
    // Use model validation
    const validationErrors = Plan.validatePlanData(req.body);
    
    if (validationErrors.length > 0) {
      console.log('Validation failed. Missing/invalid fields:', validationErrors);
      return res.status(400).render('guide/create-plan', {
        user: req.session.user,
        error: `Champs requis manquants ou invalides: ${validationErrors.join(', ')}`,
        formData: req.body
      });
    }

    // Get guide information
    const guide = await Guide.findByUserId(userId);

    if (!guide) {
      return res.status(404).render('guide/create-plan', {
        user: req.session.user,
        error: 'Guide non trouvé',
        formData: req.body
      });
    }

    // Handle image upload
    let imagePath = null;
    if (req.file) {
      console.log('File uploaded:', req.file);
      imagePath = `/uploads/plan-images/${req.file.filename}`;
    } else {
      console.log('No file uploaded - this is optional');
    }

    // Prepare plan data
    const planData = {
      id_guide: guide.id_utilisateur,
      titre: titre.trim(),
      description: description.trim(),
      date_debut,
      date_fin,
      prix: parseFloat(prix),
      max_participants: parseInt(max_participants),
      id_gouvernorat: parseInt(id_gouvernorat),
      id_delegation: parseInt(id_delegation),
      image: imagePath
    };

    // Create plan using model
    const planId = await Plan.create(planData);
    
    // Handle lieux if provided
    if (lieux) {
      const lieuxArray = Array.isArray(lieux) ? lieux : [lieux];
      
      for (const lieuId of lieuxArray) {
        await PlanLieu.create({
          id_plan: planId,
          id_delegation: lieuId
        });
      }
    }

    console.log('Plan created successfully with ID:', planId);
    res.redirect('/guide/plans?success=Plan créé avec succès');
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).render('guide/create-plan', {
      user: req.session.user,
      error: 'Erreur lors de la création du plan: ' + error.message,
      formData: req.body
    });
  }
};

/**
 * Get form to edit a plan
 */
exports.getEditPlan = async (req, res) => {
  const planId = req.params.id;
  const userId = req.session.user.id;

  try {
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).render('guide/plans', {
        user: req.session.user,
        error: 'Plan non trouvé',
        plans: []
      });
    }

    const isOwner = await Plan.checkPlanOwnership(planId, userId);
    if (!isOwner) {
      return res.status(403).render('guide/plans', {
        user: req.session.user,
        error: 'Vous n\'êtes pas autorisé à modifier ce plan',
        plans: []
      });
    }

    const [gouvernorats] = await db.query('SELECT * FROM gouvernorats ORDER BY nom');
    const [delegations] = await db.query(`
      SELECT d.*, g.nom as gouvernorat_nom 
      FROM delegations d 
      LEFT JOIN gouvernorats g ON d.id_gouvernorat = g.id 
      ORDER BY d.nom
    `);

    // Get current lieux for this plan
    const [currentLieux] = await db.query(`
      SELECT id_delegation FROM plan_lieux WHERE id_plan = ?
    `, [planId]);

    const currentLieuxIds = currentLieux.map(l => l.id_delegation);

    res.render('guide/edit-plan', {
      user: req.session.user,
      plan: {
        ...plan,
        date_debut: plan.date_debut ? new Date(plan.date_debut).toISOString().split('T')[0] : '',
        date_fin: plan.date_fin ? new Date(plan.date_fin).toISOString().split('T')[0] : ''
      },
      governorates: gouvernorats,
      delegations: delegations,
      currentLieuxIds,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error getting edit plan form:', err);
    res.status(500).render('guide/plans', {
      user: req.session.user,
      error: 'Erreur serveur',
      plans: []
    });
  }
};

/**
 * Get plan details
 */
exports.getPlanDetails = async (req, res) => {
  const planId = req.params.id;

  try {
    const plan = await Plan.getFullDetails(planId);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(plan);
  } catch (err) {
    console.error('Error getting plan details:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get plan for view (HTML page)
 */
exports.getPlanForView = async (req, res) => {
  const planId = req.params.id;

  try {
    const plan = await Plan.getFullDetails(planId);
    if (!plan) {
      return res.redirect('/plans?error=Plan non trouvé');
    }

    res.render('plans/show', {
      user: req.session.user,
      plan
    });
  } catch (err) {
    console.error('Error getting plan view:', err);
    res.redirect('/plans?error=Erreur serveur');
  }
};

/**
 * Update a plan
 */
exports.updatePlan = async (req, res) => {
  const planId = req.params.id;
  const { titre, description, date_debut, date_fin, prix } = req.body;
  const userId = req.session.user.id;

  try {
    const isOwner = await Plan.checkPlanOwnership(planId, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Plan.update(planId, { titre, description, date_debut, date_fin, prix });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating plan:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a plan
 */
exports.deletePlan = async (req, res) => {
  const planId = req.params.id;
  const userId = req.session.user.id;

  try {
    const isOwner = await Plan.checkPlanOwnership(planId, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Plan.delete(planId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting plan:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all available plans (for tourists and public)
 */
exports.getAllPlans = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
      gouvernorat_id: req.query.gouvernorat_id
    };

    const plans = await Plan.findAllWithFilters(filters);
    const [gouvernorats] = await db.query('SELECT * FROM gouvernorats ORDER BY nom');
    
    const template = req.session.user ? 'touriste/plans' : 'public/plans';
    
    res.render(template, {
      user: req.session.user,
      plans,
      governorates: gouvernorats,
      currentFilters: filters
    });
  } catch (err) {
    console.error('Error getting all plans:', err);
    res.status(500).send('Server error');
  }
};
