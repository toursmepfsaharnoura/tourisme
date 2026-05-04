-- Create notifications table (Updated - Removed Paiement and Abonnement)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('MESSAGE', 'AVIS', 'RESERVATION', 'CV') NOT NULL,
    contenu TEXT NOT NULL,
    id_utilisateur INT NOT NULL,
    est_vu BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    INDEX idx_id_utilisateur (id_utilisateur),
    INDEX idx_est_vu (est_vu),
    INDEX idx_type (type),
    INDEX idx_date_creation (date_creation)
);

-- Insert sample notifications for testing
INSERT INTO notifications (type, contenu, id_utilisateur, est_vu) VALUES
('MESSAGE', 'Nouveau message de l''administrateur: Bienvenue sur la plateforme', 1, FALSE),
('AVIS', 'Nouvel avis reçu: Excellent guide, très professionnel', 1, FALSE),
('RESERVATION', 'Nouvelle réservation: Tour de Tunis - 3 personnes', 1, FALSE),
('CV', 'Votre CV a été approuvé avec succès', 1, FALSE);
