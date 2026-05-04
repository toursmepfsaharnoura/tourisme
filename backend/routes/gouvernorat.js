const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * Routes pour les gouvernorats
 * API endpoints pour accéder aux données des gouvernorats
 */

// Récupérer tous les gouvernorats
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, nom, 
             CASE 
               WHEN image IS NULL OR image = '' THEN NULL
               WHEN image LIKE '%\r\n%' THEN NULL
               WHEN image LIKE '%\\r\\n%' THEN NULL
               ELSE TRIM(image)
             END as image
      FROM gouvernorats
      ORDER BY nom
    `);
    
    // Nettoyer et valider les images
    const cleanedRows = rows.map(g => ({
      id: g.id,
      nom: g.nom,
      image: g.image && g.image.startsWith('http') ? g.image : null
    }));
    
    res.json({
      success: true,
      count: cleanedRows.length,
      gouvernorats: cleanedRows
    });
  } catch (error) {
    console.error('Get all gouvernorats error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des gouvernorats'
    });
  }
});

// Récupérer les délégations d'un gouvernorat
router.get('/:id/delegations', async (req, res) => {
  try {
    const gouvernoratId = req.params.id;
    
    // Vérifier si le gouvernorat existe
    const [gouvernoratCheck] = await db.query('SELECT id, nom FROM gouvernorats WHERE id = ?', [gouvernoratId]);
    if (gouvernoratCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gouvernorat non trouvé'
      });
    }
    
    const [rows] = await db.query(`
      SELECT id, nom, id_gouvernorat,
             CASE WHEN image IS NULL OR image = '' THEN NULL ELSE image END as image
      FROM delegations
      WHERE id_gouvernorat = ?
      ORDER BY nom
    `, [gouvernoratId]);
    
    res.json({
      success: true,
      count: rows.length,
      gouvernorat: {
        id: gouvernoratCheck[0].id,
        nom: gouvernoratCheck[0].nom
      },
      delegations: rows.map(d => ({
        id: d.id,
        nom: d.nom,
        image: d.image
      }))
    });
  } catch (error) {
    console.error('Get delegations by gouvernorat error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des délégations'
    });
  }
});

// Récupérer un gouvernorat par ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, nom, image
      FROM gouvernorats
      WHERE id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gouvernorat non trouvé'
      });
    }

    res.json({
      success: true,
      gouvernorat: rows[0]
    });
  } catch (error) {
    console.error('Get gouvernorat by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du gouvernorat'
    });
  }
});

// Créer un gouvernorat
router.post('/', async (req, res) => {
  try {
    const { nom, image } = req.body;
    
    if (!nom) {
      return res.status(400).json({
        success: false,
        error: 'Le nom du gouvernorat est requis'
      });
    }
    
    const [result] = await db.query(`
      INSERT INTO gouvernorats (nom, image)
      VALUES (?, ?)
    `, [nom, image || null]);
    
    res.status(201).json({
      success: true,
      message: 'Gouvernorat créé avec succès',
      gouvernorat: {
        id: result.insertId,
        nom,
        image
      }
    });
  } catch (error) {
    console.error('Create gouvernorat error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du gouvernorat'
    });
  }
});

// Mettre à jour un gouvernorat
router.put('/:id', async (req, res) => {
  try {
    const { nom, image } = req.body;
    const id = req.params.id;
    
    // Vérifier si le gouvernorat existe
    const [existing] = await db.query('SELECT id FROM gouvernorats WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gouvernorat non trouvé'
      });
    }
    
    const [result] = await db.query(`
      UPDATE gouvernorats 
      SET nom = ?, image = ?
      WHERE id = ?
    `, [nom, image || null, id]);
    
    res.json({
      success: true,
      message: 'Gouvernorat mis à jour avec succès',
      gouvernorat: {
        id,
        nom,
        image
      }
    });
  } catch (error) {
    console.error('Update gouvernorat error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du gouvernorat'
    });
  }
});

// Supprimer un gouvernorat
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    // Vérifier si le gouvernorat existe
    const [existing] = await db.query('SELECT id FROM gouvernorats WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gouvernorat non trouvé'
      });
    }
    
    await db.query('DELETE FROM gouvernorats WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Gouvernorat supprimé avec succès'
    });
  } catch (error) {
    console.error('Delete gouvernorat error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du gouvernorat'
    });
  }
});

// API endpoint for list (alternative endpoint)
router.get('/api/list', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, nom, 
             CASE 
               WHEN image IS NULL OR image = '' THEN NULL
               WHEN image LIKE '%\r\n%' THEN NULL
               WHEN image LIKE '%\\r\\n%' THEN NULL
               ELSE TRIM(image)
             END as image
      FROM gouvernorats
      ORDER BY nom
    `);
    
    // Nettoyer et valider les images
    const cleanedRows = rows.map(g => ({
      id: g.id,
      nom: g.nom,
      image: g.image && g.image.startsWith('http') ? g.image : null
    }));
    
    res.json({
      success: true,
      count: cleanedRows.length,
      gouvernorats: cleanedRows
    });
  } catch (error) {
    console.error('Get all gouvernorats API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des gouvernorats'
    });
  }
});

module.exports = router;
