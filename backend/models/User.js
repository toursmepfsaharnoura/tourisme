const db = require('../config/db');

class User {
  static async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM utilisateurs WHERE email = ?', [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(userData) {
    const { nom_complet, email, mot_de_passe, role, verification_code = null } = userData;
    const [result] = await db.query(
      `INSERT INTO utilisateurs (nom_complet, email, mot_de_passe, role, verification_code, verified, est_actif)
       VALUES (?, ?, ?, ?, ?, 0, 1)`,
      [nom_complet, email, mot_de_passe, role, verification_code]
    );
    return result.insertId;
  }

  static async update(id, updates) {
    const allowedFields = ['nom_complet', 'email', 'mot_de_passe', 'telephone', 'bio', 'photo_profil', 'verified', 'est_actif'];
    const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return false;

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, val]) => val);
    values.push(id);

    const [result] = await db.query(`UPDATE utilisateurs SET ${setClause} WHERE id = ?`, values);
    return result.affectedRows > 0;
  }

  static async verifyCode(email, code) {
    const [rows] = await db.query('SELECT id FROM utilisateurs WHERE email = ? AND verification_code = ?', [email, code]);
    if (rows.length > 0) {
      await db.query('UPDATE utilisateurs SET verified = 1 WHERE id = ?', [rows[0].id]);
      return true;
    }
    return false;
  }

  static async findAdmin() {
    const [rows] = await db.query('SELECT id FROM utilisateurs WHERE role = "ADMIN" LIMIT 1');
    return rows[0];
  }

  static async findGuidesWithConversations(touristeId) {
    const [rows] = await db.query(`
      SELECT DISTINCT u.id, u.nom_complet, u.photo_profil, u.role,
             MAX(m.date_envoi) as last_message_date,
             (SELECT COUNT(*) FROM messages WHERE id_expediteur = ? AND id_destinataire = u.id AND lu = 0) as unread_count
      FROM utilisateurs u
      INNER JOIN messages m ON (u.id = m.id_expediteur OR u.id = m.id_destinataire)
      WHERE u.role = 'GUIDE' 
      AND (m.id_expediteur = ? OR m.id_destinataire = ?)
      AND u.id != ?
      GROUP BY u.id, u.nom_complet, u.photo_profil, u.role
      ORDER BY last_message_date DESC
    `, [touristeId, touristeId, touristeId, touristeId]);
    
    return rows;
  }
}

module.exports = User;