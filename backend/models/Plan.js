const db = require('../config/db');

class Plan {
  static async findAll() {
    const [rows] = await db.query('SELECT * FROM plans_touristiques ORDER BY date_debut DESC');
    return rows;
  }

  static async findAllWithDetails() {
    const [plans] = await db.query(`
      SELECT p.*, 
             u.nom_complet as guide_nom, u.email as guide_email, u.photo_profil as guide_photo,
             g.statut as guide_statut, g.abonnement_actif as guide_abonnement,
             GROUP_CONCAT(DISTINCT d.nom ORDER BY d.nom SEPARATOR ', ') as delegations,
             GROUP_CONCAT(DISTINCT gvr.nom ORDER BY gvr.nom SEPARATOR ', ') as gouvernorats
      FROM plans_touristiques p
      LEFT JOIN guides g ON p.id_guide = g.id_utilisateur
      LEFT JOIN utilisateurs u ON g.id_utilisateur = u.id
      LEFT JOIN plan_lieux pl ON p.id = pl.id_plan
      LEFT JOIN delegations d ON pl.id_delegation = d.id
      LEFT JOIN gouvernorats gvr ON d.id_gouvernorat = gvr.id
      WHERE g.statut = 'VALIDE' AND g.abonnement_actif = 1
      GROUP BY p.id
      ORDER BY p.date_debut DESC
    `);
    return plans;
  }

  static async findByGuide(guideId) {
    const [rows] = await db.query('SELECT * FROM plans_touristiques WHERE id_guide = ? ORDER BY date_debut DESC', [guideId]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM plans_touristiques WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(data) {
    const { id_guide, titre, description, date_debut, date_fin, prix } = data;
    const [result] = await db.query(
      `INSERT INTO plans_touristiques (id_guide, titre, description, date_debut, date_fin, prix)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_guide, titre, description, date_debut, date_fin, prix]
    );
    return result.insertId;
  }

  static async update(id, updates) {
    const allowedFields = ['titre', 'description', 'date_debut', 'date_fin', 'prix'];
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
    const [plan] = await db.query('SELECT * FROM plans_touristiques WHERE id = ?', [planId]);
    if (!plan[0]) return null;

    const [guide] = await db.query(
      `SELECT u.*, g.statut, g.abonnement_actif
       FROM utilisateurs u
       JOIN guides g ON u.id = g.id_utilisateur
       WHERE g.id_utilisateur = ?`,
      [plan[0].id_guide]
    );

    const [lieux] = await db.query(
      `SELECT pl.*, d.nom as delegation_nom, g.nom as gouvernorat_nom
       FROM plan_lieux pl
       JOIN delegations d ON pl.id_delegation = d.id
       JOIN gouvernorats g ON d.id_gouvernorat = g.id
       WHERE pl.id_plan = ?`,
      [planId]
    );

    const delegations = lieux.filter(lieu => !lieu.type && !lieu.image);
    const actualLieux = lieux.filter(lieu => lieu.type || lieu.image);

    return {
      ...plan[0],
      guide: guide[0] || null,
      delegations,
      lieux: actualLieux
    };
  }
}

module.exports = Plan;