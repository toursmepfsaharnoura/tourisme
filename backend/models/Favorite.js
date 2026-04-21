const db = require('../config/db');

class Favorite {
  static async findByTouristAndPlan(touristId, planId) {
    const [rows] = await db.query(
      'SELECT * FROM favoris WHERE id_touriste = ? AND id_plan = ?',
      [touristId, planId]
    );
    return rows[0];
  }

  static async findByTourist(touristId) {
    const [rows] = await db.query(`
      SELECT f.*, 
             p.titre, p.description, p.prix, p.date_debut, p.date_fin, p.id as id_plan,
             u.nom_complet as guide_nom, u.email as guide_email, u.photo_profil as guide_photo
      FROM favoris f
      LEFT JOIN plans_touristiques p ON f.id_plan = p.id
      LEFT JOIN guides g ON p.id_guide = g.id_utilisateur
      LEFT JOIN utilisateurs u ON g.id_utilisateur = u.id
      WHERE f.id_touriste = ?
      ORDER BY f.date_ajout DESC
    `, [touristId]);
    return rows;
  }

  static async create(touristId, planId) {
    const [result] = await db.query(
      'INSERT INTO favoris (id_touriste, id_plan) VALUES (?, ?)',
      [touristId, planId]
    );
    return result.insertId;
  }

  static async delete(touristId, planId) {
    const [result] = await db.query(
      'DELETE FROM favoris WHERE id_touriste = ? AND id_plan = ?',
      [touristId, planId]
    );
    return result.affectedRows > 0;
  }

  static async toggleFavorite(touristId, planId) {
    const existing = await this.findByTouristAndPlan(touristId, planId);
    if (existing) {
      await this.delete(touristId, planId);
      return false; // removed from favorites
    } else {
      await this.create(touristId, planId);
      return true; // added to favorites
    }
  }

  static async isFavorite(touristId, planId) {
    const existing = await this.findByTouristAndPlan(touristId, planId);
    return !!existing;
  }

  static async getPlansFavoriteStatus(touristId, planIds) {
    if (!planIds || planIds.length === 0) return {};
    
    const placeholders = planIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT id_plan FROM favoris WHERE id_touriste = ? AND id_plan IN (${placeholders})`,
      [touristId, ...planIds]
    );
    
    const favorites = {};
    rows.forEach(row => {
      favorites[row.id_plan] = true;
    });
    return favorites;
  }
}

module.exports = Favorite;
