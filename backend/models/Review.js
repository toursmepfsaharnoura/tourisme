const db = require('../config/db');

class Review {
  static async findAll() {
    const [rows] = await db.query(`
      SELECT r.*, 
             tp.title as plan_title,
             u.nom_complet as tourist_name, u.photo_profil as tourist_photo,
             guide.nom_complet as guide_name
      FROM reviews r
      LEFT JOIN touristic_plans tp ON r.plan_id = tp.id
      LEFT JOIN utilisateurs u ON r.tourist_id = u.id
      LEFT JOIN guides g ON r.guide_id = g.id
      LEFT JOIN utilisateurs guide ON g.id_utilisateur = guide.id
      ORDER BY r.review_date DESC
    `);
    return rows;
  }

  static async findByPlan(planId) {
    const [rows] = await db.query(`
      SELECT r.*, 
             u.nom_complet as tourist_name, u.photo_profil as tourist_photo
      FROM reviews r
      LEFT JOIN utilisateurs u ON r.tourist_id = u.id
      WHERE r.plan_id = ? AND r.status = 'APPROVED'
      ORDER BY r.review_date DESC
    `, [planId]);
    return rows;
  }

  static async findByGuide(guideId) {
    const [rows] = await db.query(`
      SELECT r.*, 
             tp.title as plan_title,
             u.nom_complet as tourist_name, u.photo_profil as tourist_photo
      FROM reviews r
      LEFT JOIN touristic_plans tp ON r.plan_id = tp.id
      LEFT JOIN utilisateurs u ON r.tourist_id = u.id
      WHERE r.guide_id = ? AND r.status = 'APPROVED'
      ORDER BY r.review_date DESC
    `, [guideId]);
    return rows;
  }

  static async findByTourist(touristId) {
    const [rows] = await db.query(`
      SELECT r.*, 
             tp.title as plan_title,
             guide.nom_complet as guide_name
      FROM reviews r
      LEFT JOIN touristic_plans tp ON r.plan_id = tp.id
      LEFT JOIN guides g ON r.guide_id = g.id
      LEFT JOIN utilisateurs guide ON g.id_utilisateur = guide.id
      WHERE r.tourist_id = ?
      ORDER BY r.review_date DESC
    `, [touristId]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(`
      SELECT r.*, 
             tp.title as plan_title,
             u.nom_complet as tourist_name, u.photo_profil as tourist_photo,
             guide.nom_complet as guide_name
      FROM reviews r
      LEFT JOIN touristic_plans tp ON r.plan_id = tp.id
      LEFT JOIN utilisateurs u ON r.tourist_id = u.id
      LEFT JOIN guides g ON r.guide_id = g.id
      LEFT JOIN utilisateurs guide ON g.id_utilisateur = guide.id
      WHERE r.id = ?
    `, [id]);
    return rows[0];
  }

  static async create(data) {
    const { 
      plan_id, 
      tourist_id, 
      guide_id, 
      rating, 
      comment 
    } = data;
    
    const [result] = await db.query(
      `INSERT INTO reviews 
       (plan_id, tourist_id, guide_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [plan_id, tourist_id, guide_id, rating, comment]
    );
    return result.insertId;
  }

  static async update(id, updates) {
    const allowedFields = ['rating', 'comment', 'status'];
    const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return false;

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, val]) => val);
    values.push(id);

    const [result] = await db.query(`UPDATE reviews SET ${setClause} WHERE id = ?`, values);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM reviews WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async updateStatus(id, status) {
    const [result] = await db.query('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows > 0;
  }

  static async getPlanRatingStats(planId) {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews 
      WHERE plan_id = ? AND status = 'APPROVED'
    `, [planId]);
    return rows[0];
  }

  static async getGuideRatingStats(guideId) {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews 
      WHERE guide_id = ? AND status = 'APPROVED'
    `, [guideId]);
    return rows[0];
  }

  static async incrementHelpfulCount(id) {
    const [result] = await db.query('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getPendingReviews() {
    const [rows] = await db.query(`
      SELECT r.*, 
             tp.title as plan_title,
             u.nom_complet as tourist_name, u.photo_profil as tourist_photo,
             guide.nom_complet as guide_name
      FROM reviews r
      LEFT JOIN touristic_plans tp ON r.plan_id = tp.id
      LEFT JOIN utilisateurs u ON r.tourist_id = u.id
      LEFT JOIN guides g ON r.guide_id = g.id
      LEFT JOIN utilisateurs guide ON g.id_utilisateur = guide.id
      WHERE r.status = 'PENDING'
      ORDER BY r.review_date ASC
    `);
    return rows;
  }
}

module.exports = Review;
