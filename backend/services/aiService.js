require('dotenv').config({ path: 'C:/Users/DELL/Desktop/bigdata/nada/nounou/projetpfe/backend/.env' });
const axios = require('axios');
const guidesService = require('./guidesService');

/**
 * AI Service - Communication with Groq API + Database Integration
 * Handles all AI-related operations with real guide data
 */
class AIService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.model = 'llama-3.1-8b-instant';
  }

  /**
   * Send message to AI and get response with guide data
   * @param {string} message - User message
   * @returns {Promise<string>} - AI response
   */
  async askAI(message) {
    try {
      if (!this.apiKey) {
        throw new Error('GROQ_API_KEY not configured');
      }

      // Check if user is asking about guides
      const isAskingAboutGuides = this.isAskingAboutGuides(message);
      let guidesData = '';

      if (isAskingAboutGuides) {
        try {
          const guides = await guidesService.getAllGuides();
          guidesData = guidesService.formatGuidesForAI(guides);
          console.log('🧠 Using real guides data for AI response');
        } catch (error) {
          console.error('Guides fetch error:', error);
          guidesData = 'Aucun guide certifié n\'est disponible pour le moment.';
        }
      }

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `أنت مساعد سياحي رسمي لموقع تونس السياحي.

${isAskingAboutGuides ? `GUIDES DISPONIBLES:\n${guidesData}` : ''}

RULES IMPORTANTES:
- جاوب فقط من المعلومات الموجودة
- إذا السؤال على المرشدين، اعرضهم comme ils sont
- إذا ما فماش معلومات، قول "ما فماش معلومة في الموقع"
- كن مهذب ومفيد
- رد بالعربية أو الفرنسية حسب لغة السؤال

Répondez en vous basant UNIQUEMENT sur les données du site tourisme tunisien.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      return response.data.choices[0].message.content;

    } catch (error) {
      console.error('AI Service Error:', error.response?.data || error.message);
      
      if (error.message.includes('Invalid API key')) {
        throw new Error('Invalid API key - please check your GROQ_API_KEY');
      } else if (error.message.includes('Rate limit')) {
        throw new Error('Rate limit exceeded - please try again later');
      } else if (error.message.includes('timeout')) {
        throw new Error('Request timeout - please try again');
      } else {
        throw new Error('AI service temporarily unavailable');
      }
    }
  }

  /**
   * Check if user is asking about guides
   */
  isAskingAboutGuides(message) {
    const guideKeywords = [
      'guide', 'guides', 'مرشد', 'مرشدين',
      'yakoubi', 'noura', 'sara', 'yasine', 'ali',
      'certifié', 'certifiée', 'disponible',
      'contact', 'téléphone', 'email', 'telephone',
      'spécialité', 'specialite', 'prix', 'tarif',
      'réserver', 'reserver', 'booking', 'guide touristique'
    ];

    const lowerMessage = message.toLowerCase();
    return guideKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Validate API key
   * @returns {Promise<boolean>}
   */
  async validateAPIKey() {
    try {
      await this.askAI('Hello');
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new AIService();
