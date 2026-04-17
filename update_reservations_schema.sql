-- Update reservations table to include ANNULEE status
ALTER TABLE reservations MODIFY COLUMN statut enum('EN_ATTENTE','CONFIRMEE','ANNULEE') COLLATE utf8mb4_unicode_ci DEFAULT 'EN_ATTENTE';

-- Add additional columns for better reservation management
ALTER TABLE reservations ADD COLUMN date_reservation DATE NULL AFTER statut;
ALTER TABLE reservations ADD COLUMN nombre_personnes INT NULL AFTER date_reservation;
ALTER TABLE reservations ADD COLUMN email_contact VARCHAR(255) NULL AFTER nombre_personnes;
ALTER TABLE reservations ADD COLUMN telephone_contact VARCHAR(20) NULL AFTER email_contact;
ALTER TABLE reservations ADD COLUMN message TEXT NULL AFTER telephone_contact;