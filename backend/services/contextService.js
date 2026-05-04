const db = require('../config/db');

/**
 * Context Service - Build complete tourism context from database
 * Récupère toutes les données du site pour l'IA
 */
class ContextService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Récupérer tous les guides certifiés
   */
  async getGuides() {
    try {
      const cacheKey = 'guides';
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
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
        LIMIT 10
      `);

      const guides = rows.map(row => ({
        id: row.id,
        nom_complet: row.nom_complet,
        email: row.email,
        telephone: row.telephone,
        verified: row.verified,
        photo: row.photo_profil,
        est_actif: row.est_actif
      }));

      this.cache.set(cacheKey, {
        data: guides,
        timestamp: Date.now()
      });

      return guides;

    } catch (error) {
      console.error('Context Service - Guides Error:', error);
      return [];
    }
  }

  /**
   * Récupérer tous les gouvernorats
   */
  async getGouvernorats() {
    try {
      const cacheKey = 'gouvernorats';
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const [rows] = await db.query(`
        SELECT id, nom, image
        FROM gouvernorats
        ORDER BY nom
      `);

      const gouvernorats = rows.map(row => ({
        id: row.id,
        nom: row.nom,
        image: row.image
      }));

      this.cache.set(cacheKey, {
        data: gouvernorats,
        timestamp: Date.now()
      });

      return gouvernorats;

    } catch (error) {
      console.error('Context Service - Gouvernorats Error:', error);
      return [];
    }
  }

  /**
   * Récupérer les délégations par gouvernorat
   */
  async getDelegations(gouvernoratId = null) {
    try {
      const cacheKey = `delegations_${gouvernoratId || 'all'}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      let query = `
        SELECT d.id, d.nom, g.nom as gouvernorat_nom
        FROM delegations d
        JOIN gouvernorats g ON d.id_gouvernorat = g.id
      `;
      let params = [];

      if (gouvernoratId) {
        query += ' WHERE d.id_gouvernorat = ?';
        params.push(gouvernoratId);
      }

      query += ' ORDER BY d.nom LIMIT 50';

      const [rows] = await db.query(query, params);

      const delegations = rows.map(row => ({
        id: row.id,
        nom: row.nom,
        gouvernorat_nom: row.gouvernorat_nom
      }));

      this.cache.set(cacheKey, {
        data: delegations,
        timestamp: Date.now()
      });

      return delegations;

    } catch (error) {
      console.error('Context Service - Delegations Error:', error);
      return [];
    }
  }

  /**
   * Récupérer tous les plans touristiques actifs
   */
  async getPlans() {
    try {
      const cacheKey = 'plans';
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const [rows] = await db.query(`
        SELECT p.id, p.titre, p.description, p.prix, 
               p.max_participants, p.capacite_max,
               u.nom_complet as guide_nom,
               g.nom as gouvernorat_nom
        FROM plans_touristiques p
        LEFT JOIN utilisateurs u ON p.id_guide = u.id
        LEFT JOIN gouvernorats g ON p.id_gouvernorat = g.id
        ORDER BY p.titre
        LIMIT 15
      `);

      const plans = rows.map(row => ({
        id: row.id,
        titre: row.titre,
        description: row.description,
        prix: row.prix,
        max_participants: row.max_participants,
        capacite_max: row.capacite_max,
        guide_nom: row.guide_nom,
        gouvernorat: row.gouvernorat_nom
      }));

      this.cache.set(cacheKey, {
        data: plans,
        timestamp: Date.now()
      });

      return plans;

    } catch (error) {
      console.error('Context Service - Plans Error:', error);
      return [];
    }
  }

  /**
   * Récupérer les lieux touristiques
   */
  async getLieux() {
    try {
      const cacheKey = 'lieux';
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const [rows] = await db.query(`
        SELECT l.id, l.nom, l.description, l.type, l.image,
               d.nom as delegation_nom, g.nom as gouvernorat_nom
        FROM plan_lieux l
        LEFT JOIN delegations d ON l.id_delegation = d.id
        LEFT JOIN gouvernorats g ON d.id_gouvernorat = g.id
        ORDER BY l.nom
        LIMIT 20
      `);

      const lieux = rows.map(row => ({
        id: row.id,
        nom: row.nom,
        description: row.description,
        type: row.type,
        image: row.image,
        delegation: row.delegation_nom,
        gouvernorat: row.gouvernorat_nom
      }));

      this.cache.set(cacheKey, {
        data: lieux,
        timestamp: Date.now()
      });

      return lieux;

    } catch (error) {
      console.error('Context Service - Lieux Error:', error);
      return [];
    }
  }

  /**
   * Construire le contexte complet pour l'IA
   */
  async buildFullContext() {
    try {
      console.log('🧠 Building full tourism context...');

      const [guides, gouvernorats, delegations, plans, lieux] = await Promise.all([
        this.getGuides(),
        this.getGouvernorats(),
        this.getDelegations(),
        this.getPlans(),
        this.getLieux()
      ]);

      const context = {
        guides: guides.map(g => `- ${g.nom_complet} (${g.email}) - ${g.verified ? '✅ Certifié' : '❌ Non certifié'} - ${g.est_actif ? '🟢 Actif' : '🔴 Inactif'}`),
        gouvernorats: gouvernorats.map(g => `- ${g.nom} - ${g.image ? '📷 Image disponible' : 'Pas d\'image'}`),
        delegations: delegations.map(d => `- ${d.nom} (${d.gouvernorat_nom})`),
        plans: plans.map(p => `- ${p.titre}: ${p.description || 'Description non disponible'} - ${p.prix ? p.prix + ' DT' : 'Prix sur demande'} - Guide: ${p.guide_nom || 'Non spécifié'} - Capacité: ${p.capacite_max || 'Non spécifiée'}`),
        lieux: lieux.map(l => `- ${l.nom} (${l.type || 'Non spécifié'}) - ${l.delegation || 'Non spécifié'} - ${l.gouvernorat || 'Non spécifié'} - ${l.image ? '📷 Image' : 'Pas d\'image'}`)
      };

      console.log('✅ Context built successfully');
      console.log(`📊 Guides: ${context.guides.length}`);
      console.log(`📊 Gouvernorats: ${context.gouvernorats.length}`);
      console.log(`📊 Delegations: ${context.delegations.length}`);
      console.log(`📊 Plans: ${context.plans.length}`);
      console.log(`📊 Lieux: ${context.lieux.length}`);

      return context;

    } catch (error) {
      console.error('Context Service - Build Error:', error);
      return {
        guides: [],
        gouvernorats: [],
        delegations: [],
        plans: [],
        lieux: []
      };
    }
  }

  /**
   * Formater le contexte pour l'IA
   */
  formatContextForAI(context) {
    return `
GUIDES CERTIFIÉS:
${context.guides.join('\n')}

GOUVERNORATS:
${context.gouvernorats.join('\n')}

DÉLÉGATIONS:
${context.delegations.join('\n')}

PLANS TOURISTIQUES:
${context.plans.join('\n')}

LIEUX TOURISTIQUES:
${context.lieux.join('\n')}
    `.trim();
  }

  /**
   * Vider le cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Context cache cleared');
  }
}

module.exports = new ContextService();
