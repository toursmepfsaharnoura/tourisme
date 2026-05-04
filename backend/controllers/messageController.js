const Message = require('../models/Message');
const User = require('../models/User');
const Guide = require('../models/Guide');
const multer = require('multer');
const path = require('path');
const NotificationService = require('../services/notificationService');
const { createMessageNotification } = require('../middlewares/notificationMiddleware');

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/messages');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  }
});

/**
 * Get all conversations for a user
 */
exports.getConversations = async (req, res) => {
  const userId = req.session.user.id;

  try {
    const messages = await Message.getLastMessagesForUser(userId);
    
    // Enrich with user details
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const otherId = msg.other_user_id;
        const user = await User.findById(otherId);
        
        let guideStatus = null;
        if (user && user.role === 'GUIDE') {
          const guide = await Guide.findByUserId(otherId);
          guideStatus = guide ? guide.statut : null;
        }
        
        return { ...msg, other_user: user, guide_status: guideStatus };
      })
    );

    res.render('messages/chat', {
      user: req.session.user,
      conversations: enriched
    });
  } catch (err) {
    console.error('Error getting conversations:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Get conversation with a specific user
 */
exports.getConversation = async (req, res) => {
  const userId = req.session.user.id;
  const otherUserId = req.params.userId;

  try {
    // Mark messages as read
    await Message.markAsRead(otherUserId, userId);

    // Get conversation
    const messages = await Message.findConversation(userId, otherUserId);

    // Get other user details
    const otherUser = await User.findById(otherUserId);

    res.json({
      success: true,
      messages,
      otherUser
    });
  } catch (err) {
    console.error('Error getting conversation:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Send a message (text or file)
 */
exports.sendMessage = async (req, res) => {
  const senderId = req.session.user.id;
  const { id_destinataire, contenu, type_message } = req.body;

  try {
    let messageData = {
      id_expediteur: senderId,
      id_destinataire,
      contenu: contenu || '',
      type_message: type_message || 'TEXT',
      est_lu: 0
    };

    // Gérer l'upload de fichier
    if (req.file) {
      messageData.fichier_path = `/uploads/messages/${req.file.filename}`;
      messageData.type_message = 'FILE';
    }

    const messageId = await Message.create(messageData);

    // Récupérer le message complet avec les infos de l'expéditeur
    const message = await Message.findById(messageId);
    const sender = await User.findById(senderId);
    
    // Créer une notification automatique
    await NotificationService.notifyNewMessage(senderId, messageData.id_destinataire, messageData.contenu);
    
    // Envoyer une notification en temps réel à l'admin
    try {
      const { sendAdminNotification } = require('../config/socket');
      sendAdminNotification({
        id: `msg_${messageId}`,
        type: 'message',
        title: 'Nouveau message',
        content: messageData.contenu,
        sender_id: senderId,
        created_at: new Date().toISOString()
      });
    } catch (socketError) {
      console.error('Error sending real-time notification to admin:', socketError);
    }
    
    // Créer une notification pour le guide si le destinataire est un guide
    if (messageData.id_destinataire) {
      try {
        const receiver = await User.findById(messageData.id_destinataire);
        if (receiver && receiver.role === 'GUIDE') {
          await createMessageNotification(senderId, messageData.id_destinataire, messageData.contenu);
        }
      } catch (notifError) {
        console.error('Error creating guide notification:', notifError);
      }
    }
    
    res.json({ 
      success: true, 
      message: {
        ...message,
        expediteur_nom: sender.nom_complet
      }
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get new messages (for real-time updates)
 */
exports.getNewMessages = async (req, res) => {
  const userId = req.session.user.id;
  const otherUserId = req.params.userId;
  const lastMessageId = parseInt(req.query.lastMessageId) || 0;

  try {
    const messages = await Message.getNewMessages(userId, otherUserId, lastMessageId);
    
    // Enrichir avec les noms des expéditeurs
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await User.findById(msg.id_expediteur);
        return {
          ...msg,
          expediteur_nom: sender.nom_complet
        };
      })
    );
    
    res.json({ success: true, messages: enriched });
  } catch (err) {
    console.error('Error getting new messages:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Delete a message
 */
exports.deleteMessage = async (req, res) => {
  const messageId = req.params.id;
  const userId = req.session.user.id;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Check if user owns this message
    if (message.id_expediteur !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    await Message.delete(messageId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Search messages
 */
exports.searchMessages = async (req, res) => {
  const userId = req.session.user.id;
  const { query } = req.query;

  try {
    const messages = await Message.searchMessages(userId, query);
    
    // Enrichir avec les noms des expéditeurs
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await User.findById(msg.id_expediteur);
        return {
          ...msg,
          expediteur_nom: sender.nom_complet
        };
      })
    );
    
    res.json({ success: true, messages: enriched });
  } catch (err) {
    console.error('Error searching messages:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get unread messages count
 */
exports.getUnreadCount = async (req, res) => {
  const userId = req.session.user.id;

  try {
    const count = await Message.getUnreadCount(userId);
    res.json({ success: true, count });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Upload file for message
 */
exports.uploadMessageFile = upload.single('file');

/**
 * Mark message as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const messageId = req.params.id;
    await Message.markAsRead(messageId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get conversation statistics
 */
exports.getConversationStats = async (req, res) => {
  const userId = req.session.user.id;
  const otherUserId = req.params.userId;

  try {
    const stats = await Message.getConversationStats(userId, otherUserId);
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error getting conversation stats:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
