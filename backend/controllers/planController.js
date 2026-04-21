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
<<<<<<< HEAD
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
=======
>>>>>>> main
 * Get form to create a new plan
 */
exports.getNewPlan = async (req, res) => {
  try {
<<<<<<< HEAD
    const [gouvernorats] = await db.query('SELECT * FROM gouvernorats ORDER BY nom');
    const [delegations] = await db.query(`
=======
    const userId = req.session.user.id;

    // 🔥 نجيب guide
    const guide = await Guide.findByUserId(userId);

    // 🔥 نتحقق من date_fin
    const today = new Date();
    const dateFin = guide?.abonnement_fin ? new Date(guide.abonnement_fin) : null;

    if (!dateFin || dateFin < today) {
      return res.send("❌ Votre abonnement a expiré. Veuillez renouveler votre abonnement.");
    }

    // ✅ إذا abonnement valide
    const delegations = await db.query(`
>>>>>>> main
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
const validatePlanDates = (date_debut, date_fin) => {
  const parse = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const start = parse(date_debut);
  const end = parse(date_fin);
  if (!start || !end) {
    return 'Veuillez fournir des dates de début et de fin valides.';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    return 'La date de début doit être aujourd\'hui ou une date future.';
  }

  if (end < start) {
    return 'La date de fin doit être postérieure ou égale à la date de début.';
  }

  return null;
};

exports.getEditPlan = async (req, res) => {
  const planId = req.params.id;
  const userId = req.session.user.id;

  try {
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.redirect('/guide/plans?error=Plan introuvable');
    }

    if (plan.id_guide !== userId) {
      return res.redirect('/guide/plans?error=Vous n\'avez pas accès à ce plan');
    }

    res.render('guide/edit-plan', {
      plan,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error(error);
    res.redirect('/guide/plans?error=Erreur lors du chargement');
  }
};

/**
 * Create a new plan
 */
// À mettre à la place de l'ancien createPlan
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
 * Get plan details for guide (owner only)
 */
exports.getPlanDetails = async (req, res) => {
  const planId = req.params.id;
  const userId = req.session.user.id;

  try {
    const plan = await Plan.getFullDetails(planId);

    if (!plan) {
      return res.status(404).render('404', { url: req.originalUrl });
    }

    // Check if user owns this plan
    const guide = await Guide.findByUserId(userId);
    if (!guide || plan.id_guide !== guide.id) {
      return res.status(403).render('guide/non-valide', {
        user: req.session.user,
        message: "Vous n'avez pas accès à ce plan."
      });
    }

    res.render('guide/plan-details', {
      user: req.session.user,
      plan,
      success: req.query.success || null,
      error: req.query.error || null,
      layout: 'minimal'
    });
  } catch (err) {
    console.error('Error getting plan details:', err);
    res.status(500).send('Server error');
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
  const { titre, description, date_debut, date_fin, prix, capacite_max } = req.body;
  const userId = req.session.user.id;

  try {
<<<<<<< HEAD
    const isOwner = await Plan.checkPlanOwnership(planId, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
=======
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.redirect('/guide/plans?error=' + encodeURIComponent('Plan introuvable.'));
    }

    if (plan.id_guide !== userId) {
      return res.redirect('/guide/plans?error=' + encodeURIComponent('Vous n\'avez pas accès à ce plan.'));
>>>>>>> main
    }

    const dateError = validatePlanDates(date_debut, date_fin);
    if (dateError) {
      return res.redirect(`/guide/plans/${planId}/edit?error=${encodeURIComponent(dateError)}`);
    }

    const capacity = parseInt(capacite_max, 10);
    if (Number.isNaN(capacity) || capacity <= 0) {
      return res.redirect(`/guide/plans/${planId}/edit?error=${encodeURIComponent('Veuillez renseigner une capacité maximale de personnes valide.')}`);
    }

    await Plan.update(planId, { titre, description, date_debut, date_fin, prix, capacite_max: capacity });
    res.redirect(`/guide/plans/${planId}?success=${encodeURIComponent('Plan modifié avec succès.')}`);
  } catch (err) {
    console.error('Error updating plan:', err);
<<<<<<< HEAD
    res.status(500).json({ error: err.message });
=======
    res.redirect(`/guide/plans/${planId}/edit?error=${encodeURIComponent('Erreur serveur lors de la modification.')}`);
>>>>>>> main
  }
};

/**
 * Delete a plan
 */
exports.deletePlan = async (req, res) => {
  const planId = req.params.id;
  const userId = req.session.user.id;

  try {
<<<<<<< HEAD
    const isOwner = await Plan.checkPlanOwnership(planId, userId);
    if (!isOwner) {
=======
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (plan.id_guide !== userId) {
>>>>>>> main
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
 * Add a lieu to a plan
 */
exports.addLieuToPlan = async (req, res) => {
  const planId = req.params.id;
const { type, nom, description, date_visite } = req.body;
  const userId = req.session.user.id;
  const imagePath = req.file ? `/uploads/lieu/${req.file.filename}` : null;

  try {
    // Check if user owns this plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const guide = await Guide.findByUserId(userId);
    if (!guide || plan.id_guide !== guide.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!type || !['hotel', 'restaurant', 'lieu'].includes(type)) {
      return res.status(400).json({ error: 'Type de lieu invalide' });
    }

    const fullPlan = await Plan.getFullDetails(planId);
    const defaultDelegation = fullPlan.delegations && fullPlan.delegations[0] ? fullPlan.delegations[0].id_delegation : null;
    if (!defaultDelegation) {
      return res.status(400).json({ error: 'Aucune délégation définie pour ce plan. Sélectionnez une délégation lors de la création du plan.' });
    }

    const typeMap = {
      hotel: 'HOTEL',
      restaurant: 'RESTAURANT',
      lieu: 'AUTRE'
    };
    const dbType = typeMap[type];

    await PlanLieu.create({
      id_plan: planId,
      id_delegation: defaultDelegation,
      type: dbType,
      image: imagePath,
      nom: nom && nom.trim() ? nom.trim() : null,
      description: description && description.trim() ? description.trim() : null,
      date_visite: date_visite || null
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error adding lieu to plan:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Remove a lieu from a plan
 */
exports.removeLieuFromPlan = async (req, res) => {
  const planId = req.params.id;
  const planLieuId = req.params.lieuId;
  const userId = req.session.user.id;

  try {
    // Check if user owns this plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const guide = await Guide.findByUserId(userId);
    if (!guide || plan.id_guide !== guide.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete the plan_lieu entry
    const [result] = await db.query(
      'DELETE FROM plan_lieux WHERE id = ? AND id_plan = ?',
      [planLieuId, planId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lieu not found in plan' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error removing lieu from plan:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Duplicate a plan
 */
exports.duplicatePlan = async (req, res) => {
  const planId = req.params.id;
  const userId = req.session.user.id;

  try {
    // Check if user owns this plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const guide = await Guide.findByUserId(userId);
    if (!guide || plan.id_guide !== guide.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create new plan with modified title
    const newPlanId = await Plan.create({
      id_guide: guide.id,
      titre: `${plan.titre} (Copie)`,
      description: plan.description,
      date_debut: plan.date_debut,
      date_fin: plan.date_fin,
      prix: plan.prix
    });

    // Copy all lieux
    const [lieux] = await db.query('SELECT id_delegation FROM plan_lieux WHERE id_plan = ?', [planId]);
    for (const lieu of lieux) {
      await PlanLieu.create({
        id_plan: newPlanId,
        id_delegation: lieu.id_delegation
      });
    }

    res.json({ success: true, newPlanId });
  } catch (err) {
    console.error('Error duplicating plan:', err);
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
    
    const template = req.session.user ? 'touriste/plans' : 'plans';
    
    res.render(template, {
      user: req.session.user,
      plans,
<<<<<<< HEAD
      governorates: gouvernorats,
      currentFilters: filters
=======
      layout: false
>>>>>>> main
    });
  } catch (err) {
    console.error('Error getting all plans:', err);
    res.status(500).send('Server error');
  }
};
