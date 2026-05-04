const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * Routes publiques pour les plans touristiques
 * API endpoints pour accéder aux données des plans sans authentification
 */

// Récupérer tous les plans touristiques
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.titre, p.description, p.prix, p.max_participants, p.capacite_max,
             p.date_debut, p.date_fin, p.image,
             u.nom_complet as guide_nom,
             g.nom as gouvernorat_nom
      FROM plans_touristiques p
      LEFT JOIN utilisateurs u ON p.id_guide = u.id
      LEFT JOIN gouvernorats g ON p.id_gouvernorat = g.id
      ORDER BY p.titre
    `);
    
    res.json({
      success: true,
      count: rows.length,
      plans: rows
    });
  } catch (error) {
    console.error('Get all plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des plans'
    });
  }
});

// Récupérer un plan par ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.titre, p.description, p.prix, p.max_participants, p.capacite_max,
             p.date_debut, p.date_fin, p.image,
             u.nom_complet as guide_nom,
             g.nom as gouvernorat_nom
      FROM plans_touristiques p
      LEFT JOIN utilisateurs u ON p.id_guide = u.id
      LEFT JOIN gouvernorats g ON p.id_gouvernorat = g.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plan non trouvé'
      });
    }

    res.json({
      success: true,
      plan: rows[0]
    });
  } catch (error) {
    console.error('Get plan by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du plan'
    });
  }
});

// API endpoint for list (alternative endpoint)
router.get('/api/list', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.titre, p.description, p.prix, p.max_participants, p.capacite_max,
             p.date_debut, p.date_fin, p.image,
             u.nom_complet as guide_nom,
             g.nom as gouvernorat_nom
      FROM plans_touristiques p
      LEFT JOIN utilisateurs u ON p.id_guide = u.id
      LEFT JOIN gouvernorats g ON p.id_gouvernorat = g.id
      ORDER BY p.titre
    `);
    
    res.json({
      success: true,
      count: rows.length,
      plans: rows
    });
  } catch (error) {
    console.error('Get all plans API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des plans'
    });
  }
});

module.exports = router;
