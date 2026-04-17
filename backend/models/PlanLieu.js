const db = require('../config/db');

class PlanLieu {
  static async findByPlan(planId) {
    const [rows] = await db.query('SELECT * FROM plan_lieux WHERE id_plan = ?', [planId]);
    return rows;
  }

  static async create(data) {
    const { id_plan, id_delegation, type, image, nom, description, date_visite } = data;
    const [result] = await db.query(
      'INSERT INTO plan_lieux (id_plan, id_delegation, type, image, nom, description, date_visite) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id_plan, id_delegation, type, image || null, nom || null, description || null, date_visite || null]
    );
    return result.insertId;
  }

  static async update(id, updates) {
    const allowedFields = ['id_delegation', 'type', 'image', 'nom', 'description', 'date_visite'];
    const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return false;

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, val]) => val);
    values.push(id);

    const [result] = await db.query(`UPDATE plan_lieux SET ${setClause} WHERE id = ?`, values);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM plan_lieux WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async deleteByPlan(planId) {
    const [result] = await db.query('DELETE FROM plan_lieux WHERE id_plan = ?', [planId]);
    return result.affectedRows > 0;
  }
}

module.exports = PlanLieu;