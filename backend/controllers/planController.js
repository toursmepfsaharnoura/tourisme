const Plan = require('../models/Plan');
const Guide = require('../models/Guide');
const PlanLieu = require('../models/PlanLieu');
const Delegation = require('../models/Delegation');
const Gouvernorat = require('../models/Gouvernorat');
const User = require('../models/User');
const db = require('../config/db');

/**
 * Get form to create a new plan
 */
exports.getNewPlan = async (req, res) => {
  try {
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
      SELECT d.*, g.nom as gouvernorat_nom 
      FROM delegations d 
      LEFT JOIN gouvernorats g ON d.id_gouvernorat = g.id 
      ORDER BY d.nom
    `);

    res.render('guide/create-plan', {
      user: req.session.user,
      delegations: delegations[0]
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
  const { titre, description, date_debut, date_fin, prix, capacite_max } = req.body;
  const lieux = req.body.delegations || req.body['delegations[]'] || req.body.lieux || req.body['lieux[]'];

  try {
    const dateError = validatePlanDates(date_debut, date_fin);
    if (dateError) {
      return res.redirect('/guide/create-plan?error=' + encodeURIComponent(dateError));
    }

    const capacity = parseInt(capacite_max, 10);
    if (Number.isNaN(capacity) || capacity <= 0) {
      return res.redirect('/guide/create-plan?error=' + encodeURIComponent('Veuillez renseigner une capacité maximale de personnes valide.'));
    }
    // 1. Vérifier ou créer l'entrée dans la table guides
    let guide = await Guide.findByUserId(userId);
    if (!guide) {
      await Guide.create(userId);
      guide = await Guide.findByUserId(userId);
      
    }

    // 2. Créer le plan
    const planId = await Plan.create({
      id_guide: guide.id,
      titre,
      description,
      date_debut,
      date_fin,
      prix,
      capacite_max: capacity
    });

    // 3. Ajouter les lieux (si existent)
    const delegationIds = Array.isArray(lieux)
      ? lieux
      : lieux
        ? [lieux]
        : [];

    const selectedDelegations = delegationIds
      .map(id => parseInt(id, 10))
      .filter(id => !Number.isNaN(id));

    if (selectedDelegations.length === 0) {
      return res.redirect('/guide/create-plan?error=' + encodeURIComponent('Veuillez sélectionner au moins une délégation pour votre plan.'));
    }

    for (const lieuId of selectedDelegations) {
      await PlanLieu.create({ id_plan: planId, id_delegation: lieuId });
    }

    res.redirect('/guide/plans?success=Plan créé');
  } catch (err) {
    console.error('❌ Erreur creation plan:', err);
    res.redirect('/guide/create-plan?error=' + encodeURIComponent(err.message));
  }
};

// À mettre à la place de l'ancien getGuidePlans
exports.getGuidePlans = async (req, res) => {
  const userId = req.session.user.id;
  try {
    let guide = await Guide.findByUserId(userId);
    if (!guide) {
      await Guide.create(userId);
      guide = await Guide.findByUserId(userId);
    }
    const plans = await Plan.findByGuide(guide.id);
    res.render('guide/plans', {
      user: req.session.user,
      plans,
      success: req.query.success || null,
      error: req.query.error || null,
      layout: 'minimal'
    });
  } catch (err) {
    console.error('Erreur getGuidePlans:', err);
    res.status(500).send('Erreur serveur');
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
 * Update a plan
 */
exports.updatePlan = async (req, res) => {
  const planId = req.params.id;
  const { titre, description, date_debut, date_fin, prix, capacite_max } = req.body;
  const userId = req.session.user.id;

  try {
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.redirect('/guide/plans?error=' + encodeURIComponent('Plan introuvable.'));
    }

    if (plan.id_guide !== userId) {
      return res.redirect('/guide/plans?error=' + encodeURIComponent('Vous n\'avez pas accès à ce plan.'));
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
    res.redirect(`/guide/plans/${planId}/edit?error=${encodeURIComponent('Erreur serveur lors de la modification.')}`);
  }
};

/**
 * Delete a plan
 */
exports.deletePlan = async (req, res) => {
  const planId = req.params.id;
  const userId = req.session.user.id;

  try {
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (plan.id_guide !== userId) {
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
    const plans = await Plan.findAllWithDetails();
    
    // Use public view for non-authenticated users, tourist view for logged-in users
    const template = req.session.user ? 'touriste/plans' : 'plans';
    
    res.render(template, {
      user: req.session.user,
      plans,
      layout: false
    });
  } catch (err) {
    console.error('Error getting all plans:', err);
    res.status(500).send('Server error');
  }
};
