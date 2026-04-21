const db = require('../config/db');

class Plan {
  // Helper function to parse dates correctly
  static parseDate(dateString) {
    if (!dateString) return null;
    
    // If format is YYYY-MM-DD (input type="date")
    if (dateString.includes('-')) {
      return new Date(dateString);
    }
    
    // If format is DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    
    return null;
  }

  // Business logic: Validate plan data
  static validatePlanData(data) {
    const errors = [];
    
    if (!data.titre || data.titre.trim().length < 3) {
      errors.push('Le titre doit contenir au moins 3 caractères');
    }
    
    if (!data.description || data.description.trim().length < 10) {
      errors.push('La description doit contenir au moins 10 caractères');
    }
    
    if (!data.date_debut || !data.date_fin) {
      errors.push('Les dates de début et de fin sont requises');
    }
    
    // Enhanced date validation
    if (data.date_debut && data.date_fin) {
      const debut = this.parseDate(data.date_debut);
      const fin = this.parseDate(data.date_fin);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (!debut || !fin) {
        errors.push('Format de date invalide');
      } else {
        if (debut < today) {
          errors.push('La date de début doit être aujourd\'hui ou dans le futur');
        }
        
        if (fin <= debut) {
          errors.push('La date de fin doit être strictement après la date de début');
        }
      }
    }
    
    if (!data.prix || parseFloat(data.prix) < 0) {
      errors.push('Le prix doit être un nombre positif');
    }
    
    if (!data.max_participants || parseInt(data.max_participants) < 1 || parseInt(data.max_participants) > 100) {
      errors.push('Le nombre de participants doit être entre 1 et 100');
    }
    
    if (!data.id_gouvernorat || parseInt(data.id_gouvernorat) < 1) {
      errors.push('Le gouvernorat est requis');
    }
    
    if (!data.id_delegation || parseInt(data.id_delegation) < 1) {
      errors.push('La délégation est requise');
    }
    
    return errors;
  }

  // Business logic: Check if guide owns plan
  static async checkPlanOwnership(planId, userId) {
    const [plan] = await db.query(`
      SELECT p.* FROM plans_touristiques p
      JOIN guides g ON p.id_guide = g.id_utilisateur
      WHERE p.id = ? AND g.id_utilisateur = ?
    `, [planId, userId]);
    
    return plan.length > 0;
  }

  // Business logic: Get all plans with filtering and search
  static async findAllWithFilters(filters = {}) {
    let query = `
      SELECT p.*, 
             u.nom_complet as guide_nom, u.email as guide_email, u.photo_profil as guide_photo,
             g.statut as guide_statut, g.abonnement_actif as guide_abonnement
      FROM plans_touristiques p
      LEFT JOIN guides g ON p.id_guide = g.id_utilisateur
      LEFT JOIN utilisateurs u ON g.id_utilisateur = u.id
      WHERE g.statut = 'ACTIF' AND g.abonnement_actif = 1
    `;
    
    const params = [];
    
    if (filters.search) {
      query += ` AND (p.titre LIKE ? OR p.description LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    if (filters.min_price) {
      query += ` AND p.prix >= ?`;
      params.push(filters.min_price);
    }
    
    if (filters.max_price) {
      query += ` AND p.prix <= ?`;
      params.push(filters.max_price);
    }
    
    query += ` ORDER BY p.date_debut DESC`;
    
    const [plans] = await db.query(query, params);
    return plans;
  }

  // Data access: Get all plans
  static async findAll() {
    return await this.findAllWithFilters();
  }

  // Data access: Get all plans with details
  static async findAllWithDetails() {
    return await this.findAllWithFilters();
  }

  static async findByGuide(guideId) {
    const [rows] = await db.query(`
      SELECT p.*, COALESCE((SELECT SUM(nombre_personnes) FROM reservations r WHERE r.id_plan = p.id AND r.statut = 'CONFIRMEE'), 0) as reserved_personnes
      FROM plans_touristiques p
      WHERE id_guide = ?
      ORDER BY date_debut DESC
    `, [guideId]);
    rows.forEach(plan => {
      plan.places_restantes = plan.capacite_max != null ? Math.max(0, plan.capacite_max - plan.reserved_personnes) : null;
    });
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(`
      SELECT p.*, 
             u.nom_complet as guide_nom, u.email as guide_email, u.photo_profil as guide_photo,
             g.statut as guide_statut, g.abonnement_actif as guide_abonnement
      FROM plans_touristiques p
      LEFT JOIN guides g ON p.id_guide = g.id_utilisateur
      LEFT JOIN utilisateurs u ON g.id_utilisateur = u.id
      WHERE p.id = ?
    `, [id]);
    return rows[0];
  }

  // Data access: Create plan with validation
  static async create(data) {
    const errors = this.validatePlanData(data);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    const { id_guide, titre, description, date_debut, date_fin, prix, max_participants, id_gouvernorat, id_delegation, image } = data;
    const [result] = await db.query(
      `INSERT INTO plans_touristiques (id_guide, titre, description, date_debut, date_fin, prix, max_participants, id_gouvernorat, id_delegation, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_guide, titre, description, date_debut, date_fin, prix, max_participants, id_gouvernorat, id_delegation, image]
    );
    
    return result.insertId;
  }

  // Validation pour vérifier que les délégations existent
  static async validateDelegations(delegationIds) {
    if (!delegationIds || !Array.isArray(delegationIds)) {
      return [];
    }
    
    const placeholders = delegationIds.map(() => '?').join(',');
    const [existingDelegations] = await db.query(
      `SELECT id FROM delegations WHERE id IN (${placeholders})`,
      delegationIds
    );
    
    const existingIds = existingDelegations.map(d => d.id);
    const invalidIds = delegationIds.filter(id => !existingIds.includes(id));
    
    return invalidIds;
  }

  // Data access: Update plan with validation
  static async update(id, updates) {
    const errors = this.validatePlanData(updates);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    const allowedFields = ['titre', 'description', 'date_debut', 'date_fin', 'prix', 'max_participants', 'id_gouvernorat', 'id_delegation', 'image'];
    const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return false;

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, val]) => val);
    values.push(id);

    const [result] = await db.query(`UPDATE plans_touristiques SET ${setClause} WHERE id = ?`, values);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    await db.query('DELETE FROM plan_lieux WHERE id_plan = ?', [id]);
    const [result] = await db.query('DELETE FROM plans_touristiques WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getFullDetails(planId) {
    const [plan] = await db.query(`
      SELECT p.*, 
             u.nom_complet as guide_nom, u.email as guide_email, u.photo_profil as guide_photo,
             g.statut as guide_statut, g.abonnement_actif as guide_abonnement
      FROM plans_touristiques p
      LEFT JOIN guides g ON p.id_guide = g.id_utilisateur
      LEFT JOIN utilisateurs u ON g.id_utilisateur = u.id
      WHERE p.id = ?
    `, [planId]);
    
    if (!plan[0]) return null;

    // Get lieux for this plan
    const [lieux] = await db.query(`
      SELECT pl.*, d.nom as delegation_nom, gov.nom as gouvernorat_nom
      FROM plan_lieux pl
      LEFT JOIN delegations d ON pl.id_delegation = d.id
      LEFT JOIN gouvernorats gov ON d.id_gouvernorat = gov.id
      WHERE pl.id_plan = ?
    `, [planId]);

    const delegations = lieux.filter(lieu => !lieu.type && !lieu.image);
    const actualLieux = lieux.filter(lieu => lieu.type || lieu.image);

    const planData = {
      ...plan[0],
      lieux: lieux || []
    };

    planData.places_restantes = planData.capacite_max != null ? Math.max(0, planData.capacite_max - planData.reserved_personnes) : null;

    return planData;
  }
}

module.exports = Plan;
