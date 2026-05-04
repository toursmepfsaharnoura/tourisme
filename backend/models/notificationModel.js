const db = require('../config/db');

class NotificationModel {
  // Marquer comme lu
  static async markAsRead(id) {
    const [result] = await db.query(
      "UPDATE notifications SET est_vu = 1 WHERE id = ?",
      [id]
    );
    return result;
  }

  // Compter les non lus
  static async getUnreadCount(userId = null) {
    let query = "SELECT COUNT(*) as count FROM notifications WHERE est_vu = 0";
    let params = [];
    
    if (userId) {
      query += " AND id_utilisateur = ?";
      params.push(userId);
    }
    
    const [result] = await db.query(query, params);
    return result[0];
  }

  // Obtenir toutes les notifications
  static async getAllNotifications(userId = null) {
    let query = `
      SELECT id, type, contenu as content, est_vu, date_creation as created_at,
             id_utilisateur as user_id
      FROM notifications 
      ORDER BY date_creation DESC
    `;
    let params = [];
    
    if (userId) {
      query = `
        SELECT id, type, contenu as content, est_vu, date_creation as created_at,
               id_utilisateur as user_id
        FROM notifications 
        WHERE id_utilisateur = ?
        ORDER BY date_creation DESC
      `;
      params = [userId];
    }
    
    const [result] = await db.query(query, params);
    return result;
  }

  // Créer une notification
  static async createNotification(notification) {
    const [result] = await db.query(
      `INSERT INTO notifications (type, contenu, id_utilisateur, est_vu, date_creation) 
       VALUES (?, ?, ?, 0, NOW())`,
      [notification.type, notification.contenu, notification.user_id || notification.id_utilisateur]
    );
    return result;
  }

  // Supprimer une notification
  static async deleteNotification(id) {
    const [result] = await db.query(
      "DELETE FROM notifications WHERE id = ?",
      [id]
    );
    return result;
  }
}

module.exports = NotificationModel;
