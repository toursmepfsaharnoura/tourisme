const NotificationModel = require('../models/notificationModel');
const db = require('../config/db');

class NotificationService {
  // Types de notifications importantes pour les admins
  static IMPORTANT_TYPES = ['AVIS', 'RESERVATION', 'PAIEMENT', 'ABONNEMENT'];

  /**
   * Fonction unifiée pour créer des notifications
   * @param {number} userId - ID de l'utilisateur
   * @param {string} type - Type de notification
   * @param {string} content - Contenu de la notification
   * @param {boolean} isAdmin - Si l'utilisateur est un admin
   * @returns {Promise<Object|null>}
   */
  static async createNotification(userId, type, content, isAdmin = false) {
    try {
      if (!userId || !type || !content) {
        throw new Error('Paramètres manquants: userId, type, content');
      }

      const notification = {
        type: type.toUpperCase(),
        contenu: content,
        user_id: userId
      };
      
      const result = await NotificationModel.createNotification(notification);
      
      // Émettre en temps réel
      this.emitRealTimeNotification(result.insertId, type, content, userId, isAdmin);
      
      console.log(`✅ Notification créée: ${type} - ${content}`);
      return result;
      
    } catch (error) {
      console.error('❌ Erreur création notification:', error.message);
      return null;
    }
  }

  /**
   * Émettre les notifications en temps réel via Socket.io
   * @private
   */
  static emitRealTimeNotification(notificationId, type, content, userId, isAdmin) {
    if (!global.io) return;

    const notificationData = {
      id: notificationId,
      type: type.toUpperCase(),
      content,
      user_id: userId,
      created_at: new Date()
    };
    
    // Envoyer à l'utilisateur
    global.io.to(`notifications_${userId}`).emit('newNotification', notificationData);
    global.io.to(`user_${userId}`).emit('newNotification', notificationData);
    
    // Envoyer aux admins pour notifications importantes
    if (!isAdmin && this.IMPORTANT_TYPES.includes(type.toUpperCase())) {
      global.io.to('admin_room').emit('adminNotification', notificationData);
    }
    
    console.log(`🔔 Notification envoyée: ${type}`);
  }

  /**
   * Créer une notification pour l'admin
   */
  static async createAdminNotification(type, content) {
    try {
      const adminId = await this.getAdminId();
      if (!adminId) return null;
      
      return await this.createNotification(adminId, type, content, true);
    } catch (error) {
      console.error('❌ Erreur notification admin:', error.message);
      return null;
    }
  }

  /**
   * Créer une notification pour un guide
   */
  static async createGuideNotification(guideId, type, content) {
    return await this.createNotification(guideId, type, content, false);
  }

  /**
   * Récupérer l'ID de l'admin
   * @private
   */
  static async getAdminId() {
    try {
      const [adminResult] = await db.query(
        'SELECT id FROM utilisateurs WHERE role = "ADMIN" LIMIT 1'
      );
      return adminResult.length > 0 ? adminResult[0].id : null;
    } catch (error) {
      console.error('❌ Erreur récupération admin ID:', error.message);
      return null;
    }
  }

  /**
   * Notification pour nouveau message
   */
  static async notifyNewMessage(senderId, receiverId, content) {
    try {
      const sender = await this.getUserInfo(senderId);
      if (!sender) return;

      const messageContent = `Nouveau message de ${sender.nom_complet}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;
      
      // Émission immédiate Socket.io
      this.emitMessageNotification(senderId, receiverId, content, sender);
      
      // Créer notification en base selon le rôle
      if (sender.role === 'GUIDE') {
        await this.createAdminNotification('MESSAGE', messageContent);
      } else if (sender.role === 'ADMIN') {
        await this.createGuideNotification(receiverId, 'MESSAGE', `Nouveau message de l'admin: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
      }
      
    } catch (error) {
      console.error('❌ Erreur notification message:', error.message);
    }
  }

  /**
   * Émettre notification message en temps réel
   * @private
   */
  static emitMessageNotification(senderId, receiverId, content, sender) {
    if (!global.io) return;

    const messageData = {
      type: 'NEW_MESSAGE',
      senderId,
      receiverId,
      content,
      senderName: sender.nom_complet,
      senderRole: sender.role,
      timestamp: new Date()
    };
    
    global.io.to(`notifications_${receiverId}`).emit('newMessage', messageData);
    global.io.to(`user_${receiverId}`).emit('newMessage', messageData);
  }

  /**
   * Récupérer infos utilisateur
   * @private
   */
  static async getUserInfo(userId) {
    try {
      const [user] = await db.query(
        'SELECT nom_complet, role FROM utilisateurs WHERE id = ?',
        [userId]
      );
      return user.length > 0 ? user[0] : null;
    } catch (error) {
      console.error('❌ Erreur récupération utilisateur:', error.message);
      return null;
    }
  }

  /**
   * Notification pour nouvelle réservation
   */
  static async notifyNewReservation(reservationData) {
    try {
      const { guide_id, id_touriste, plan_id } = reservationData;
      const [touriste, plan] = await Promise.all([
        db.query('SELECT nom_complet FROM utilisateurs WHERE id = ?', [id_touriste]),
        db.query('SELECT titre FROM plans WHERE id = ?', [plan_id])
      ]);
      
      if (touriste[0]?.length > 0 && plan[0]?.length > 0) {
        const content = `Nouvelle réservation de ${touriste[0][0].nom_complet} pour le plan "${plan[0][0].titre}"`;
        
        await Promise.all([
          this.createAdminNotification('RESERVATION', content),
          this.createGuideNotification(guide_id, 'RESERVATION', content)
        ]);
      }
    } catch (error) {
      console.error('❌ Erreur notification réservation:', error.message);
    }
  }

  /**
   * Notification pour nouvel avis
   */
  static async notifyNewAvis(avisData) {
    try {
      const { id_guide, id_touriste, note, commentaire } = avisData;
      const [touriste] = await db.query(
        'SELECT nom_complet FROM utilisateurs WHERE id = ?',
        [id_touriste]
      );
      
      if (touriste.length > 0) {
        const adminContent = `Nouvel avis reçu: ${touriste[0].nom_complet} a laissé un avis de ${note}/5`;
        const guideContent = `Nouvel avis reçu: ${note}/5 - ${commentaire.substring(0, 50)}${commentaire.length > 50 ? '...' : ''}`;
        
        await Promise.all([
          this.createAdminNotification('AVIS', adminContent),
          this.createGuideNotification(id_guide, 'AVIS', guideContent)
        ]);
      }
    } catch (error) {
      console.error('❌ Erreur notification avis:', error.message);
    }
  }

  /**
   * Notification pour validation de documents
   */
  static async notifyDocumentValidation(guideId, guideName) {
    await this.createAdminNotification('CV', `Nouveau dossier guide à valider: ${guideName}`);
  }

  /**
   * Notification pour paiement
   */
  static async notifyNewPayment(paymentData) {
    try {
      const { id_guide, montant } = paymentData;
      const [guide] = await db.query(
        'SELECT nom_complet FROM utilisateurs WHERE id = ?',
        [id_guide]
      );
      
      if (guide.length > 0) {
        const adminContent = `Nouveau paiement de ${guide[0].nom_complet}: ${montant} DT`;
        const guideContent = `Paiement reçu: ${montant} DT`;
        
        await Promise.all([
          this.createAdminNotification('PAIEMENT', adminContent),
          this.createGuideNotification(id_guide, 'PAIEMENT', guideContent)
        ]);
      }
    } catch (error) {
      console.error('❌ Erreur notification paiement:', error.message);
    }
  }

  /**
   * Notification pour abonnement
   */
  static async notifyNewAbonnement(abonnementData) {
    try {
      const { id_guide, date_debut, date_fin } = abonnementData;
      const [guide] = await db.query(
        'SELECT nom_complet FROM utilisateurs WHERE id = ?',
        [id_guide]
      );
      
      if (guide.length > 0) {
        const adminContent = `Nouvel abonnement: ${guide[0].nom_complet} (${new Date(date_debut).toLocaleDateString('fr-FR')} - ${new Date(date_fin).toLocaleDateString('fr-FR')})`;
        const guideContent = `Abonnement activé avec succès!`;
        
        await Promise.all([
          this.createAdminNotification('ABONNEMENT', adminContent),
          this.createGuideNotification(id_guide, 'ABONNEMENT', guideContent)
        ]);
      }
    } catch (error) {
      console.error('❌ Erreur notification abonnement:', error.message);
    }
  }

  /**
   * Notification pour plainte
   */
  static async notifyNewPlainte(plainteData) {
    try {
      const { id_touriste, sujet } = plainteData;
      const [touriste] = await db.query(
        'SELECT nom_complet FROM utilisateurs WHERE id = ?',
        [id_touriste]
      );
      
      if (touriste.length > 0) {
        const content = `Nouvelle plainte: ${touriste[0].nom_complet} - ${sujet}`;
        await this.createAdminNotification('MESSAGE', content);
      }
    } catch (error) {
      console.error('❌ Erreur notification plainte:', error.message);
    }
  }
}

module.exports = NotificationService;
