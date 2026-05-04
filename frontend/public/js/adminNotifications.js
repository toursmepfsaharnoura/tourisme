class AdminNotificationSystem {
  constructor() {
    this.unreadCount = 0;
    this.currentTab = 'all';
    this.notifications = [];
    this.pollingInterval = null;
    this.socket = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startPolling();
    this.initSocket();
    this.loadNotifications();
  }

  setupEventListeners() {
    // Tabs
    document.querySelectorAll('.notification-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Mark as read
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('mark-read-btn')) {
        e.preventDefault();
        const notificationId = e.target.dataset.notificationId;
        this.markAsRead(notificationId);
      }
    });

    // Mark all as read
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('mark-all-read-btn')) {
        e.preventDefault();
        this.markAllAsRead();
      }
    });

    // Delete notification
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-notification-btn')) {
        e.preventDefault();
        const notificationId = e.target.dataset.notificationId;
        this.deleteNotification(notificationId);
      }
    });
  }

  initSocket() {
    try {
      this.socket = io({
        transports: ['websocket', 'polling'],
        upgrade: true
      });
      
      // Connexion réussie
      this.socket.on('connect', () => {
        console.log('✅ Connecté au serveur Socket.io');
        
        // Rejoindre la salle de notifications admin
        this.socket.emit('joinNotifications');
        this.socket.emit('joinAdmin');
        
        // Charger le nombre de notifications non lues
        this.loadUnreadCount();
      });
      
      // Nouvelle notification
      this.socket.on('newNotification', (data) => {
        console.log('🔔 Nouvelle notification reçue:', data);
        this.addRealtimeNotification(data);
        this.updateUnreadCount();
        this.showNotificationToast(data);
      });
      
      // Notification admin importante
      this.socket.on('adminNotification', (data) => {
        console.log('📢 Notification admin importante:', data);
        this.addRealtimeNotification(data);
        this.updateUnreadCount();
        this.showNotificationToast(data, true);
      });
      
      // Mise à jour du compteur de non lus
      this.socket.on('unreadCount', (data) => {
        console.log('📊 Compteur de non lus:', data.count);
        this.unreadCount = data.count;
        this.updateUnreadCountBadge();
      });
      
      // Notification marquée comme lue
      this.socket.on('notificationRead', (data) => {
        console.log('✅ Notification marquée comme lue:', data);
        this.updateNotificationReadStatus(data.id);
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.updateUnreadCountBadge();
      });
      
      // Erreur de connexion
      this.socket.on('connect_error', (err) => {
        console.error('❌ Erreur de connexion Socket.io:', err);
      });
      
      // Déconnexion
      this.socket.on('disconnect', () => {
        console.log('❌ Déconnecté du serveur Socket.io');
      });
      
    } catch (err) {
      console.log('⚠️ Socket.io non disponible, utilisation du polling uniquement');
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    // Update active tab styling
    document.querySelectorAll('.notification-tab').forEach(t => {
      t.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Reload notifications for this tab
    this.loadNotifications();
  }

  async loadNotifications() {
    try {
      const response = await fetch(`/admin/api/notifications?tab=${this.currentTab}`);
      const data = await response.json();
      
      this.notifications = data.notifications || [];
      this.unreadCount = data.unreadCount || 0;
      
      this.renderNotifications();
      this.updateUnreadCountBadge();
      
    } catch (err) {
      console.error('❌ Erreur chargement notifications:', err);
    }
  }

  renderNotifications() {
    const container = document.getElementById('notifications-container');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="empty-notifications">
          <div class="empty-icon">📭</div>
          <h4>Aucune notification</h4>
          <p>Vous n'avez pas de notifications dans cette catégorie</p>
        </div>
      `;
      return;
    }

    const notificationsHTML = this.notifications.map(notification => this.createNotificationHTML(notification)).join('');
    container.innerHTML = notificationsHTML;
  }

  createNotificationHTML(notification) {
    const typeClass = this.getTypeClass(notification.type);
    const icon = this.getTypeIcon(notification.type);
    const readClass = notification.is_read ? 'read' : 'unread';
    
    return `
      <div class="notification-item ${readClass}" data-notification-id="${notification.id}">
        <div class="notification-icon ${typeClass}">
          ${icon}
        </div>
        <div class="notification-content">
          <div class="notification-header">
            <h4 class="notification-title">${notification.title}</h4>
            <span class="notification-time">${this.formatTime(notification.created_at)}</span>
          </div>
          <p class="notification-text">${notification.content}</p>
          <div class="notification-actions">
            ${!notification.is_read ? `
              <button class="mark-read-btn" data-notification-id="${notification.id}">
                <i class="fas fa-check"></i> Marquer comme lu
              </button>
            ` : ''}
            <button class="delete-notification-btn" data-notification-id="${notification.id}">
              <i class="fas fa-trash"></i> Supprimer
            </button>
          </div>
        </div>
      </div>
    `;
  }

  getTypeClass(type) {
    const classes = {
      'message': 'message-type',
      'avis': 'avis-type',
      'reservation': 'reservation-type',
      'paiement': 'paiement-type',
      'abonnement': 'abonnement-type',
      'cv': 'cv-type'
    };
    return classes[type] || 'default-type';
  }

  getTypeIcon(type) {
    const icons = {
      'message': '💬',
      'avis': '⭐',
      'reservation': '📅',
      'paiement': '💳',
      'abonnement': '👑',
      'cv': '📄'
    };
    return icons[type] || '🔔';
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    
    return date.toLocaleDateString('fr-FR');
  }

  async markAsRead(notificationId) {
    try {
      const response = await fetch('/admin/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        this.updateNotificationReadStatus(notificationId);
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.updateUnreadCountBadge();
      }
    } catch (err) {
      console.error('❌ Erreur marquer comme lu:', err);
    }
  }

  async markAllAsRead() {
    try {
      const response = await fetch('/admin/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.notifications.forEach(notification => {
          notification.is_read = true;
        });
        this.unreadCount = 0;
        this.renderNotifications();
        this.updateUnreadCountBadge();
      }
    } catch (err) {
      console.error('❌ Erreur tout marquer comme lu:', err);
    }
  }

  async deleteNotification(notificationId) {
    try {
      const response = await fetch(`/admin/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        if (!this.notifications.find(n => n.id === notificationId && !n.is_read)) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        this.renderNotifications();
        this.updateUnreadCountBadge();
      }
    } catch (err) {
      console.error('❌ Erreur suppression notification:', err);
    }
  }

  updateNotificationReadStatus(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.is_read = true;
      const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
      if (element) {
        element.classList.remove('unread');
        element.classList.add('read');
        const markReadBtn = element.querySelector('.mark-read-btn');
        if (markReadBtn) {
          markReadBtn.remove();
        }
      }
    }
  }

  updateUnreadCountBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? 'inline-block' : 'none';
    }
  }

  addRealtimeNotification(notification) {
    // Ajouter la nouvelle notification au début de la liste
    this.notifications.unshift({
      ...notification,
      is_read: false
    });
    
    // Si on est sur l'onglet "all" ou le bon type, afficher la notification
    if (this.currentTab === 'all' || this.currentTab === notification.type) {
      const container = document.getElementById('notifications-container');
      if (container) {
        const newNotificationHTML = this.createNotificationHTML(notification);
        container.insertAdjacentHTML('afterbegin', newNotificationHTML);
      }
    }
    
    this.unreadCount++;
    this.updateUnreadCountBadge();
  }

  showNotificationToast(notification, isImportant = false) {
    // Créer une notification toast temporaire
    const toast = document.createElement('div');
    toast.className = isImportant ? 'notification-toast important' : 'notification-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">${this.getTypeIcon(notification.type)}</div>
        <div class="toast-text">
          <strong>${notification.title}</strong>
          <p>${notification.content}</p>
        </div>
        <button class="toast-close">&times;</button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-supprimer après 5 secondes (10 secondes pour les notifications importantes)
    setTimeout(() => {
      toast.remove();
    }, isImportant ? 10000 : 5000);
    
    // Fermeture manuelle
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });
    
    // Son de notification si disponible
    if ('Notification' in window && isImportant) {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});
    }
  }

  async loadUnreadCount() {
    try {
      const response = await fetch('/admin/api/notifications/unread-count');
      const data = await response.json();
      this.unreadCount = data.unreadCount || 0;
      this.updateUnreadCountBadge();
    } catch (err) {
      console.error('❌ Erreur chargement compteur non lus:', err);
    }
  }

  startPolling() {
    // Rafraîchir les notifications toutes les 30 secondes
    this.pollingInterval = setInterval(() => {
      this.loadNotifications();
      this.loadUnreadCount();
    }, 30000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }
}

// Initialiser le système quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('notifications-container')) {
    window.adminNotificationSystem = new AdminNotificationSystem();
  }
});

// Nettoyer quand on quitte la page
window.addEventListener('beforeunload', () => {
  if (window.adminNotificationSystem) {
    window.adminNotificationSystem.stopPolling();
  }
});
