const db = require('../config/db');

class Reservation {
  static async findAll() {
    const [rows] = await db.query('SELECT * FROM reservations ORDER BY date_creation DESC');
    return rows;
  }

  static async findByTourist(touristeId) {
    const [rows] = await db.query(
      'SELECT * FROM reservations WHERE id_touriste = ? ORDER BY date_creation DESC',
      [touristeId]
    );
    return rows;
  }

  static async findByTouriste(touristeId) {
    return this.findByTourist(touristeId);
  }

  static async findByTouristPaid(touristeId) {
    const [rows] = await db.query(
      'SELECT * FROM reservations WHERE id_touriste = ? AND statut = ? ORDER BY date_creation DESC',
      [touristeId, 'CONFIRMEE']
    );
    return rows;
  }

  static async findByPlan(planId) {
    const [rows] = await db.query('SELECT * FROM reservations WHERE id_plan = ?', [planId]);
    return rows;
  }

  static async findByGuide(guideId) {
    const [rows] = await db.query(
      'SELECT r.* FROM reservations r JOIN plans_touristiques p ON r.id_plan = p.id WHERE p.id_guide = ? ORDER BY r.date_creation DESC',
      [guideId]
    );
    return rows;
  }

  static async findByGuidePaid(guideId) {
    const [rows] = await db.query(
      'SELECT r.* FROM reservations r JOIN plans_touristiques p ON r.id_plan = p.id WHERE p.id_guide = ? AND r.statut = ? ORDER BY r.date_creation DESC',
      [guideId, 'CONFIRMEE']
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(data) {
    try {
      const { 
        id_plan, 
        id_touriste, 
        statut = 'EN_ATTENTE',
        date_reservation,
        nombre_personnes,
        email_contact,
        telephone_contact,
        message
      } = data;
      
      let query, params;
      
      if (date_reservation && nombre_personnes) {
        // Full reservation with details
        query = `
          INSERT INTO reservations 
          (id_plan, id_touriste, statut, date_reservation, nombre_personnes, email_contact, telephone_contact, message) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        params = [id_plan, id_touriste, statut, date_reservation, nombre_personnes, email_contact, telephone_contact, message];
      } else {
        // Basic reservation (backward compatibility)
        query = 'INSERT INTO reservations (id_plan, id_touriste, statut) VALUES (?, ?, ?)';
        params = [id_plan, id_touriste, statut];
      }
      
      const [result] = await db.query(query, params);
      console.log(`✅ Réservation insérée: ID ${result.insertId}`);
      return result.insertId;
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'insertion de réservation:', error);
      throw error; // Propager l'erreur pour la gérer dans le contrôleur
    }
  }

  static async updateStatus(id, statut) {
    const [result] = await db.query('UPDATE reservations SET statut = ? WHERE id = ?', [statut, id]);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM reservations WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getFullDetails(reservationId) {
    const [rows] = await db.query(
      `SELECT r.*,
              p.titre as plan_titre, p.date_debut, p.date_fin, p.prix,
              u.nom_complet as touriste_nom, u.email as touriste_email
       FROM reservations r
       JOIN plans_touristiques p ON r.id_plan = p.id
       JOIN utilisateurs u ON r.id_touriste = u.id
       WHERE r.id = ?`,
      [reservationId]
    );
    return rows[0];
  }
}

module.exports = Reservation;