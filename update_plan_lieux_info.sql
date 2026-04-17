-- Add name and description to existing plan locations
ALTER TABLE plan_lieux
ADD COLUMN nom VARCHAR(255) NULL AFTER type,
ADD COLUMN description TEXT NULL AFTER nom;
