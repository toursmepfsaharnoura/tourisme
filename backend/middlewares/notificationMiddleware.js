const notificationService = require('../services/notificationService');

/**
 * Initialiser le service de notification avec Socket.io
 */
const initializeNotifications = (io) => {
  global.io = io;
  
  io.on('connection', (socket) => {
    console.log('🔗 User connected:', socket.id);
    
    socket.on('joinGuideNotifications', (userId) => {
      socket.join(`notifications_${userId}`);
      socket.join(`user_${userId}`);
      console.log('📢 User', userId, 'joined notifications room');
    });
    
    socket.on('leaveGuideNotifications', (userId) => {
      socket.leave(`notifications_${userId}`);
      socket.leave(`user_${userId}`);
      console.log('📤 User', userId, 'left notifications room');
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 User disconnected:', socket.id);
    });
  });
};

/**
 * Créer une notification pour message
 */
const createMessageNotification = async (senderId, receiverId, content) => {
  try {
    await notificationService.notifyNewMessage(senderId, receiverId, content);
  } catch (error) {
    console.error('❌ Error creating message notification:', error.message);
  }
};

/**
 * Créer une notification pour avis
 */
const createAvisNotification = async (guideId, avisData) => {
  try {
    await notificationService.notifyNewAvis(avisData);
  } catch (error) {
    console.error('❌ Error creating avis notification:', error.message);
  }
};

/**
 * Créer une notification pour réservation
 */
const createReservationNotification = async (guideId, reservationData) => {
  try {
    await notificationService.notifyNewReservation(reservationData);
  } catch (error) {
    console.error('❌ Error creating reservation notification:', error.message);
  }
};

/**
 * Créer une notification admin
 */
const createAdminNotification = async (type, content) => {
  try {
    await notificationService.createAdminNotification(type, content);
  } catch (error) {
    console.error('❌ Error creating admin notification:', error.message);
  }
};

/**
 * Fonction unifiée de notification
 */
const createNotification = async (userId, type, content, isAdmin = false) => {
  try {
    await notificationService.createNotification(userId, type, content, isAdmin);
  } catch (error) {
    console.error('❌ Error creating notification:', error.message);
  }
};

module.exports = {
  initializeNotifications,
  createMessageNotification,
  createAvisNotification,
  createReservationNotification,
  createAdminNotification,
  createNotification,
  notificationService
};
