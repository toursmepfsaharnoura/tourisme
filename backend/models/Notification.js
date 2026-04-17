const db = require('../config/db');
 
class Notification {
  static async findAll() {
    const [rows] = await db.query(`
      SELECT * FROM notifications
      ORDER BY created_at DESC
    `);
    return rows;
  }
 
  static async findByUser(userId, limit = 50) {
    const [rows] = await db.query(`
      SELECT * FROM notifications 
      WHERE id_utilisateur = ? 
      ORDER BY date_creation DESC 
      LIMIT ?
    `, [userId, limit]);
    return rows;
  }
 
  static async findByType(userId, type, limit = 50) {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE id_utilisateur = ? AND type = ? ORDER BY date_creation DESC LIMIT ?',
      [userId, type, limit]
    );
    return rows;
  }
 
  static async getUnreadCount(userId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE id_utilisateur = ? AND est_vu = 0',
      [userId]
    );
    return rows[0].count;
  }
 
  static async create(data) {
    const { id_utilisateur, type, contenu } = data;
    const [result] = await db.query(`
      INSERT INTO notifications (id_utilisateur, type, contenu, est_vu, date_creation)
      VALUES (?, ?, ?, 0, NOW())
    `, [id_utilisateur, type, contenu]);
    return result.insertId;
  }
 
  static async markAsRead(notificationId) {
    const [result] = await db.query(
      'UPDATE notifications SET est_vu = 1 WHERE id = ?',
      [notificationId]
    );
    return result.affectedRows;
  }
 
  static async markAllAsRead(userId) {
    const [result] = await db.query(
      'UPDATE notifications SET est_vu = 1 WHERE id_utilisateur = ?',
      [userId]
    );
    return result.affectedRows;
  }
 
  static async findById(notificationId) {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE id = ?',
      [notificationId]
    );
    return rows[0];
  }
 
  static async delete(notificationId) {
    const [result] = await db.query(
      'DELETE FROM notifications WHERE id = ?',
      [notificationId]
    );
    return result.affectedRows;
  }
}
 
module.exports = Notification;