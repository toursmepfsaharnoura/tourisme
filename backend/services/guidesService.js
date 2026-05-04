const db = require('../config/db');

/**
 * Guides Service - Gestion des guides certifiés
 * Récupère les informations des guides depuis la base de données
 */
class GuidesService {
  constructor() {
    this.cache = new Map(); // Cache pour performance
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Récupérer tous les guides certifiés
   */
  async getAllGuides() {
    try {
      // Vérifier le cache
      if (this.cache.has('all_guides')) {
        const cached = this.cache.get('all_guides');
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const [rows] = await db.query(`
        SELECT u.id, u.nom_complet, u.email, u.telephone, 
               u.verified, u.photo_profil, u.est_actif
        FROM utilisateurs u
        WHERE u.role = 'GUIDE' AND u.verified = 1 AND u.est_actif = 1
        ORDER BY u.nom_complet
      `);

      const guides = rows.map(row => ({
        id: row.id,
        nom: row.nom_complet,
        email: row.email,
        telephone: row.telephone,
        verified: row.verified,
        photo: row.photo_profil,
        est_actif: row.est_actif
      }));

      // Mettre en cache
      this.cache.set('all_guides', {
        data: guides,
        timestamp: Date.now()
      });

      return guides;

    } catch (error) {
      console.error('Guides Service Error:', error);
      return [];
    }
  }

  /**
   * Récupérer un guide par son ID
   */
  async getGuideById(id) {
    try {
      const [rows] = await db.query(`
        SELECT u.id, u.nom_complet, u.email, u.telephone, 
               u.verified, u.photo_profil, u.est_actif
        FROM utilisateurs u
        WHERE u.id = ? AND u.role = 'GUIDE' AND u.verified = 1 AND u.est_actif = 1
      `, [id]);

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        nom: row.nom_complet,
        email: row.email,
        telephone: row.telephone,
        verified: row.verified,
        photo: row.photo_profil,
        est_actif: row.est_actif
      };

    } catch (error) {
      console.error('Get Guide Error:', error);
      return null;
    }
  }

  /**
   * Récupérer les guides par spécialité
   */
  async getGuidesBySpecialite(specialite) {
    try {
      const [rows] = await db.query(`
        SELECT u.id, u.nom_complet, u.email, u.verified,
               u.photo_profil, u.est_actif
        FROM utilisateurs u
        WHERE u.role = 'GUIDE' AND u.verified = 1 AND u.est_actif = 1
        ORDER BY u.nom_complet
        LIMIT 5
      `);

      return rows.map(row => ({
        id: row.id,
        nom: row.nom_complet,
        email: row.email,
        verified: row.verified,
        photo: row.photo_profil,
        est_actif: row.est_actif
      }));

    } catch (error) {
      console.error('Guides by Specialite Error:', error);
      return [];
    }
  }

  /**
   * Récupérer les guides par gouvernorat
   */
  async getGuidesByGouvernorat(gouvernoratId) {
    try {
      const [rows] = await db.query(`
        SELECT u.id, u.nom_complet, u.email, u.verified,
               u.photo_profil, u.est_actif
        FROM utilisateurs u
        WHERE u.role = 'GUIDE' AND u.verified = 1 AND u.est_actif = 1
        ORDER BY u.nom_complet
        LIMIT 5
      `);

      return rows.map(row => ({
        id: row.id,
        nom: row.nom_complet,
        email: row.email,
        verified: row.verified,
        photo: row.photo_profil,
        est_actif: row.est_actif
      }));

    } catch (error) {
      console.error('Guides by Gouvernorat Error:', error);
      return [];
    }
  }

  /**
   * Formater les informations des guides pour l'IA
   */
  formatGuidesForAI(guides) {
    if (!guides || guides.length === 0) {
      return "Aucun guide certifié n'est disponible pour le moment.";
    }

    return guides.map((guide, index) => {
      return `${index + 1}. **${guide.nom}** (${guide.verified ? '✅ Certifié' : '❌ Non certifié'})
📧 ${guide.email} | 📱 ${guide.telephone || 'Non spécifié'}
🟢 ${guide.est_actif ? 'Actif' : 'Inactif'}
📝 ${guide.photo ? '📷 Photo disponible' : 'Pas de photo'}`;
    }).join('\n\n');
  }

  /**
   * Vider le cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new GuidesService();
