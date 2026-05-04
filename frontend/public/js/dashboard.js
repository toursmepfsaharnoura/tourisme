// Dashboard JavaScript - Professional Notification System

// Tab switching functionality
function switchTab(tab) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach(el => {
    el.classList.add("hidden");
  });

  // Remove active class from all buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  // Show selected tab
  const activeTab = document.getElementById(tab);
  if (activeTab) {
    activeTab.classList.remove("hidden");
  }

  // Add active class to clicked button
  const activeBtn = document.getElementById("btn-" + tab);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }
}

// Delete notification function
async function deleteNotification(id) {
  try {
    const response = await fetch(`/notifications/${id}`, {
      method: "DELETE"
    });

    if (response.ok) {
      const notificationElement = document.getElementById("notif-" + id);
      if (notificationElement) {
        notificationElement.remove();
      }
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    alert("Erreur lors de la suppression de la notification");
  }
}

// Load notifications with real-time updates
async function loadNotifications() {
  try {
    const response = await fetch("/notifications");
    const data = await response.json();

    const container = document.getElementById("notifList");
    container.innerHTML = "";

    data.forEach(notification => {
      container.innerHTML += `
        <div id="notif-${notification.id}" class="p-3 border flex justify-between items-center">
          <div>
            <strong>${notification.type}</strong> - ${notification.content}
          </div>
          <button onclick="deleteNotification(${notification.id})" class="text-red-500 px-2 py-1 rounded">
            Supprimer
          </button>
        </div>
      `;
    });

  } catch (error) {
    console.error("Erreur:", error);
    document.getElementById("notifList").innerHTML = 
      "<p class='text-red-500'>Erreur serveur - vérifiez backend</p>";
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadNotifications();
  
  // Auto-refresh every 30 seconds
  setInterval(loadNotifications, 30000);
});
