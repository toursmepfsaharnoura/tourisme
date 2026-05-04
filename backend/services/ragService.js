const db = require('../config/db');
const aiService = require('./aiService');

/**
 * RAG Service - Retrieval-Augmented Generation
 * Utilise le contenu du site pour enrichir les réponses de l'IA
 */
class RAGService {
  constructor() {
    this.maxContextLength = 2000; // Max characters for context
  }

  /**
   * Rechercher du contenu pertinent dans la base de données
   * @param {string} query - Question de l'utilisateur
   * @returns {Promise<Array>} - Résultats pertinents
   */
  async searchRelevantContent(query) {
    try {
      // Mots-clés de la question
      const keywords = this.extractKeywords(query);
      
      let relevantContent = [];
      
      // Rechercher dans les gouvernorats
      const gouvernorats = await this.searchGouvernorats(keywords);
      relevantContent = relevantContent.concat(gouvernorats);
      
      // Rechercher dans les lieux touristiques
      const lieux = await this.searchLieuxTouristiques(keywords);
      relevantContent = relevantContent.concat(lieux);
      
      // Rechercher dans les plans
      const plans = await this.searchPlansTouristiques(keywords);
      relevantContent = relevantContent.concat(plans);
      
      // Trier par pertinence et limiter
      return relevantContent
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Top 5 résultats
        
    } catch (error) {
      console.error('RAG Search Error:', error);
      return [];
    }
  }

  /**
   * Extraire les mots-clés d'une question
   */
  extractKeywords(query) {
    // Nettoyer et normaliser la question
    const cleanQuery = query.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ');
    
    // Mots-clés touristiques importants
    const touristKeywords = [
      'carthage', 'hammamet', 'sfax', 'tunis', 'sousse', 'monastir',
      'bizerte', 'nabeul', 'tozeur', 'kairouan', 'gabes', 'djerba',
      'plage', 'monument', 'musée', 'mosquée', 'medina', 'site', 'archéologique',
      'hôtel', 'restaurant', 'guide', 'circuit', 'visite', 'tour', 'voyage',
      'histoire', 'culture', 'tradition', 'artisanat', 'artisanat', 'marché'
    ];
    
    const words = cleanQuery.split(' ').filter(word => word.length > 2);
    return [...new Set([...words, ...touristKeywords.filter(k => cleanQuery.includes(k))])];
  }

  /**
   * Rechercher dans les gouvernorats
   */
  async searchGouvernorats(keywords) {
    try {
      // Construire la requête avec les vraies colonnes
      const whereClause = keywords.map(() => 'LOWER(nom) LIKE ?').join(' OR ');
      const params = keywords.map(keyword => `%${keyword}%`);
      
      const [rows] = await db.query(`
        SELECT id, nom, image 
        FROM gouvernorats 
        WHERE ${whereClause}
        LIMIT 3
      `, params);
      
      return rows.map(row => ({
        type: 'gouvernorat',
        title: row.nom,
        content: `${row.nom}: Gouvernorat de Tunisie - ${row.image ? 'Image disponible' : 'Pas d\'image'}`,
        score: this.calculateScore(keywords, `${row.nom}`),
        metadata: {
          id: row.id,
          image: row.image
        }
      }));
    } catch (error) {
      console.error('Gouvernorats search error:', error);
      return [];
    }
  }

  /**
   * Rechercher dans les lieux touristiques
   */
  async searchLieuxTouristiques(keywords) {
    try {
      // Construire la requête avec les vraies colonnes
      const whereClause = keywords.map(() => 'LOWER(l.nom) LIKE ? OR LOWER(l.description) LIKE ?').join(' OR ');
      const params = keywords.flatMap(keyword => [`%${keyword}%`, `%${keyword}%`]);
      
      const [rows] = await db.query(`
        SELECT l.id, l.nom, l.description, l.type, l.image,
               d.nom as delegation_nom, g.nom as gouvernorat_nom
        FROM plan_lieux l
        LEFT JOIN delegations d ON l.id_delegation = d.id
        LEFT JOIN gouvernorats g ON d.id_gouvernorat = g.id
        WHERE ${whereClause}
        LIMIT 5
      `, params);
      
      return rows.map(row => ({
        type: 'lieu_touristique',
        title: row.nom,
        content: `${row.nom} (${row.type || 'Non spécifié'}): ${row.description || 'Lieu touristique'}. Délégation: ${row.delegation_nom || 'Non spécifié'}, Gouvernorat: ${row.gouvernorat_nom || 'Non spécifié'}`,
        score: this.calculateScore(keywords, `${row.nom} ${row.description || ''}`),
        metadata: {
          id: row.id,
          type: row.type,
          delegation: row.delegation_nom,
          gouvernorat: row.gouvernorat_nom,
          image: row.image
        }
      }));
    } catch (error) {
      console.error('Lieux search error:', error);
      return [];
    }
  }

  /**
   * Rechercher dans les plans touristiques
   */
  async searchPlansTouristiques(keywords) {
    try {
      // Construire la requête avec les vraies colonnes
      const whereClause = keywords.map(() => 'LOWER(p.titre) LIKE ? OR LOWER(p.description) LIKE ?').join(' OR ');
      const params = keywords.flatMap(keyword => [`%${keyword}%`, `%${keyword}%`]);
      
      const [rows] = await db.query(`
        SELECT p.id, p.titre, p.description, p.prix, p.max_participants, p.capacite_max,
               u.nom_complet as guide_nom
        FROM plans_touristiques p
        LEFT JOIN utilisateurs u ON p.id_guide = u.id
        WHERE ${whereClause}
        LIMIT 3
      `, params);
      
      return rows.map(row => ({
        type: 'plan_touristique',
        title: row.titre,
        content: `${row.titre}: ${row.description || 'Plan touristique'}. Prix: ${row.prix || 'Sur demande'} DT. Guide: ${row.guide_nom || 'Non spécifié'} - Capacité: ${row.capacite_max || 'Non spécifiée'}`,
        score: this.calculateScore(keywords, `${row.titre} ${row.description || ''}`),
        metadata: {
          id: row.id,
          prix: row.prix,
          max_participants: row.max_participants,
          capacite_max: row.capacite_max,
          guide: row.guide_nom
        }
      }));
    } catch (error) {
      console.error('Plans search error:', error);
      return [];
    }
  }

  /**
   * Calculer le score de pertinence
   */
  calculateScore(keywords, text) {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    keywords.forEach(keyword => {
      const occurrences = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
      score += occurrences * (keyword.length > 5 ? 2 : 1); // Bonus pour mots longs
    });
    
    return score;
  }

  /**
   * Construire le contexte pour l'IA
   */
  buildContext(relevantContent) {
    if (relevantContent.length === 0) {
      return '';
    }
    
    let context = 'Basé sur les informations de notre site tourisme tunisien:\n\n';
    
    relevantContent.forEach((item, index) => {
      context += `${index + 1}. **${item.title}** (${item.type}):\n`;
      context += `${item.content}\n\n`;
    });
    
    // Limiter la longueur du contexte
    if (context.length > this.maxContextLength) {
      context = context.substring(0, this.maxContextLength) + '...';
    }
    
    return context;
  }

  /**
   * Question avec RAG - recherche + IA
   */
  async askWithRAG(query) {
    try {
      console.log('🔍 RAG Search for:', query);
      
      // 1. Rechercher du contenu pertinent
      const relevantContent = await this.searchRelevantContent(query);
      
      // 2. Construire le contexte
      const context = this.buildContext(relevantContent);
      
      // 3. Préparer le prompt enrichi
      const enrichedPrompt = this.buildEnrichedPrompt(query, context, relevantContent);
      
      // 4. Envoyer directement à Groq avec contexte
      const axios = require('axios');
      require('dotenv').config({ path: 'C:/Users/DELL/Desktop/bigdata/nada/nounou/projetpfe/backend/.env' });
      
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: `أنت مساعد سياحي رسمي لموقع تونس السياحي. استعمل فقط المعلومات التالية:

${context}

RULES:
- جاوب فقط من المعلومات الموجودة في السياق
- إذا السياق ما فماش معلومة قول: "ما فماش معلومة في الموقع"
- كن مهذب ومفيد
- رد بالعربية أو الفرنسية حسب لغة السؤال

Répondez en vous basant UNIQUEMENT sur le contexte fourni.`
            },
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const aiResponse = response.data.choices[0].message.content;
      
      // 5. Retourner la réponse avec sources
      return {
        response: aiResponse,
        sources: relevantContent.map(item => ({
          title: item.title,
          type: item.type,
          metadata: item.metadata
        })),
        hasContext: relevantContent.length > 0,
        contextUsed: relevantContent.length
      };
      
    } catch (error) {
      console.error('RAG Error:', error);
      return {
        response: 'Désolé, je ne peux pas répondre pour le moment. Veuillez réessayer.',
        sources: [],
        hasContext: false
      };
    }
  }

  /**
   * Construire le prompt enrichi avec contexte
   */
  buildEnrichedPrompt(query, context, relevantContent) {
    if (relevantContent.length === 0) {
      return query;
    }
    
    return `Contexte: ${context}\n\nQuestion: ${query}\n\nRéponds en te basant sur le contexte fourni. Si le contexte ne contient pas l'information, dis-le poliment. Sois utile et précis pour le tourisme en Tunisie.`;
  }
}

module.exports = new RAGService();
