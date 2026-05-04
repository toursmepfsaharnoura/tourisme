const db = require('../config/db');

class Message {
  static async create(data) {
    const { id_expediteur, id_destinataire, contenu, type_message = 'TEXT', fichier_path = null } = data;
    const [result] = await db.query(
      `INSERT INTO messages (id_expediteur, id_destinataire, contenu, type_message, fichier_path, est_lu) 
       VALUES (?, ?, ?, ?, ?, 0)`,
      [id_expediteur, id_destinataire, contenu, type_message, fichier_path]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM messages WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findConversation(user1Id, user2Id) {
    const [rows] = await db.query(
      `SELECT m.*, u.nom_complet as sender_name
       FROM messages m
       JOIN utilisateurs u ON m.id_expediteur = u.id
       WHERE (m.id_expediteur = ? AND m.id_destinataire = ?)
          OR (m.id_expediteur = ? AND m.id_destinataire = ?)
       ORDER BY m.date_creation ASC`,
      [user1Id, user2Id, user2Id, user1Id]
    );
    return rows;
  }

  static async getNewMessages(userId, otherUserId, lastMessageId) {
    const [rows] = await db.query(
      `SELECT m.*, u.nom_complet as sender_name
       FROM messages m
       JOIN utilisateurs u ON m.id_expediteur = u.id
       WHERE ((m.id_expediteur = ? AND m.id_destinataire = ?) 
          OR (m.id_expediteur = ? AND m.id_destinataire = ?))
         AND m.id > ?
       ORDER BY m.date_creation ASC`,
      [userId, otherUserId, otherUserId, userId, lastMessageId]
    );
    return rows;
  }

  static async markAsRead(messageId) {
    const [result] = await db.query(
      'UPDATE messages SET est_lu = 1 WHERE id = ?',
      [messageId]
    );
    return result.affectedRows;
  }

  static async markConversationAsRead(expediteurId, destinataireId) {
    const [result] = await db.query(
      'UPDATE messages SET est_lu = 1 WHERE id_expediteur = ? AND id_destinataire = ? AND est_lu = 0',
      [expediteurId, destinataireId]
    );
    return result.affectedRows;
  }

  static async getUnreadCount(userId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM messages WHERE id_destinataire = ? AND est_lu = 0',
      [userId]
    );
    return rows[0].count;
  }

  static async getLastMessagesForUser(userId) {
    const [rows] = await db.query(
      `SELECT m.*,
              u.nom_complet as other_user_name,
              u.id as other_user_id,
              (SELECT COUNT(*) FROM messages m2 
               WHERE m2.id_destinataire = ? AND m2.est_lu = 0 
               AND m2.id_expediteur = u.id) as unread_count
       FROM messages m
       JOIN utilisateurs u ON (CASE WHEN m.id_expediteur = ? THEN m.id_destinataire ELSE m.id_expediteur END) = u.id
       WHERE m.id IN (
         SELECT MAX(id) FROM messages
         WHERE id_expediteur = ? OR id_destinataire = ?
         GROUP BY LEAST(id_expediteur, id_destinataire), GREATEST(id_expediteur, id_destinataire)
       )
       ORDER BY m.date_creation DESC`,
      [userId, userId, userId, userId]
    );
    return rows;
  }

  static async searchMessages(userId, query) {
    const [rows] = await db.query(
      `SELECT m.*, u.nom_complet as sender_name
       FROM messages m
       JOIN utilisateurs u ON m.id_expediteur = u.id
       WHERE (m.id_expediteur = ? OR m.id_destinataire = ?)
         AND m.contenu LIKE ?
       ORDER BY m.date_creation DESC
       LIMIT 50`,
      [userId, userId, `%${query}%`]
    );
    return rows;
  }

  static async delete(messageId) {
    const [result] = await db.query(
      'DELETE FROM messages WHERE id = ?',
      [messageId]
    );
    return result.affectedRows;
  }

  static async getConversationStats(userId1, userId2) {
    const [rows] = await db.query(
      `SELECT 
         COUNT(*) as total_messages,
         SUM(CASE WHEN id_expediteur = ? THEN 1 ELSE 0 END) as sent_count,
         SUM(CASE WHEN id_expediteur = ? THEN 1 ELSE 0 END) as received_count,
         MAX(date_creation) as last_message_date
       FROM messages
       WHERE (id_expediteur = ? AND id_destinataire = ?)
          OR (id_expediteur = ? AND id_destinataire = ?)`,
      [userId1, userId2, userId1, userId2, userId2, userId1]
    );
    return rows[0];
  }

  static async getConversationsWithUnreadCounts(userId) {
    const [rows] = await db.query(
      `SELECT DISTINCT 
         LEAST(m.id_expediteur, m.id_destinataire) as user1_id,
         GREATEST(m.id_expediteur, m.id_destinataire) as user2_id,
         u.nom_complet as other_user_name,
         u.id as other_user_id,
         (SELECT COUNT(*) FROM messages m2 
          WHERE m2.id_destinataire = ? AND m2.est_lu = 0 
          AND m2.id_expediteur = u.id) as unread_count,
         (SELECT m3.contenu FROM messages m3 
          WHERE (m3.id_expediteur = ? OR m3.id_destinataire = ?)
          AND (m3.id_expediteur = u.id OR m3.id_destinataire = u.id)
          ORDER BY m3.date_creation DESC LIMIT 1) as last_message,
         (SELECT m3.date_creation FROM messages m3 
          WHERE (m3.id_expediteur = ? OR m3.id_destinataire = ?)
          AND (m3.id_expediteur = u.id OR m3.id_destinataire = u.id)
          ORDER BY m3.date_creation DESC LIMIT 1) as last_message_time
       FROM messages m
       JOIN utilisateurs u ON (CASE WHEN m.id_expediteur = ? THEN m.id_destinataire ELSE m.id_expediteur END) = u.id
       WHERE m.id_expediteur = ? OR m.id_destinataire = ?
       ORDER BY last_message_time DESC`,
      [userId, userId, userId, userId, userId, userId, userId, userId]
    );
    return rows;
  }

  static async markAllAsRead(userId) {
    const [result] = await db.query(
      'UPDATE messages SET est_lu = 1 WHERE id_destinataire = ? AND est_lu = 0',
      [userId]
    );
    return result.affectedRows;
  }

  static async findByUser(userId, limit = 50) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM messages WHERE id_destinataire = ? ORDER BY date_creation DESC LIMIT ?',
        [userId, limit]
      );
      return rows;
    } catch (err) {
      console.error("Message.findByUser ERROR:", err);
      return [];
    }
  }
}

module.exports = Message;