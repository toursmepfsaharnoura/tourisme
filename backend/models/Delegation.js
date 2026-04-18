const db = require('../config/db');

class Delegation {
  static async findAll() {
    const [rows] = await db.query(`
      SELECT d.*, g.nom as gouvernorat_nom, g.image as gouvernorat_image
      FROM delegations d
      LEFT JOIN gouvernorats g ON d.id_gouvernorat = g.id
      ORDER BY d.nom
    `);
    return rows;
  }

  static async findByGouvernorat(gouvernoratId) {
    const [rows] = await db.query('SELECT * FROM delegations WHERE id_gouvernorat = ? ORDER BY nom', [gouvernoratId]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM delegations WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(data) {
    const { nom, id_gouvernorat, image } = data;
    const [result] = await db.query(
      'INSERT INTO delegations (nom, id_gouvernorat, image) VALUES (?, ?, ?)',
      [nom, id_gouvernorat, image || null]
    );
    return result.insertId;
  }

  static async update(id, updates) {
    const allowedFields = ['nom', 'id_gouvernorat', 'image'];
    const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return false;

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, val]) => val);
    values.push(id);

    const [result] = await db.query(`UPDATE delegations SET ${setClause} WHERE id = ?`, values);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM delegations WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Delegation;