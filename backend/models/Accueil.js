const db = require('../config/db');

class Accueil {
  static async getAccueilStats() {
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM utilisateurs WHERE role = 'GUIDE' AND est_actif = 1) as active_guides,
        (SELECT COUNT(*) FROM plans_touristiques) as total_plans,
        (SELECT COUNT(*) FROM utilisateurs WHERE role = 'TOURISTE') as total_tourists,
        (SELECT COUNT(*) FROM reservations) as total_reservations
    `);
    return stats[0];
  }

  static async getFeaturedPlans(limit = 6) {
    const [plans] = await db.query(`
      SELECT p.*, u.nom_complet as guide_name, u.photo_profil as guide_photo
      FROM plans_touristiques p
      JOIN utilisateurs u ON p.id_guide = u.id
      WHERE p.date_debut >= CURDATE()
      ORDER BY p.date_debut ASC
      LIMIT ?
    `, [limit]);
    return plans;
  }

  static async getFeaturedGuides(limit = 4) {
    const [guides] = await db.query(`
      SELECT u.*, g.statut, g.abonnement_actif,
        (SELECT COUNT(*) FROM plans_touristiques WHERE id_guide = g.id_utilisateur) as plans_count
      FROM utilisateurs u
      JOIN guides g ON u.id = g.id_utilisateur
      WHERE u.role = 'GUIDE' AND g.statut = 'ACTIF' AND u.est_actif = 1
      ORDER BY plans_count DESC
      LIMIT ?
    `, [limit]);
    return guides;
  }

  static async getRecentReviews(limit = 5) {
    const [reviews] = await db.query(`
      SELECT a.*, u.nom_complet as tourist_name, u.photo_profil as tourist_photo,
             p.titre as plan_title
      FROM avis a
      JOIN utilisateurs u ON a.id_touriste = u.id
      JOIN plans_touristiques p ON a.id_plan = p.id
      ORDER BY a.date_creation DESC
      LIMIT ?
    `, [limit]);
    return reviews;
  }

  static async getPopularDestinations(limit = 8) {
    const [destinations] = await db.query(`
      SELECT 
        g.nom as gouvernorat_nom,
        COUNT(DISTINCT p.id) as plans_count,
        COUNT(DISTINCT a.id_touriste) as tourists_count
      FROM gouvernorats g
      JOIN delegations d ON g.id = d.id_gouvernorat
      JOIN plan_lieux pl ON d.id = pl.id_delegation
      JOIN plans_touristiques p ON pl.id_plan = p.id
      LEFT JOIN reservations r ON p.id = r.id_plan
      LEFT JOIN avis a ON p.id = a.id_plan
      GROUP BY g.id, g.nom
      ORDER BY plans_count DESC, tourists_count DESC
      LIMIT ?
    `, [limit]);
    return destinations;
  }

  static async getSearchSuggestions(query) {
    const [suggestions] = await db.query(`
      SELECT 
        'plan' as type,
        p.titre as title,
        p.description as subtitle
      FROM plans_touristiques p
      WHERE p.titre LIKE ? OR p.description LIKE ?
      UNION ALL
      SELECT 
        'guide' as type,
        u.nom_complet as title,
        g.bio as subtitle
      FROM utilisateurs u
      JOIN guides g ON u.id = g.id_utilisateur
      WHERE u.role = 'GUIDE' AND g.statut = 'ACTIF'
      AND (u.nom_complet LIKE ? OR g.bio LIKE ?)
      UNION ALL
      SELECT 
        'destination' as type,
        g.nom as title,
        d.nom as subtitle
      FROM gouvernorats g
      JOIN delegations d ON g.id = d.id_gouvernorat
      WHERE g.nom LIKE ? OR d.nom LIKE ?
      LIMIT 10
    `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);
    return suggestions;
  }

  static async getAccueilData() {
    const [stats, featuredPlans, featuredGuides, recentReviews, popularDestinations] = await Promise.all([
      this.getAccueilStats(),
      this.getFeaturedPlans(6),
      this.getFeaturedGuides(4),
      this.getRecentReviews(5),
      this.getPopularDestinations(8)
    ]);

    return {
      stats,
      featuredPlans,
      featuredGuides,
      recentReviews,
      popularDestinations
    };
  }
}

module.exports = Accueil;
