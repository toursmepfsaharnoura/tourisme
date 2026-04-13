-- Migration to add missing fields to plans_touristiques table
-- This will fix the NULL values issue when creating plans

-- Add missing columns to plans_touristiques table
ALTER TABLE `plans_touristiques` 
ADD COLUMN `max_participants` INT DEFAULT 10 COMMENT 'Maximum number of participants for the plan',
ADD COLUMN `id_gouvernorat` INT NULL COMMENT 'Primary governorat where the plan takes place',
ADD COLUMN `id_delegation` INT NULL COMMENT 'Primary delegation where the plan takes place',
ADD COLUMN `image` VARCHAR(255) NULL COMMENT 'Main image for the plan',
ADD COLUMN `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN `statut` ENUM('ACTIF', 'INACTIF', 'ANNULE') DEFAULT 'ACTIF' COMMENT 'Plan status';

-- Add indexes for better performance
ALTER TABLE `plans_touristiques` 
ADD INDEX `idx_max_participants` (`max_participants`),
ADD INDEX `idx_id_gouvernorat` (`id_gouvernorat`),
ADD INDEX `idx_id_delegation` (`id_delegation`),
ADD INDEX `idx_statut` (`statut`),
ADD INDEX `idx_created_at` (`created_at`);

-- Add foreign key constraints if they don't exist
-- Note: Uncomment these if you have the referenced tables and want strict referential integrity
-- ALTER TABLE `plans_touristiques` 
-- ADD CONSTRAINT `fk_plans_gouvernorat` FOREIGN KEY (`id_gouvernorat`) REFERENCES `gouvernorats` (`id`) ON DELETE SET NULL,
-- ADD CONSTRAINT `fk_plans_delegation` FOREIGN KEY (`id_delegation`) REFERENCES `delegations` (`id`) ON DELETE SET NULL;

-- Update existing NULL records with default values
UPDATE `plans_touristiques` 
SET 
    max_participants = 10,
    id_gouvernorat = 1,
    id_delegation = 1,
    statut = 'ACTIF'
WHERE 
    max_participants IS NULL OR 
    id_gouvernorat IS NULL OR 
    id_delegation IS NULL OR 
    statut IS NULL;

-- Set created_at and updated_at for existing records
UPDATE `plans_touristiques` 
SET 
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE 
    created_at IS NULL OR 
    updated_at IS NULL;
