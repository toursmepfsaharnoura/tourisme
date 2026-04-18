-- Booking and Reviews Tables for Tourism PFE Project
-- These tables add booking and review functionality to touristic plans

-- Bookings Table
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `tourist_id` int NOT NULL,
  `number_of_participants` int NOT NULL DEFAULT 1,
  `total_price` float NOT NULL,
  `booking_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('PENDING','CONFIRMED','CANCELLED','COMPLETED') DEFAULT 'PENDING',
  `special_requests` text,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  KEY `tourist_id` (`tourist_id`),
  KEY `status` (`status`),
  KEY `booking_date` (`booking_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews Table
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `tourist_id` int NOT NULL,
  `guide_id` int NOT NULL,
  `rating` int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  `comment` text,
  `review_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `helpful_count` int DEFAULT 0,
  `status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  KEY `tourist_id` (`tourist_id`),
  KEY `guide_id` (`guide_id`),
  KEY `rating` (`rating`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraints if the related tables exist
-- ALTER TABLE `bookings` 
-- ADD CONSTRAINT `fk_bookings_plan` FOREIGN KEY (`plan_id`) REFERENCES `touristic_plans` (`id`) ON DELETE CASCADE,
-- ADD CONSTRAINT `fk_bookings_tourist` FOREIGN KEY (`tourist_id`) REFERENCES `touristes` (`id`) ON DELETE CASCADE;

-- ALTER TABLE `reviews` 
-- ADD CONSTRAINT `fk_reviews_plan` FOREIGN KEY (`plan_id`) REFERENCES `touristic_plans` (`id`) ON DELETE CASCADE,
-- ADD CONSTRAINT `fk_reviews_tourist` FOREIGN KEY (`tourist_id`) REFERENCES `touristes` (`id`) ON DELETE CASCADE,
-- ADD CONSTRAINT `fk_reviews_guide` FOREIGN KEY (`guide_id`) REFERENCES `guides` (`id`) ON DELETE CASCADE;

-- Insert sample data for testing
INSERT INTO `bookings` 
(`plan_id`, `tourist_id`, `number_of_participants`, `total_price`, `status`, `contact_phone`, `contact_email`) 
VALUES 
(1, 1, 2, 500.00, 'CONFIRMED', '55123456', 'tourist1@example.com'),
(2, 2, 1, 85.00, 'PENDING', '55234567', 'tourist2@example.com'),
(3, 1, 4, 480.00, 'CONFIRMED', '55345678', 'tourist1@example.com');

INSERT INTO `reviews` 
(`plan_id`, `tourist_id`, `guide_id`, `rating`, `comment`, `status`) 
VALUES 
(1, 1, 1, 5, 'Amazing experience in the Sahara desert! The guide was very knowledgeable and the camel trekking was unforgettable. Highly recommend!', 'APPROVED'),
(2, 2, 1, 4, 'Great tour of Tunis Medina. The guide showed us hidden gems we would have never found on our own. The only small issue was that it was a bit crowded.', 'APPROVED'),
(3, 1, 2, 5, 'Perfect beach day! The water sports were fun and the seafood lunch was delicious. Great value for money.', 'APPROVED');
