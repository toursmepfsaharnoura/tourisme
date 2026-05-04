require('dotenv').config();
const axios = require('axios');
const contextService = require('./contextService');
const ragService = require('./ragService');

class UnifiedAIService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.model = 'llama-3.1-8b-instant';
    this.maxTokens = 800;
    this.temperature = 0.5;
  }

  async askUnified(message) {
    try {
      if (!this.apiKey) throw new Error('GROQ_API_KEY not configured');

      console.log('🧠 Processing:', message);

      // 1. تحليل نوع السؤال
      const questionType = this.analyzeQuestionType(message);
      console.log('📌 Type:', questionType);

      // 2. جيب بس البيانات اللي تخص السؤال
      const relevantData = await this.getRelevantData(questionType);

      // 3. ابني الـ context
      const context = this.buildContext(relevantData, questionType);

      // 4. ابعث لـ Groq - system منفصل عن user
      const aiResponse = await this.sendToGroq(message, context);

      return {
        response: aiResponse,
        type: questionType,
        approach: 'Smart RAG',
        sources: this.extractSources(relevantData, questionType),
        contextUsed: {
          guides: relevantData.guides?.length || 0,
          gouvernorats: relevantData.gouvernorats?.length || 0,
          plans: relevantData.plans?.length || 0,
          delegations: relevantData.delegations?.length || 0,
          lieux: relevantData.lieux?.length || 0,
        },
        hasData: Object.values(relevantData).some(arr => arr?.length > 0)
      };

    } catch (error) {
      console.error('❌ Unified AI Error:', error.message);
      return {
        response: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        type: 'error',
        approach: 'fallback',
        sources: [],
        contextUsed: {},
        hasData: false
      };
    }
  }

  // جيب بس البيانات اللي تخص نوع السؤال
  async getRelevantData(questionType) {
    try {
      switch (questionType) {
        case 'guides':
          return { guides: await contextService.getGuides() };

        case 'plans':
          return { plans: await contextService.getPlans() };

        case 'gouvernorats':
          return { 
            gouvernorats: await contextService.getGouvernorats(),
            delegations: await contextService.getDelegations()
          };

        case 'delegations':
          return { delegations: await contextService.getDelegations() };

        case 'lieux':
          return { lieux: await contextService.getLieux() };

        default:
          // سؤال عام - جيب الكل مع limit
          const [guides, gouvernorats, plans] = await Promise.all([
            contextService.getGuides(),
            contextService.getGouvernorats(),
            contextService.getPlans()
          ]);
          return { 
            guides: guides.slice(0, 3), 
            gouvernorats: gouvernorats.slice(0, 5), 
            plans: plans.slice(0, 3) 
          };
      }
    } catch (error) {
      console.error('❌ getRelevantData error:', error.message);
      return {};
    }
  }

  // ابني context نظيف ومنظم
  buildContext(data, questionType) {
    let context = 'DONNÉES DU SITE TOURISME TUNISIE:\n\n';

    if (data.guides?.length > 0) {
      context += '=== GUIDES CERTIFIÉS ===\n';
      data.guides.forEach((g, i) => {
        context += `${i+1}. Nom: ${g.nom_complet}\n`;
        context += `   Email: ${g.email}\n`;
        if (g.telephone) context += `   Tél: ${g.telephone}\n`;
        context += `   Statut: ${g.verified ? 'Certifié ✅' : 'En attente'} - ${g.est_actif ? 'Actif' : 'Inactif'}\n\n`;
      });
    }

    if (data.gouvernorats?.length > 0) {
      context += '=== GOUVERNORATS ===\n';
      data.gouvernorats.forEach((g, i) => {
        context += `${i+1}. ${g.nom}\n`;
      });
      context += '\n';
    }

    if (data.delegations?.length > 0) {
      context += '=== DÉLÉGATIONS ===\n';
      data.delegations.slice(0, 20).forEach((d, i) => {
        context += `${i+1}. ${d.nom} (${d.gouvernorat_nom})\n`;
      });
      context += '\n';
    }

    if (data.plans?.length > 0) {
      context += '=== PLANS TOURISTIQUES ===\n';
      data.plans.forEach((p, i) => {
        context += `${i+1}. Titre: ${p.titre}\n`;
        if (p.description) context += `   Description: ${p.description}\n`;
        if (p.prix) context += `   Prix: ${p.prix} DT\n`;
        if (p.guide_nom) context += `   Guide: ${p.guide_nom}\n`;
        if (p.capacite_max) context += `   Capacité: ${p.capacite_max} personnes\n`;
        context += '\n';
      });
    }

    if (data.lieux?.length > 0) {
      context += '=== LIEUX TOURISTIQUES ===\n';
      data.lieux.filter(l => l.nom).forEach((l, i) => {
        context += `${i+1}. ${l.nom} (${l.type || 'Non spécifié'}) - ${l.gouvernorat || ''}\n`;
        if (l.description) context += `   ${l.description}\n`;
      });
      context += '\n';
    }

    return context;
  }

  // ✅ FIX PRINCIPAL: system منفصل عن user
  async sendToGroq(userMessage, context) {
    const systemPrompt = `Tu es un assistant touristique officiel pour un site de tourisme en Tunisie.

RÈGLES IMPORTANTES:
- Réponds UNIQUEMENT en utilisant les données fournies ci-dessous
- Si l'information n'existe pas dans les données, dis: "Cette information n'est pas disponible sur notre site"
- Sois précis, utile et professionnel
- Réponds en français ou en arabe selon la langue du message
- Ne génère pas d'informations inventées

${context}`;

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt  // ✅ system prompt هنا
          },
          {
            role: 'user',
            content: userMessage   // ✅ سؤال المستخدم هنا فقط
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  analyzeQuestionType(message) {
    const lower = message.toLowerCase();

    const patterns = {
      guides: ['guide', 'guides', 'مرشد', 'certif', 'accompagnateur', 
               'yakoubi', 'noura', 'sara', 'yasine', 'contact'],
      plans: ['plan', 'circuit', 'voyage', 'excursion', 'itinéraire', 
              'réservation', 'حجز', 'trip', 'séjour'],
      gouvernorats: ['gouvernorat', 'ولاية', 'tunis', 'sfax', 'sousse', 
                     'bizerte', 'nabeul', 'kairouan', 'tozeur', 'djerba',
                     'monastir', 'mahdia', 'gabes', 'hammamet'],
      delegations: ['délégation', 'delegation', 'معتمدية'],
      lieux: ['lieu', 'monument', 'plage', 'musée', 'site', 'mosquée', 
               'medina', 'ruines', 'oasis', 'désert']
    };

    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return type;
      }
    }

    return 'general';
  }

  extractSources(data, questionType) {
    const sources = [];
    const typeMap = {
      guides: data.guides,
      plans: data.plans,
      gouvernorats: data.gouvernorats,
      delegations: data.delegations,
      lieux: data.lieux
    };

    const items = typeMap[questionType] || [];
    items.slice(0, 3).forEach(item => {
      sources.push({
        type: questionType,
        name: item.nom_complet || item.titre || item.nom || 'Unknown',
        source: 'database'
      });
    });

    return sources;
  }

  async validateAPIKey() {
    try {
      const resp = await axios.post(
        `${this.baseURL}/chat/completions`,
        { model: this.model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 },
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      return resp.status === 200;
    } catch {
      return false;
    }
  }

  async getStatistics() {
    try {
      const [guides, gouvernorats, plans, delegations, lieux] = await Promise.all([
        contextService.getGuides(),
        contextService.getGouvernorats(),
        contextService.getPlans(),
        contextService.getDelegations(),
        contextService.getLieux()
      ]);
      return {
        total: {
          guides: guides.length,
          gouvernorats: gouvernorats.length,
          plans: plans.length,
          delegations: delegations.length,
          lieux: lieux.length
        }
      };
    } catch (error) {
      return null;
    }
  }
}

module.exports = new UnifiedAIService();