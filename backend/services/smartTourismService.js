require('dotenv').config({ path: 'C:/Users/DELL/Desktop/bigdata/nada/nounou/projetpfe/backend/.env' });
const axios = require('axios');
const contextService = require('./contextService');

/**
 * Smart Tourism Service - IA intelligente pour tourisme tunisien
 * Utilise toutes les données du site pour répondre précisément
 */
class SmartTourismService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.model = 'llama-3.1-8b-instant';
  }

  /**
   * Question intelligente avec contexte complet
   */
  async askSmartTourism(message) {
    try {
      if (!this.apiKey) {
        throw new Error('GROQ_API_KEY not configured');
      }

      console.log('🧠 Smart Tourism AI Processing:', message);

      // 1. Construire le contexte complet
      const context = await contextService.buildFullContext();
      const formattedContext = contextService.formatContextForAI(context);

      // 2. Analyser le type de question
      const questionType = this.analyzeQuestionType(message);

      // 3. Préparer le prompt enrichi
      const enrichedPrompt = this.buildSmartPrompt(message, formattedContext, context, questionType);

      // 4. Envoyer à l'IA avec contexte
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: enrichedPrompt
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 600,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const aiResponse = response.data.choices[0].message.content;

      // 5. Analyser et retourner la réponse avec métadonnées
      return {
        response: aiResponse,
        type: questionType,
        hasData: this.hasRelevantData(context, questionType),
        sources: this.extractSources(context, questionType),
        contextUsed: {
          guides: context.guides.length,
          gouvernorats: context.gouvernorats.length,
          delegations: context.delegations.length,
          plans: context.plans.length,
          lieux: context.lieux.length
        }
      };

    } catch (error) {
      console.error('Smart Tourism Service Error:', error);
      
      if (error.message.includes('Invalid API key')) {
        throw new Error('Invalid API key - please check your GROQ_API_KEY');
      } else if (error.message.includes('Rate limit')) {
        throw new Error('Rate limit exceeded - please try again later');
      } else {
        throw new Error('Smart Tourism service temporarily unavailable');
      }
    }
  }

  /**
   * Analyser le type de question
   */
  analyzeQuestionType(message) {
    const lowerMessage = message.toLowerCase();

    // Guides - plus de mots-clés
    if (lowerMessage.includes('guide') || lowerMessage.includes('مرشد') || 
        lowerMessage.includes('yakoubi') || lowerMessage.includes('noura') || 
        lowerMessage.includes('sara') || lowerMessage.includes('yasine') ||
        lowerMessage.includes('ali') || lowerMessage.includes('certifié') ||
        lowerMessage.includes('contact') || lowerMessage.includes('téléphone') ||
        lowerMessage.includes('réserver') || lowerMessage.includes('booking')) {
      return 'guides';
    }

    // Gouvernorats - plus de villes spécifiques
    if (lowerMessage.includes('gouvernorat') || lowerMessage.includes('ولاية') || 
        lowerMessage.includes('tunis') || lowerMessage.includes('sfax') || 
        lowerMessage.includes('sousse') || lowerMessage.includes('bizerte') ||
        lowerMessage.includes('nabeul') || lowerMessage.includes('monastir') ||
        lowerMessage.includes('kairouan') || lowerMessage.includes('tozeur') ||
        lowerMessage.includes('gabes') || lowerMessage.includes('djerba')) {
      return 'gouvernorats';
    }

    // Délégations
    if (lowerMessage.includes('delegation') || lowerMessage.includes('معتمدية') || 
        lowerMessage.includes('delegations')) {
      return 'delegations';
    }

    // Plans touristiques
    if (lowerMessage.includes('plan') || lowerMessage.includes('circuit') || 
        lowerMessage.includes('tour') || lowerMessage.includes('voyage') ||
        lowerMessage.includes('réservation') || lowerMessage.includes('حجز') ||
        lowerMessage.includes('itinéraire') || lowerMessage.includes('excursion')) {
      return 'plans';
    }

    // Lieux touristiques
    if (lowerMessage.includes('lieu') || lowerMessage.includes('monument') || 
        lowerMessage.includes('plage') || lowerMessage.includes('musée') ||
        lowerMessage.includes('site') || lowerMessage.includes('موقع') ||
        lowerMessage.includes('carthage') || lowerMessage.includes('hammamet') ||
        lowerMessage.includes('mosquée') || lowerMessage.includes('medina')) {
      return 'lieux';
    }

    return 'general';
  }

  /**
   * Construire le prompt intelligent
   */
  buildSmartPrompt(message, context, fullContext, questionType) {
    const basePrompt = `أنت مساعد سياحي رسمي لموقع تونس السياحي.

RULES IMPORTANTES:
- جاوب فقط من المعلومات الموجودة في البيانات
- إذا السؤال خارج البيانات قول: "ما فماش معلومة في الموقع"
- ساعد الزائر باش يلقى guides / plans / gouvernorats / lieux
- كن مهذب ومفيد
- رد بالعربية أو الفرنسية حسب لغة السؤال

DONNÉES COMPLÈTES DU SITE:
${context}

ANALYSE DE LA QUESTION:
Type: ${questionType}
Message: "${message}"

INSTRUCTIONS SPÉCIFIQUES:`;

    const specificInstructions = {
      guides: 'Si la question concerne les guides, affichez les guides certifiés avec leurs contacts et spécialités.',
      gouvernorats: 'Si la question concerne les gouvernorats, donnez des informations précises sur les gouvernorats tunisiens.',
      delegations: 'Si la question concerne les délégations, listez les délégations par gouvernorat.',
      plans: 'Si la question concerne les plans, montrez les plans touristiques disponibles avec prix et guides.',
      lieux: 'Si la question concerne les lieux, présentez les sites touristiques avec descriptions.',
      general: 'Répondez de manière générale sur le tourisme en Tunisie en utilisant les données disponibles.'
    };

    return basePrompt + '\n\n' + (specificInstructions[questionType] || specificInstructions.general);
  }

  /**
   * Vérifier si les données pertinentes existent
   */
  hasRelevantData(context, questionType) {
    const dataMap = {
      guides: context.guides.length > 0,
      gouvernorats: context.gouvernorats.length > 0,
      delegations: context.delegations.length > 0,
      plans: context.plans.length > 0,
      lieux: context.lieux.length > 0,
      general: true
    };

    return dataMap[questionType] || false;
  }

  /**
   * Extraire les sources pertinentes
   */
  extractSources(context, questionType) {
    const sources = [];

    switch (questionType) {
      case 'guides':
        context.guides.slice(0, 3).forEach(g => {
          const name = g.split('(')[0].trim().replace('- ', '');
          sources.push({ type: 'guide', name: name });
        });
        break;
      case 'gouvernorats':
        context.gouvernorats.slice(0, 3).forEach(g => {
          const name = g.split('(')[0].trim().replace('- ', '');
          sources.push({ type: 'gouvernorat', name: name });
        });
        break;
      case 'plans':
        context.plans.slice(0, 2).forEach(p => {
          const name = p.split(':')[0].trim().replace('- ', '');
          sources.push({ type: 'plan', name: name });
        });
        break;
      case 'lieux':
        context.lieux.slice(0, 3).forEach(l => {
          const name = l.split('(')[0].trim().replace('- ', '');
          sources.push({ type: 'lieu', name: name });
        });
        break;
      case 'delegations':
        context.delegations.slice(0, 3).forEach(d => {
          const name = d.split('(')[0].trim().replace('- ', '');
          sources.push({ type: 'delegation', name: name });
        });
        break;
    }

    return sources;
  }

  /**
   * Valider la clé API
   */
  async validateAPIKey() {
    try {
      await this.askSmartTourism('Hello');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtenir des statistiques sur les données
   */
  async getStatistics() {
    try {
      const context = await contextService.buildFullContext();
      
      return {
        total: {
          guides: context.guides.length,
          gouvernorats: context.gouvernorats.length,
          delegations: context.delegations.length,
          plans: context.plans.length,
          lieux: context.lieux.length
        },
        available: {
          guides: context.guides.length > 0,
          gouvernorats: context.gouvernorats.length > 0,
          delegations: context.delegations.length > 0,
          plans: context.plans.length > 0,
          lieux: context.lieux.length > 0
        }
      };
    } catch (error) {
      console.error('Statistics Error:', error);
      return null;
    }
  }
}

module.exports = new SmartTourismService();
