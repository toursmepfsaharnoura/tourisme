const db = require('../config/db');

class Booking {
  static async findAll() {
    const [rows] = await db.query(`
      SELECT b.*, 
             tp.title as plan_title, tp.price as plan_price,
             u.nom_complet as tourist_name, u.email as tourist_email,
             g.nom_complet as guide_name
      FROM bookings b
      LEFT JOIN touristic_plans tp ON b.plan_id = tp.id
      LEFT JOIN utilisateurs u ON b.tourist_id = u.id
      LEFT JOIN guides g ON tp.guide_id = g.id
      ORDER BY b.booking_date DESC
    `);
    return rows;
  }

  static async findByTourist(touristId) {
    const [rows] = await db.query(`
      SELECT b.*, 
             tp.title as plan_title, tp.price as plan_price, tp.image as plan_image,
             tp.start_date, tp.end_date,
             u.nom_complet as guide_name, u.photo_profil as guide_photo,
             gov.nom as governorate_nom,
             del.nom as delegation_nom
      FROM bookings b
      LEFT JOIN touristic_plans tp ON b.plan_id = tp.id
      LEFT JOIN guides g ON tp.guide_id = g.id
      LEFT JOIN utilisateurs u ON g.id_utilisateur = u.id
      LEFT JOIN gouvernorats gov ON tp.governorate_id = gov.id
      LEFT JOIN delegations del ON tp.delegation_id = del.id
      WHERE b.tourist_id = ?
      ORDER BY b.booking_date DESC
    `, [touristId]);
    return rows;
  }

  static async findByGuide(guideId) {
    const [rows] = await db.query(`
      SELECT b.*, 
             tp.title as plan_title, tp.price as plan_price,
             u.nom_complet as tourist_name, u.email as tourist_email, u.telephone as tourist_phone
      FROM bookings b
      LEFT JOIN touristic_plans tp ON b.plan_id = tp.id
      LEFT JOIN utilisateurs u ON b.tourist_id = u.id
      WHERE tp.guide_id = ?
      ORDER BY b.booking_date DESC
    `, [guideId]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(`
      SELECT b.*, 
             tp.title as plan_title, tp.description as plan_description,
             tp.price as plan_price, tp.max_participants,
             u.nom_complet as tourist_name, u.email as tourist_email,
             guide.nom_complet as guide_name, guide.email as guide_email
      FROM bookings b
      LEFT JOIN touristic_plans tp ON b.plan_id = tp.id
      LEFT JOIN utilisateurs u ON b.tourist_id = u.id
      LEFT JOIN guides g ON tp.guide_id = g.id
      LEFT JOIN utilisateurs guide ON g.id_utilisateur = guide.id
      WHERE b.id = ?
    `, [id]);
    return rows[0];
  }

  static async create(data) {
    const { 
      plan_id, 
      tourist_id, 
      number_of_participants, 
      total_price, 
      special_requests, 
      contact_phone, 
      contact_email 
    } = data;
    
    const [result] = await db.query(
      `INSERT INTO bookings 
       (plan_id, tourist_id, number_of_participants, total_price, special_requests, contact_phone, contact_email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [plan_id, tourist_id, number_of_participants, total_price, special_requests, contact_phone, contact_email]
    );
    return result.insertId;
  }

  static async update(id, updates) {
    const allowedFields = ['status', 'special_requests', 'contact_phone', 'contact_email'];
    const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return false;

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, val]) => val);
    values.push(id);

    const [result] = await db.query(`UPDATE bookings SET ${setClause} WHERE id = ?`, values);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM bookings WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async updateStatus(id, status) {
    const [result] = await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows > 0;
  }

  static async getBookingStats(guideId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(total_price) as total_revenue
      FROM bookings b
      LEFT JOIN touristic_plans tp ON b.plan_id = tp.id
    `;
    
    const params = [];
    if (guideId) {
      query += ' WHERE tp.guide_id = ?';
      params.push(guideId);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0];
  }
}

module.exports = Booking;
