const db = require('../config/db');

class Avis {
  static async findByGuide(guideId) {
    const [rows] = await db.query(
      `SELECT a.*, u.nom_complet as touriste_nom
       FROM avis a
       JOIN utilisateurs u ON a.id_touriste = u.id
       WHERE a.id_guide = ?
       ORDER BY a.date_creation DESC`,
      [guideId]
    );
    return rows;
  }

  static async findByTouristAndPlan(touristeId, planId) {
    const [rows] = await db.query(
      'SELECT * FROM avis WHERE id_touriste = ? AND id_plan = ? LIMIT 1',
      [touristeId, planId]
    );
    return rows[0] || null;
  }

  static async findByPlan(planId) {
    const [rows] = await db.query(
      'SELECT * FROM avis WHERE id_plan = ? ORDER BY date_creation DESC',
      [planId]
    );
    return rows;
  }

  static async findByTourist(touristeId) {
    const [rows] = await db.query(
      'SELECT * FROM avis WHERE id_touriste = ? ORDER BY date_creation DESC',
      [touristeId]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM avis WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async getSummaryForGuides(guideIds) {
    if (!Array.isArray(guideIds) || guideIds.length === 0) {
      return [];
    }
    const [rows] = await db.query(
      `SELECT id_guide, AVG(note) AS moyenne, COUNT(*) AS total
       FROM avis
       WHERE id_guide IN (?)
       GROUP BY id_guide`,
      [guideIds]
    );
    return rows;
  }

  static async create(data) {
    const { id_guide, id_touriste, id_plan, note, commentaire } = data;
    const [result] = await db.query(
      'INSERT INTO avis (id_guide, id_touriste, id_plan, note, commentaire) VALUES (?, ?, ?, ?, ?)',
      [id_guide, id_touriste, id_plan, note, commentaire]
    );
    return result.insertId;
  }

  static async update(id, updates) {
    const allowedFields = ['note', 'commentaire'];
    const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return false;

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, val]) => val);
    values.push(id);

    const [result] = await db.query(`UPDATE avis SET ${setClause} WHERE id = ?`, values);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM avis WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getAverageForGuide(guideId) {
    const [rows] = await db.query(
      'SELECT AVG(note) as moyenne FROM avis WHERE id_guide = ?',
      [guideId]
    );
    return rows[0].moyenne || 0;
  }
}

module.exports = Avis;