const { Server } = require("socket.io");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { 
      origin: "*",
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Rejoindre la room utilisateur
    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room user_${userId}`);
    });

    // Rejoindre la room admin pour les notifications en temps réel
    socket.on("joinAdmin", () => {
      socket.join("admin_room");
      console.log(`Admin joined admin room`);
    });

    // Rejoindre la room notifications admin
    socket.on("joinNotifications", () => {
      socket.join("admin_notifications");
      console.log(`User joined admin notifications room`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });

    // Handler pour les notifications de test
    socket.on("testNotification", (notification) => {
      console.log("🧪 Test notification received:", notification);
      // Diffuser à tous les admins
      io.to('admin_notifications').emit('newNotification', notification);
      io.to('admin_room').emit('newNotification', notification);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket not initialized");
  return io;
}

// Envoyer une notification en temps réel à l'admin
function sendAdminNotification(notification) {
  if (!io) {
    console.log('❌ Socket.IO not initialized, cannot send admin notification');
    return;
  }

  console.log('📡 Sending real-time notification to admin:', notification);
  
  // Envoyer à la room admin_notifications
  io.to('admin_notifications').emit('newNotification', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    content: notification.content,
    sender_id: notification.sender_id,
    created_at: notification.created_at,
    is_read: false,
    timestamp: new Date().toISOString()
  });

  // Envoyer aussi à la room admin_room (compatibilité)
  io.to('admin_room').emit('newNotification', notification);
}

module.exports = { initSocket, getIO, sendAdminNotification };
