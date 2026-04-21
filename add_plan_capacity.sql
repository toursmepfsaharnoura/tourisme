-- Add maximum capacity field to existing plans
ALTER TABLE plans_touristiques
ADD COLUMN capacite_max INT NULL AFTER prix;
