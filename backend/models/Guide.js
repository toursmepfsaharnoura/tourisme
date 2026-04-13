const db = require('../config/db');

class Guide {
  static async findByUserId(userId) {
    const [rows] = await db.query(
      'SELECT id_utilisateur AS id, guides.* FROM guides WHERE id_utilisateur = ?',
      [userId]
    );
    return rows[0];
  }

  static async create(userId) {
    const [result] = await db.query(
      `INSERT INTO guides (id_utilisateur, statut, cv_approved, diplome_approved, abonnement_actif)
       VALUES (?, 'ATTENTE', 0, 0, 0)`,
      [userId]
    );
    return result.insertId;
  }
  static async update(userId, updates) {
    const allowedFields = ['cv', 'diplome', 'statut', 'validation_cv', 'cv_approved', 'diplome_approved', 'date_soumission', 'abonnement_actif', 'abonnement_fin'];
    const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return false;

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, val]) => val);
    values.push(userId);
    console.log('🔧 UPDATE guides SET', setClause, 'values:', values); // <--- AJOUTE CETTE LIGNE
    const [result] = await db.query(`UPDATE guides SET ${setClause} WHERE id_utilisateur = ?`, values);
    return result.affectedRows > 0;
  }

  static async updateProfile(userId, updates) {
    const allowedFields = ['bio'];
    const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return false;

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, val]) => val);
    values.push(userId);
    console.log('🔧 UPDATE guides profile SET', setClause, 'values:', values);
    const [result] = await db.query(`UPDATE guides SET ${setClause} WHERE id_utilisateur = ?`, values);
    return result.affectedRows > 0;
  }

  static async findAll(statutFilter = null) {
    let query = `
      SELECT u.*, g.cv, g.diplome, g.statut, g.cv_approved, g.diplome_approved,
             g.abonnement_actif, g.abonnement_fin, g.date_soumission
      FROM utilisateurs u
      JOIN guides g ON u.id = g.id_utilisateur
      WHERE u.role = 'GUIDE'
    `;
    const params = [];
    if (statutFilter) {
      query += ' AND g.statut = ?';
      params.push(statutFilter);
    }
    query += ' ORDER BY u.date_creation DESC';
    const [rows] = await db.query(query, params);
    return rows;
  }

 static async findPending() {
  const [rows] = await db.query(`
    SELECT 
      u.id AS id_utilisateur,  -- 🔥 هذا أهم تعديل
      u.nom_complet,
      u.email,
      u.date_creation,
      g.cv,
      g.diplome,
      g.date_soumission
    FROM utilisateurs u
    JOIN guides g ON u.id = g.id_utilisateur
    WHERE u.role = 'GUIDE'
      AND g.cv IS NOT NULL
      AND (g.cv_approved = 0 OR g.diplome_approved = 0)
    ORDER BY g.date_soumission DESC
  `);
  return rows;
}

  static async approveDocuments(userId) {
  const [result] = await db.query(
    'UPDATE guides SET cv_approved = 1, diplome_approved = 1, statut = "ACTIF" WHERE id_utilisateur = ?',
    [userId]
  );
  return result.affectedRows > 0;
}
  static async refuseDocuments(userId) {
    const [result] = await db.query(
      'UPDATE guides SET statut = "BLOQUE" WHERE id_utilisateur = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Guide;