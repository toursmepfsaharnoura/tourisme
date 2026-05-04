const NotificationService = require('../services/notificationService');
const NotificationModel = require('../models/notificationModel');
const db = require('../config/db');

/**
 * Helper functions pour l'affichage des notifications
 */
function getIconForType(type) {
  const icons = {
    'message': 'envelope',
    'avis': 'star', 
    'reservation': 'calendar-check',
    'MESSAGE': 'envelope',
    'AVIS': 'star',
    'RESERVATION': 'calendar-check',
    'CV': 'file-alt',
    'PAIEMENT': 'credit-card',
    'ABONNEMENT': 'crown'
  };
  return icons[type] || 'bell';
}

function getPriorityForType(type) {
  const priorities = {
    'message': 'medium',
    'avis': 'low',
    'reservation': 'high',
    'MESSAGE': 'medium',
    'AVIS': 'low', 
    'RESERVATION': 'high',
    'CV': 'high',
    'PAIEMENT': 'high',
    'ABONNEMENT': 'medium'
  };
  return priorities[type] || 'low';
}

function getLinkForType(type, id) {
  const links = {
    'message': '/guide/messages',
    'avis': '/guide/avis',
    'reservation': '/guide/reservations',
    'MESSAGE': '/guide/messages',
    'AVIS': '/guide/avis',
    'RESERVATION': '/guide/reservations',
    'CV': '/guide/upload-docs',
    'PAIEMENT': '/admin/paiements',
    'ABONNEMENT': '/guide/abonnement'
  };
  return links[type] || null;
}

/**
 * Récupérer les notifications pour l'utilisateur connecté (Guide ou Admin)
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const tab = req.query.tab || 'all';
    const isAdmin = req.user?.role === 'ADMIN' || req.session?.user?.role === 'ADMIN';

    if (!userId) {
      return res.status(401).json({ 
        notifications: [], 
        unreadCount: 0, 
        error: "Non authentifié" 
      });
    }

    let notifications = [];
    let unreadCount = 0;

    // Essayer la table unifiée d'abord
    try {
      notifications = await NotificationModel.getAllNotifications(userId, 50);
      
      // Filtrer par tab si spécifié
      if (tab !== 'all') {
        notifications = notifications.filter(n => 
          n.type.toLowerCase() === tab.toLowerCase()
        );
      }

      // Améliorer les notifications avec les données d'affichage
      notifications = notifications.map(notification => ({
        id: notification.id,
        type: notification.type.toLowerCase(),
        title: notification.type.charAt(0) + notification.type.slice(1).toLowerCase(),
        content: notification.content,
        is_read: notification.est_vu,
        created_at: notification.created_at,
        date: notification.created_at,
        isRead: notification.est_vu || false,
        icon: getIconForType(notification.type),
        priority: getPriorityForType(notification.type),
        link: getLinkForType(notification.type, notification.id),
        rating: notification.type.toLowerCase() === 'avis' ? Math.floor(Math.random() * 5) + 1 : null
      }));

      unreadCount = notifications.filter(n => !n.isRead).length;

    } catch (err) {
      // Fallback vers les tables legacy si la table notifications n'existe pas
      console.log('🔄 Utilisation fallback tables legacy');
      notifications = await getFallbackNotifications(userId, tab, isAdmin);
      unreadCount = notifications.filter(n => !n.isRead).length;
    }

    // Retourner JSON pour les requêtes API ou render pour les requêtes web
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ notifications, unreadCount, currentTab: tab });
    }

    // Render page pour les requêtes web
    return res.render(isAdmin ? 'admin/notifications' : 'guide/notifications', {
      notifications,
      currentTab: tab,
      userId,
      unreadCount
    });

  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error.message);
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ 
        notifications: [], 
        unreadCount: 0, 
        error: "Erreur serveur" 
      });
    }

    return res.render('error', { 
      error: "Erreur de chargement des notifications",
      notifications: [],
      unreadCount: 0
    });
  }
};

/**
 * Récupérer toutes les notifications du système pour l'admin
 */
exports.getAdminNotifications = async (req, res) => {
  try {
    console.log('🔔 Getting ALL system notifications for admin');
    console.log('🔔 User session:', req.session.user);
    
    // Récupérer TOUTES les notifications du système (pas seulement pour l'admin)
    let notifications = [];
    
    try {
      // Essayer la table unifiée - sans filtre d'utilisateur
      notifications = await NotificationModel.getAllNotifications(null, 50); // null = tous les utilisateurs
      
      // Filtrer par tab si spécifié
      if (tab !== 'all') {
        notifications = notifications.filter(n => 
          n.type.toLowerCase() === tab.toLowerCase()
        );
      }

      // Formater les notifications
      notifications = notifications.map(notification => ({
        id: notification.id,
        type: notification.type.toLowerCase(),
        title: notification.type.charAt(0) + notification.type.slice(1).toLowerCase(),
        content: notification.content,
        is_read: notification.est_vu,
        created_at: notification.created_at,
        date: notification.created_at,
        isRead: notification.est_vu || false
      }));
      
    } catch (err) {
      // Fallback vers les tables legacy
      console.log('🔄 Admin fallback vers tables legacy, error:', err.message);
      
      // Récupérer les messages
      console.log('🔍 Fetching messages...');
      const [messages] = await db.query(
        'SELECT id, "message" as type, contenu as content, est_lu as is_read, date_creation as created_at, id_expediteur as sender_id FROM messages ORDER BY date_creation DESC LIMIT 20'
      );
      console.log('📧 Messages found:', messages.length);
      
      // Récupérer les avis
      console.log('🔍 Fetching avis...');
      const [avis] = await db.query(
        'SELECT id, "avis" as type, commentaire as content, 0 as is_read, date_creation as created_at, id_guide as sender_id FROM avis ORDER BY date_creation DESC LIMIT 10'
      );
      console.log('⭐ Avis found:', avis.length);

      // Récupérer les réservations
      console.log('🔍 Fetching reservations...');
      const [reservations] = await db.query(
        'SELECT r.id, "reservation" as type, r.id_touriste, r.date_reservation, r.statut, r.date_creation as created_at, p.id_guide as sender_id FROM reservations r JOIN plans_touristiques p ON r.id_plan = p.id ORDER BY r.date_creation DESC LIMIT 10'
      );
      console.log('📋 Reservations found:', reservations.length);

      // Récupérer les abonnements
      console.log('🔍 Fetching abonnements...');
      const [abonnements] = await db.query(
        'SELECT id, "abonnement" as type, id_guide, date_debut, date_fin, statut, date_debut as created_at, id_guide as sender_id FROM abonnements ORDER BY date_debut DESC LIMIT 10'
      );
      console.log('📅 Abonnements found:', abonnements.length);
      
      // Combiner toutes les notifications
      notifications = [
        ...messages.map(msg => ({
          id: `msg_${msg.id}`,
          type: 'message',
          title: 'Nouveau message',
          content: msg.content,
          is_read: msg.is_read,
          created_at: msg.created_at,
          date: msg.created_at,
          isRead: msg.is_read || false,
          sender_id: msg.sender_id
        })),
        ...avis.map(av => ({
          id: `avis_${av.id}`,
          type: 'avis',
          title: 'Nouvel avis',
          content: av.content,
          is_read: av.is_read,
          created_at: av.created_at,
          date: av.created_at,
          isRead: av.is_read || false,
          sender_id: av.sender_id
        })),
        ...reservations.map(res => ({
          id: `res_${res.id}`,
          type: 'reservation',
          title: `Nouvelle réservation (${res.statut})`,
          content: `Guide ${res.id_guide} - Touriste ${res.id_touriste} - ${new Date(res.date_reservation).toLocaleDateString('fr-FR')}`,
          is_read: false, // Les réservations n'ont pas de champ is_read
          created_at: res.created_at,
          date: res.created_at,
          isRead: false,
          sender_id: res.sender_id
        })),
        ...abonnements.map(abo => ({
          id: `abo_${abo.id}`,
          type: 'abonnement',
          title: `Nouvel abonnement (${abo.statut})`,
          content: `Guide ${abo.id_guide} - Du ${new Date(abo.date_debut).toLocaleDateString('fr-FR')} au ${new Date(abo.date_fin).toLocaleDateString('fr-FR')}`,
          is_read: false, // Les abonnements n'ont pas de champ is_read
          created_at: abo.created_at,
          date: abo.created_at,
          isRead: false,
          sender_id: abo.sender_id
        }))
      ];
      
      console.log('🔊 Combined notifications count:', notifications.length);
      console.log('🔊 Combined notifications type:', typeof notifications);
      console.log('🔊 Combined notifications is array:', Array.isArray(notifications));
      
      if (notifications.length > 0) {
        console.log('🔊 First notification sample:', notifications[0]);
      }
    }
    
    const unreadCount = notifications.filter(n => !n.isRead).length;
    console.log('🔔 Final notifications count:', notifications.length);
    console.log('🔔 Final notifications type:', typeof notifications);
    console.log('🔔 Final notifications is array:', Array.isArray(notifications));
    
    res.json(notifications); // Retourner directement le tableau pour le frontend
    
  } catch (error) {
    console.error('❌ Erreur notifications admin:', error.message);
    res.json([]); // Retourner un tableau vide en cas d'erreur
  }
};

/**
 * Marquer une notification comme lue
 */
exports.markAsRead = async (req, res) => {
  try {
    // Récupérer l'ID depuis les params de route ou le body
    const notificationId = req.params.id || req.body.notificationId;
    
    if (!notificationId) {
      return res.status(400).json({ error: 'ID de notification requis' });
    }
    
    console.log(`📝 Marking notification ${notificationId} as read...`);
    
    // Gérer les différents types de notifications
    if (notificationId.startsWith('msg_')) {
      const id = notificationId.replace('msg_', '');
      await db.query('UPDATE messages SET est_lu = 1 WHERE id = ?', [id]);
    } else if (notificationId.startsWith('avis_')) {
      const id = notificationId.replace('avis_', '');
      await db.query('UPDATE avis SET est_vu = 1 WHERE id = ?', [id]);
    } else if (notificationId.startsWith('res_')) {
      // Les réservations n'ont pas de champ is_read, on ne fait rien
      console.log('📝 Reservation notifications cannot be marked as read');
    } else if (notificationId.startsWith('abo_')) {
      // Les abonnements n'ont pas de champ is_read, on ne fait rien
      console.log('📝 Abonnement notifications cannot be marked as read');
    } else {
      await NotificationModel.markAsRead(notificationId);
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Erreur marquer comme lu:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Marquer toutes les notifications comme lues pour l'utilisateur
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      // Essayer la table unifiée
      await db.query(
        'UPDATE notifications SET est_vu = 1 WHERE id_utilisateur = ?',
        [userId]
      );
    } catch (err) {
      // Fallback vers la table messages
      await db.query(
        'UPDATE messages SET est_lu = 1 WHERE id_destinataire = ?',
        [userId]
      );
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Erreur marquer tout comme lu:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Récupérer le nombre de notifications non lues pour l'utilisateur
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    
    if (!userId) {
      return res.json({ unreadCount: 0 });
    }

    let unreadCount = 0;
    
    try {
      // Essayer la table unifiée
      const result = await NotificationModel.getUnreadCount(userId);
      unreadCount = result.count;
    } catch (err) {
      // Fallback vers la table messages
      const [result] = await db.query(
        'SELECT COUNT(*) as count FROM messages WHERE id_destinataire = ? AND est_lu = 0',
        [userId]
      );
      unreadCount = result[0].count;
    }
    
    res.json({ unreadCount });
    
  } catch (error) {
    console.error('❌ Erreur compteur non lu:', error.message);
    res.json({ unreadCount: 0 });
  }
};

/**
 * Créer une nouvelle notification (endpoint API)
 */
exports.createNotification = async (req, res) => {
  try {
    const { userId, type, content } = req.body;
    
    if (!userId || !type || !content) {
      return res.status(400).json({ 
        error: 'Paramètres manquants: userId, type, content' 
      });
    }

    const result = await NotificationService.createNotification(userId, type, content);
    
    if (!result) {
      return res.status(500).json({ error: 'Erreur lors de la création' });
    }
    
    res.json({ 
      success: true, 
      id: result.insertId 
    });
    
  } catch (error) {
    console.error('❌ Erreur création notification:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Fonction fallback pour les tables legacy
 * @private
 */
async function getFallbackNotifications(userId, tab, isAdmin) {
  let notifications = [];
  
  try {
    if (tab === 'all' || tab === 'messages') {
      const [messages] = await db.query(
        'SELECT id, "message" as type, contenu as content, est_lu as is_read, date_creation as created_at FROM messages WHERE id_destinataire = ? ORDER BY date_creation DESC LIMIT 5',
        [userId]
      );
      
      notifications = notifications.concat(messages.map(msg => ({
        id: `msg_${msg.id}`,
        type: 'message',
        title: 'Nouveau message',
        content: msg.content,
        is_read: msg.is_read,
        created_at: msg.created_at,
        date: msg.created_at,
        isRead: msg.is_read || false,
        icon: getIconForType('message'),
        priority: getPriorityForType('message'),
        link: getLinkForType('message', msg.id)
      })));
    }
    
    if (tab === 'all' || tab === 'avis') {
      const [avis] = await db.query(
        'SELECT id, "avis" as type, commentaire as content, est_vu as is_read, date_creation as created_at, note FROM avis WHERE id_guide = ? ORDER BY date_creation DESC LIMIT 5',
        [userId]
      );
      
      notifications = notifications.concat(avis.map(item => ({
        id: item.id,
        type: 'avis',
        title: `Nouvel avis - ${item.note}/5`,
        content: item.content,
        is_read: item.is_read,
        created_at: item.created_at,
        date: item.created_at,
        isRead: item.is_read || false,
        icon: getIconForType('avis'),
        priority: getPriorityForType('avis'),
        link: getLinkForType('avis', item.id),
        rating: item.note
      })));
    }
    
    if (tab === 'all' || tab === 'reservations') {
      const [reservations] = await db.query(
        'SELECT id, "reservation" as type, status as content, date_creation as created_at FROM reservations WHERE guide_id = ? ORDER BY date_creation DESC LIMIT 5',
        [userId]
      );
      
      notifications = notifications.concat(reservations.map(item => ({
        id: item.id,
        type: 'reservation',
        title: 'Nouvelle réservation',
        content: item.content,
        is_read: false,
        created_at: item.created_at,
        date: item.created_at,
        isRead: false,
        icon: getIconForType('reservation'),
        priority: getPriorityForType('reservation'),
        link: getLinkForType('reservation', item.id)
      })));
    }
    
  } catch (error) {
    console.error('❌ Erreur fallback queries:', error.message);
  }
  
  return notifications;
}

/**
 * Supprimer une notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID de notification requis' });
    }
    
    try {
      // Essayer la table unifiée
      await NotificationModel.deleteNotification(id);
    } catch (err) {
      // Fallback vers la table messages
      if (id.startsWith('msg_')) {
        const messageId = id.replace('msg_', '');
        await db.query('DELETE FROM messages WHERE id = ?', [messageId]);
      } else {
        await db.query('DELETE FROM notifications WHERE id = ?', [id]);
      }
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Erreur suppression notification:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = exports;
