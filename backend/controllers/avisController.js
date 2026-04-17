const Avis = require('../models/Avis');
const Plan = require('../models/Plan');
const User = require('../models/User');

/**
 * Create a new review/avis
 */
exports.createAvis = async (req, res) => {
  const touristeId = req.session.user.id;
  const { id_plan, note, commentaire } = req.body;

  try {
    // Check if plan exists
    const plan = await Plan.findById(id_plan);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check if user already reviewed this plan
    const existingAvis = await Avis.findByTouristAndPlan(touristeId, id_plan);
    if (existingAvis) {
      return res.status(400).json({ error: 'You have already reviewed this plan' });
    }

    const avisId = await Avis.create({
      id_guide: plan.id_guide,
      id_touriste: touristeId,
      id_plan,
      note,
      commentaire
    });

    res.json({ success: true, avisId });
  } catch (err) {
    console.error('Error creating avis:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all reviews for a plan
 */
exports.getPlanAvis = async (req, res) => {
  const planId = req.params.planId;

  try {
    const avis = await Avis.findByPlan(planId);
    
    // Enrich with tourist details
    const enrichedAvis = await Promise.all(
      avis.map(async (review) => {
        const tourist = await User.findById(review.id_touriste);
        return { ...review, tourist };
      })
    );

    res.json(enrichedAvis);
  } catch (err) {
    console.error('Error getting plan avis:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all reviews written by a tourist
 */
exports.getTouristAvis = async (req, res) => {
  const touristeId = req.session.user.id;

  try {
    const avis = await Avis.findByTourist(touristeId);
    
    // Enrich with plan details
    const enrichedAvis = await Promise.all(
      avis.map(async (review) => {
        const plan = await Plan.findById(review.id_plan);
        return { ...review, plan };
      })
    );

    res.render('touriste/avis', {
      user: req.session.user,
      avis: enrichedAvis
    });
  } catch (err) {
    console.error('Error getting tourist avis:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Get all reviews for guide's plans
 */
exports.getGuideAvis = async (req, res) => {
  const guideId = req.session.user.id;

  try {
    const avis = await Avis.findByGuide(guideId);
    
    // Enrich with plan and tourist details
    const enrichedAvis = await Promise.all(
      avis.map(async (review) => {
        const [plan, tourist] = await Promise.all([
          Plan.findById(review.id_plan),
          User.findById(review.id_touriste)
        ]);
        return { ...review, plan, tourist };
      })
    );

    res.render('guide/avis', {
      user: req.session.user,
      avis: enrichedAvis,
      layout: 'minimal'
    });
  } catch (err) {
    console.error('Error getting guide avis:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Update a review
 */
exports.updateAvis = async (req, res) => {
  const avisId = req.params.id;
  const { note, commentaire } = req.body;
  const userId = req.session.user.id;

  try {
    const avis = await Avis.findById(avisId);
    if (!avis) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user owns this review
    if (avis.id_touriste !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Avis.update(avisId, { note, commentaire });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating avis:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete a review
 */
exports.deleteAvis = async (req, res) => {
  const avisId = req.params.id;
  const userId = req.session.user.id;

  try {
    const avis = await Avis.findById(avisId);
    if (!avis) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user owns this review
    if (avis.id_touriste !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Avis.delete(avisId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting avis:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
