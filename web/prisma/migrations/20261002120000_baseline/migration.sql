-- CreateTable
CREATE TABLE `activity_logs` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `action` VARCHAR(255) NOT NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_id` CHAR(36) NULL,
    `metadata` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_activity_logs_created_at`(`created_at`),
    INDEX `idx_activity_logs_tenant`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NULL,
    `employee_id` CHAR(36) NULL,
    `service_id` CHAR(36) NOT NULL,
    `appointment_date` DATE NOT NULL,
    `start_time` VARCHAR(8) NOT NULL,
    `end_time` VARCHAR(8) NOT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'pending',
    `total_price` DECIMAL(10, 2) NULL,
    `prepaid_amount` DECIMAL(10, 2) NULL DEFAULT 0,
    `payment_status` VARCHAR(50) NULL DEFAULT 'unpaid',
    `notes` TEXT NULL,
    `rating` INTEGER NULL,
    `review` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `room_id` CHAR(36) NULL,
    `client_name` TEXT NULL,
    `client_email` TEXT NULL,
    `client_phone` TEXT NULL,
    `booking_number` TEXT NULL,

    INDEX `idx_appointments_booking_number`(`booking_number`(191)),
    INDEX `idx_appointments_client`(`client_id`),
    INDEX `idx_appointments_client_email`(`client_email`(191)),
    INDEX `idx_appointments_employee`(`employee_id`),
    INDEX `idx_appointments_room`(`room_id`),
    INDEX `idx_appointments_status`(`status`),
    INDEX `idx_appointments_tenant_client_email`(`tenant_id`, `client_email`(191)),
    INDEX `idx_appointments_tenant_date`(`tenant_id`, `appointment_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_sequences` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `last_number` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_booking_sequences_tenant_date`(`tenant_id`, `date`),
    UNIQUE INDEX `booking_sequences_tenant_id_date_key`(`tenant_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `is_main` BOOLEAN NULL DEFAULT false,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_branches_tenant`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_templates` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(500) NOT NULL,
    `type` TEXT NULL DEFAULT 'service',
    `icon_emoji` TEXT NULL,
    `display_order` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `category_templates_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_subscriptions` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `service_id` CHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `total_sessions` INTEGER NOT NULL,
    `used_sessions` INTEGER NULL DEFAULT 0,
    `price` DECIMAL(10, 2) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `status` VARCHAR(50) NULL DEFAULT 'active',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_client_subscriptions_client`(`client_id`),
    INDEX `idx_client_subscriptions_tenant`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NULL,
    `loyalty_points` INTEGER NULL DEFAULT 0,
    `total_visits` INTEGER NULL DEFAULT 0,
    `total_spent` DECIMAL(10, 2) NULL DEFAULT 0,
    `birthday` DATE NULL,
    `allergies` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `email` TEXT NULL,
    `name` TEXT NOT NULL,
    `phone` TEXT NULL,
    `last_visit` DATETIME(3) NULL,

    INDEX `idx_clients_profile`(`profile_id`),
    INDEX `idx_clients_tenant`(`tenant_id`),
    UNIQUE INDEX `clients_tenant_id_profile_id_key`(`tenant_id`, `profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_messages` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NULL,
    `name` TEXT NOT NULL,
    `email` TEXT NOT NULL,
    `phone` TEXT NULL,
    `message` TEXT NOT NULL,
    `subject` TEXT NULL,
    `is_read` BOOLEAN NULL DEFAULT false,
    `replied` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reply` TEXT NULL,
    `reply_date` DATETIME(3) NULL,

    INDEX `idx_contact_messages_created_at`(`created_at`),
    INDEX `idx_contact_messages_is_read`(`is_read`),
    INDEX `idx_contact_messages_tenant_id`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_templates` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `variables` JSON NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_absences` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `reason` VARCHAR(255) NULL,
    `is_paid` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_employee_absences_employee`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_availability` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `day_of_week` INTEGER NULL,
    `start_time` VARCHAR(8) NULL,
    `end_time` VARCHAR(8) NULL,
    `is_available` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_employee_availability_employee`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_schedules` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `day_of_week` INTEGER NULL,
    `start_time` VARCHAR(8) NULL,
    `end_time` VARCHAR(8) NULL,
    `is_day_off` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_employee_schedules_employee`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `employee_number` INTEGER NOT NULL,
    `position` VARCHAR(100) NULL,
    `commission_rate` DECIMAL(5, 2) NULL DEFAULT 0,
    `is_cashier` BOOLEAN NULL DEFAULT false,
    `average_rating` DECIMAL(3, 2) NULL DEFAULT 0,
    `total_clients_served` INTEGER NULL DEFAULT 0,
    `is_available` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_active` BOOLEAN NULL DEFAULT true,

    INDEX `idx_employees_number`(`tenant_id`, `employee_number`),
    INDEX `idx_employees_tenant`(`tenant_id`),
    UNIQUE INDEX `employees_tenant_id_employee_number_key`(`tenant_id`, `employee_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipment` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `reference` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `purchase_date` DATE NULL,
    `purchase_price` DECIMAL(10, 2) NULL,
    `warranty_end` DATE NULL,
    `supplier` VARCHAR(255) NULL,
    `status` VARCHAR(50) NULL DEFAULT 'active',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `image_url` TEXT NOT NULL,
    `title` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NULL,
    `is_approved` BOOLEAN NULL DEFAULT true,
    `display_order` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_gallery_is_approved`(`is_approved`),
    INDEX `idx_gallery_tenant_id`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gift_card_orders` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NULL,
    `code` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `recipient_name` VARCHAR(255) NULL,
    `recipient_email` VARCHAR(255) NULL,
    `message` TEXT NULL,
    `purpose` VARCHAR(100) NULL,
    `delivery_method` VARCHAR(50) NULL DEFAULT 'presentielle',
    `status` VARCHAR(50) NULL DEFAULT 'pending',
    `payment_status` VARCHAR(50) NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validated_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,

    INDEX `idx_gift_card_orders_status`(`status`),
    INDEX `idx_gift_card_orders_tenant_id`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gift_cards` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `recipient_name` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recipient_phone` TEXT NOT NULL,
    `tenant_name` TEXT NULL,
    `tenant_logo` TEXT NULL,
    `tenant_primary_color` TEXT NULL DEFAULT '#ec4899',
    `sender_name` TEXT NOT NULL,
    `occasion` TEXT NULL DEFAULT 'other',
    `delivery_method` TEXT NULL DEFAULT 'whatsapp',
    `payment_method` TEXT NULL,
    `status` TEXT NULL DEFAULT 'pending',
    `paid_at` DATETIME(3) NULL,
    `validated_at` DATETIME(3) NULL,
    `used_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `payment_status` VARCHAR(50) NULL DEFAULT 'payé',
    `balance` DECIMAL(10, 2) NULL DEFAULT 0,
    `expiry_date` DATE NULL,
    `purchase_date` DATE NULL,
    `recipient_email` VARCHAR(255) NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `sender_phone` VARCHAR(50) NULL,

    INDEX `idx_gift_cards_code`(`code`),
    INDEX `idx_gift_cards_created_at`(`created_at`),
    INDEX `idx_gift_cards_status`(`status`(191)),
    INDEX `idx_gift_cards_tenant`(`tenant_id`),
    INDEX `idx_gift_cards_tenant_id`(`tenant_id`),
    UNIQUE INDEX `gift_cards_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `home_visits` (
    `id` CHAR(36) NOT NULL,
    `appointment_id` CHAR(36) NOT NULL,
    `address` TEXT NOT NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `travel_fee` DECIMAL(10, 2) NULL,
    `travel_time_minutes` INTEGER NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_home_visits_appointment`(`appointment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyalty_settings` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `points_per_amount` INTEGER NULL DEFAULT 1,
    `amount_per_point` INTEGER NULL DEFAULT 100,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `loyalty_settings_tenant_id_key`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketing_campaigns` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(50) NULL,
    `content` TEXT NULL,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medical_notes` (
    `id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `condition_type` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `severity` VARCHAR(20) NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_medical_notes_client`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `news` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `excerpt` TEXT NULL,
    `content` TEXT NOT NULL,
    `category` VARCHAR(50) NULL,
    `status` VARCHAR(20) NULL DEFAULT 'Draft',
    `image_url` TEXT NULL,
    `scheduled_publish_date` DATETIME(3) NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `tenant_id` CHAR(36) NULL,
    `type` TEXT NOT NULL,
    `title` TEXT NOT NULL,
    `message` TEXT NULL,
    `is_read` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_notifications_created_at`(`created_at`),
    INDEX `idx_notifications_is_read`(`is_read`),
    INDEX `idx_notifications_tenant_id`(`tenant_id`),
    INDEX `idx_notifications_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `duration_minutes` INTEGER NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `services` JSON NULL,
    `valid_days` INTEGER NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `general` JSON NULL,
    `security` JSON NULL,
    `notifications` JSON NULL,
    `payments` JSON NULL,
    `subscriptions` JSON NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `app` JSON NULL,
    `seo` JSON NULL,
    `social` JSON NULL,
    `branding` JSON NULL,
    `hero` JSON NULL,
    `cta` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `reference` VARCHAR(100) NULL,
    `purchase_price` DECIMAL(10, 2) NULL,
    `selling_price` DECIMAL(10, 2) NULL,
    `stock_quantity` INTEGER NULL DEFAULT 0,
    `min_stock_alert` INTEGER NULL DEFAULT 5,
    `unit` VARCHAR(50) NULL DEFAULT 'piece',
    `supplier` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_active` BOOLEAN NULL DEFAULT true,
    `media_type` TEXT NULL DEFAULT 'image',
    `category` TEXT NULL,
    `image_url` TEXT NULL,
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_products_tenant`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NULL,
    `email` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `role` VARCHAR(50) NOT NULL,
    `avatar` TEXT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `must_change_password` BOOLEAN NOT NULL DEFAULT true,

    INDEX `idx_profiles_role`(`role`),
    INDEX `idx_profiles_tenant`(`tenant_id`),
    UNIQUE INDEX `profiles_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promotions` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `type` VARCHAR(50) NULL,
    `value` DECIMAL(10, 2) NOT NULL,
    `min_purchase` DECIMAL(10, 2) NULL DEFAULT 0,
    `max_uses` INTEGER NULL DEFAULT 0,
    `used_count` INTEGER NULL DEFAULT 0,
    `start_date` DATE NULL,
    `end_date` DATE NOT NULL,
    `applicable_clients` VARCHAR(50) NULL DEFAULT 'all',
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `promotions_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publications` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `content` TEXT NULL,
    `type` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'draft',
    `image_url` TEXT NULL,
    `link_url` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `is_highlighted` BOOLEAN NULL DEFAULT false,
    `display_order` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `video_url` TEXT NULL,

    INDEX `idx_publications_display_order`(`display_order`),
    INDEX `idx_publications_status`(`status`(191)),
    INDEX `idx_publications_tenant_id`(`tenant_id`),
    INDEX `idx_publications_tenant_status`(`tenant_id`, `status`(191)),
    INDEX `idx_publications_type`(`type`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NULL,
    `service_id` CHAR(36) NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `is_approved` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `appointment_id` CHAR(36) NULL,

    INDEX `idx_reviews_client_id`(`client_id`),
    INDEX `idx_reviews_employee_id`(`employee_id`),
    INDEX `idx_reviews_is_approved`(`is_approved`),
    INDEX `idx_reviews_tenant_id`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` VARCHAR(50) NULL,
    `is_available` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_products` (
    `id` CHAR(36) NOT NULL,
    `service_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `quantity_used` DECIMAL(10, 2) NULL DEFAULT 1,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_templates` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `category_name` TEXT NULL,
    `duration` INTEGER NULL DEFAULT 30,
    `price` INTEGER NULL DEFAULT 5000,
    `icon_emoji` TEXT NULL DEFAULT '✂️',
    `salon_type` TEXT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `display_order` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `service_templates_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_zones` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `neighborhood` VARCHAR(100) NULL,
    `travel_fee` DECIMAL(10, 2) NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `duration` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `category` VARCHAR(100) NULL,
    `salon_type` VARCHAR(100) NULL,
    `icon_emoji` VARCHAR(10) NULL DEFAULT '✂️',
    `display_order` INTEGER NULL DEFAULT 0,
    `image_url` TEXT NULL,
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cover_image` TEXT NULL,

    INDEX `idx_services_tenant`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sms_templates` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `body` TEXT NOT NULL,
    `variables` JSON NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `specialty_types` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `icon` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(10) NULL DEFAULT 'FCFA',
    `duration_months` INTEGER NOT NULL DEFAULT 1,
    `max_employees` INTEGER NULL DEFAULT 5,
    `max_services` INTEGER NULL DEFAULT 20,
    `max_products` INTEGER NULL DEFAULT 50,
    `features` JSON NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_subscription_plans_is_active`(`is_active`),
    INDEX `idx_subscription_plans_name`(`name`),
    INDEX `idx_subscription_plans_price`(`price`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `plan` VARCHAR(50) NOT NULL,
    `duration` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` VARCHAR(50) NULL,
    `payment_reference` VARCHAR(255) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validated_by` CHAR(36) NULL,
    `auto_renew` BOOLEAN NULL DEFAULT false,
    `max_employees` INTEGER NULL DEFAULT 5,
    `max_services` INTEGER NULL DEFAULT 20,
    `max_products` INTEGER NULL DEFAULT 50,
    `features` JSON NULL,
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validated_at` DATETIME(3) NULL,
    `rejected_at` DATETIME(3) NULL,

    INDEX `idx_subscriptions_status`(`status`),
    INDEX `idx_subscriptions_tenant_id`(`tenant_id`),
    INDEX `idx_subscriptions_validated_at`(`validated_at`),
    INDEX `idx_subscriptions_validated_by`(`validated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_tickets` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NULL,
    `user_id` CHAR(36) NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'open',
    `priority` VARCHAR(20) NULL DEFAULT 'medium',
    `category` VARCHAR(100) NULL,
    `assigned_to` CHAR(36) NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_support_tickets_created_at`(`created_at`),
    INDEX `idx_support_tickets_status`(`status`),
    INDEX `idx_support_tickets_tenant_id`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_home_settings` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `hero_title` TEXT NULL,
    `hero_subtitle` TEXT NULL,
    `hero_cta_text` TEXT NULL DEFAULT 'Commencer gratuitement',
    `hero_cta_link` TEXT NULL DEFAULT '/auth/signup',
    `hero_secondary_cta_text` TEXT NULL DEFAULT 'Se connecter',
    `hero_secondary_cta_link` TEXT NULL DEFAULT '/auth/login',
    `hero_badge_text` TEXT NULL DEFAULT '✨ Nouveau : Programme de fidélité amélioré',
    `hero_show_stats` BOOLEAN NULL DEFAULT true,
    `hero_background_type` TEXT NULL DEFAULT 'gradient',
    `hero_background_image` TEXT NULL,
    `hero_background_color` TEXT NULL DEFAULT '#2563eb',
    `hero_overlay_opacity` INTEGER NULL DEFAULT 70,
    `stats_title` TEXT NULL DEFAULT 'Nos chiffres',
    `stats_show` BOOLEAN NULL DEFAULT true,
    `stat_1_number` TEXT NULL DEFAULT '500+',
    `stat_1_label` TEXT NULL DEFAULT 'Salons partenaires',
    `stat_2_number` TEXT NULL DEFAULT '10k+',
    `stat_2_label` TEXT NULL DEFAULT 'Clients satisfaits',
    `stat_3_number` TEXT NULL DEFAULT '50k+',
    `stat_3_label` TEXT NULL DEFAULT 'Rendez-vous réservés',
    `partners_title` TEXT NULL DEFAULT 'Nos salons partenaires',
    `partners_subtitle` TEXT NULL DEFAULT 'Cliquez sur un salon pour découvrir sa vitrine',
    `partners_show` BOOLEAN NULL DEFAULT true,
    `partners_show_button` BOOLEAN NULL DEFAULT true,
    `partners_button_text` TEXT NULL DEFAULT 'Voir tous les salons',
    `features_title` TEXT NULL DEFAULT 'Pourquoi choisir BeautyFlow ?',
    `features_subtitle` TEXT NULL DEFAULT 'Une expérience unique pour prendre soin de vous',
    `features_show` BOOLEAN NULL DEFAULT true,
    `feature_1_title` TEXT NULL DEFAULT 'Réservation Facile',
    `feature_1_description` TEXT NULL DEFAULT 'Trouvez un créneau disponible 24/7 en quelques clics',
    `feature_1_icon` TEXT NULL DEFAULT 'Calendar',
    `feature_2_title` TEXT NULL DEFAULT 'Programme Fidélité',
    `feature_2_description` TEXT NULL DEFAULT 'Cumulez des points à chaque visite et profitez de réductions',
    `feature_2_icon` TEXT NULL DEFAULT 'Star',
    `feature_3_title` TEXT NULL DEFAULT 'Les Meilleurs Pros',
    `feature_3_description` TEXT NULL DEFAULT 'Consultez les avis certifiés pour choisir le professionnel',
    `feature_3_icon` TEXT NULL DEFAULT 'Users',
    `products_title` TEXT NULL DEFAULT 'Nos produits populaires',
    `products_subtitle` TEXT NULL DEFAULT 'Découvrez les produits préférés de nos clients',
    `products_show` BOOLEAN NULL DEFAULT true,
    `products_limit` INTEGER NULL DEFAULT 8,
    `cta_title` TEXT NULL DEFAULT 'Prêt à sublimer votre beauté ?',
    `cta_subtitle` TEXT NULL DEFAULT 'Rejoignez des milliers de clients satisfaits',
    `cta_button_text` TEXT NULL DEFAULT 'Créer un compte gratuit',
    `cta_button_link` TEXT NULL DEFAULT '/auth/signup',
    `cta_show` BOOLEAN NULL DEFAULT true,
    `cta_background_type` TEXT NULL DEFAULT 'gradient',
    `cta_background_image` TEXT NULL,
    `cta_background_color` TEXT NULL DEFAULT '#2563eb',
    `footer_show_social` BOOLEAN NULL DEFAULT true,
    `footer_copyright` TEXT NULL DEFAULT 'BeautyFlow',
    `seo_title` TEXT NULL,
    `seo_description` TEXT NULL,
    `seo_keywords` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `footer_address` TEXT NULL,
    `footer_phone` VARCHAR(255) NULL,
    `footer_email` VARCHAR(255) NULL,
    `footer_description` TEXT NULL,
    `footer_social_facebook` VARCHAR(500) NULL,
    `footer_social_instagram` VARCHAR(500) NULL,
    `footer_social_twitter` VARCHAR(500) NULL,
    `footer_social_linkedin` VARCHAR(500) NULL,
    `footer_social_youtube` VARCHAR(500) NULL,
    `footer_hours_monday` VARCHAR(100) NULL DEFAULT '09:00 - 19:00',
    `footer_hours_tuesday` VARCHAR(100) NULL DEFAULT '09:00 - 19:00',
    `footer_hours_wednesday` VARCHAR(100) NULL DEFAULT '09:00 - 19:00',
    `footer_hours_thursday` VARCHAR(100) NULL DEFAULT '09:00 - 19:00',
    `footer_hours_friday` VARCHAR(100) NULL DEFAULT '09:00 - 19:00',
    `footer_hours_saturday` VARCHAR(100) NULL DEFAULT '09:00 - 17:00',
    `footer_hours_sunday` VARCHAR(100) NULL DEFAULT 'Fermé',
    `footer_social_tiktok` TEXT NULL,

    UNIQUE INDEX `tenant_home_settings_tenant_id_key`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_settings` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `salon_name` VARCHAR(255) NULL,
    `salon_description` TEXT NULL,
    `salon_logo` TEXT NULL,
    `primary_color` VARCHAR(7) NULL DEFAULT '#ec4899',
    `secondary_color` VARCHAR(7) NULL DEFAULT '#06b6d4',
    `contact_email` VARCHAR(255) NULL,
    `contact_phone` VARCHAR(50) NULL,
    `contact_address` TEXT NULL,
    `opening_hours` JSON NULL,
    `pages_services_enabled` BOOLEAN NULL DEFAULT true,
    `pages_gallery_enabled` BOOLEAN NULL DEFAULT true,
    `pages_team_enabled` BOOLEAN NULL DEFAULT true,
    `pages_pricing_enabled` BOOLEAN NULL DEFAULT true,
    `pages_reviews_enabled` BOOLEAN NULL DEFAULT true,
    `booking_buffer_minutes` INTEGER NULL DEFAULT 15,
    `booking_advance_days` INTEGER NULL DEFAULT 30,
    `online_payment_required` BOOLEAN NULL DEFAULT false,
    `social_media` JSON NULL,
    `cancellation_policy` TEXT NULL,
    `refund_policy` TEXT NULL,
    `notification_email_enabled` BOOLEAN NULL DEFAULT true,
    `notification_sms_enabled` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `facebook_url` TEXT NULL,
    `instagram_url` TEXT NULL,
    `tiktok_url` TEXT NULL,
    `linkedin_url` TEXT NULL,
    `logo_url` TEXT NULL,
    `cover_image` TEXT NULL,
    `show_on_home` BOOLEAN NULL DEFAULT true,

    UNIQUE INDEX `tenant_settings_tenant_id_key`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_specialties` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `specialty_id` CHAR(36) NOT NULL,
    `is_primary` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tenant_specialties_tenant_id_specialty_id_key`(`tenant_id`, `specialty_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `logo` TEXT NULL,
    `primary_color` VARCHAR(7) NULL DEFAULT '#ec4899',
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `subscription_plan` VARCHAR(50) NULL DEFAULT 'starter',
    `subscription_status` VARCHAR(20) NULL DEFAULT 'inactive',
    `subscription_start` DATE NULL,
    `subscription_end` DATE NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `subscription_mode` VARCHAR(20) NULL DEFAULT 'subscription',
    `external_payment_ref` VARCHAR(255) NULL,
    `external_payment_date` DATETIME(3) NULL,
    `external_payment_expiry` DATETIME(3) NULL,
    `logo_url` TEXT NULL,
    `cover_image` TEXT NULL,
    `secondary_color` VARCHAR(20) NULL DEFAULT '#06b6d4',
    `show_on_home` BOOLEAN NULL DEFAULT true,
    `city` VARCHAR(100) NULL,
    `rating` DECIMAL(3, 2) NULL DEFAULT 0,

    UNIQUE INDEX `tenants_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NULL,
    `client_name` VARCHAR(255) NULL,
    `client_phone` VARCHAR(50) NULL,
    `ticket_number` INTEGER NOT NULL,
    `assigned_employee_id` CHAR(36) NULL,
    `service_type` VARCHAR(100) NULL,
    `status` VARCHAR(50) NULL DEFAULT 'waiting',
    `called_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date` DATE NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` TEXT NULL,
    `estimated_duration` INTEGER NULL,
    `client_sector` TEXT NULL,
    `service_id` CHAR(36) NULL,
    `client_email` TEXT NULL,
    `service_price` DECIMAL(12, 2) NULL DEFAULT 0,
    `archived` BOOLEAN NULL DEFAULT false,
    `archived_at` DATETIME(3) NULL,
    `transaction_id` CHAR(36) NULL,
    `payment_status` TEXT NULL DEFAULT 'pending',

    INDEX `idx_tickets_date`(`date`),
    INDEX `idx_tickets_number`(`tenant_id`, `ticket_number`),
    INDEX `idx_tickets_service_id`(`service_id`),
    INDEX `idx_tickets_service_price`(`service_price`),
    INDEX `idx_tickets_status`(`status`),
    INDEX `idx_tickets_tenant_date`(`tenant_id`, `date`),
    INDEX `idx_tickets_tenant_status`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_lines` (
    `id` CHAR(36) NOT NULL,
    `transaction_id` CHAR(36) NULL,
    `product_id` CHAR(36) NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` INTEGER NOT NULL,
    `total_price` INTEGER NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `appointment_id` CHAR(36) NULL,
    `client_id` CHAR(36) NULL,
    `cashier_id` CHAR(36) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` VARCHAR(50) NULL,
    `transaction_date` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receipt_number` VARCHAR(100) NULL,
    `status` VARCHAR(50) NULL DEFAULT 'completed',
    `employee_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `transaction_type` TEXT NULL DEFAULT 'appointment',
    `customer_name` TEXT NULL,
    `customer_phone` TEXT NULL,
    `source` TEXT NULL DEFAULT 'gallery_order',
    `notes` TEXT NULL,
    `customer_id` CHAR(36) NULL,
    `description` TEXT NULL,
    `gift_card_id` CHAR(36) NULL,
    `ticket_id` CHAR(36) NULL,
    `discount_amount` DECIMAL(10, 2) NULL DEFAULT 0,
    `total_after_discount` DECIMAL(10, 2) NULL DEFAULT 0,
    `discount_code` VARCHAR(50) NULL,
    `promos_applied` JSON NULL,

    INDEX `idx_transactions_customer_name`(`customer_name`(191)),
    INDEX `idx_transactions_customer_phone`(`customer_phone`(191)),
    INDEX `idx_transactions_source`(`source`(191)),
    INDEX `idx_transactions_status`(`status`),
    INDEX `idx_transactions_tenant_date`(`tenant_id`, `transaction_date`),
    UNIQUE INDEX `transactions_receipt_number_key`(`receipt_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_tenants` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `tenant_id` CHAR(36) NULL,
    `role` TEXT NULL DEFAULT 'admin',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_tenants_tenant_id`(`tenant_id`),
    INDEX `idx_user_tenants_user_id`(`user_id`),
    UNIQUE INDEX `user_tenants_user_id_tenant_id_key`(`user_id`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `email` TEXT NULL,
    `role` TEXT NULL DEFAULT 'user',
    `first_name` TEXT NULL,
    `last_name` TEXT NULL,
    `phone` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_users_email`(`email`(191)),
    INDEX `idx_users_role`(`role`(191)),
    INDEX `idx_users_tenant_id`(`tenant_id`),
    PRIMARY KEY (`id`, `tenant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(36) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` TEXT NULL,
    `user_agent` TEXT NULL,
    `user_id` CHAR(36) NOT NULL,

    UNIQUE INDEX `session_token_key`(`token`),
    INDEX `session_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account` (
    `id` VARCHAR(36) NOT NULL,
    `account_id` TEXT NOT NULL,
    `provider_id` TEXT NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `access_token` TEXT NULL,
    `refresh_token` TEXT NULL,
    `id_token` TEXT NULL,
    `access_token_expires_at` DATETIME(3) NULL,
    `refresh_token_expires_at` DATETIME(3) NULL,
    `scope` TEXT NULL,
    `password` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `account_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification` (
    `id` VARCHAR(36) NOT NULL,
    `identifier` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `verification_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_sequences` ADD CONSTRAINT `booking_sequences_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_subscriptions` ADD CONSTRAINT `client_subscriptions_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_subscriptions` ADD CONSTRAINT `client_subscriptions_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_subscriptions` ADD CONSTRAINT `client_subscriptions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_messages` ADD CONSTRAINT `contact_messages_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_absences` ADD CONSTRAINT `employee_absences_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_availability` ADD CONSTRAINT `employee_availability_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_schedules` ADD CONSTRAINT `employee_schedules_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery` ADD CONSTRAINT `gallery_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gift_card_orders` ADD CONSTRAINT `gift_card_orders_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gift_cards` ADD CONSTRAINT `gift_cards_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `home_visits` ADD CONSTRAINT `home_visits_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyalty_settings` ADD CONSTRAINT `loyalty_settings_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketing_campaigns` ADD CONSTRAINT `marketing_campaigns_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medical_notes` ADD CONSTRAINT `medical_notes_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medical_notes` ADD CONSTRAINT `medical_notes_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `news` ADD CONSTRAINT `news_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packages` ADD CONSTRAINT `packages_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publications` ADD CONSTRAINT `publications_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_products` ADD CONSTRAINT `service_products_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_products` ADD CONSTRAINT `service_products_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_zones` ADD CONSTRAINT `service_zones_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sms_templates` ADD CONSTRAINT `sms_templates_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_validated_by_fkey` FOREIGN KEY (`validated_by`) REFERENCES `profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_home_settings` ADD CONSTRAINT `tenant_home_settings_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_settings` ADD CONSTRAINT `tenant_settings_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_specialties` ADD CONSTRAINT `tenant_specialties_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `specialty_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_specialties` ADD CONSTRAINT `tenant_specialties_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assigned_employee_id_fkey` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_lines` ADD CONSTRAINT `transaction_lines_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_lines` ADD CONSTRAINT `transaction_lines_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_cashier_id_fkey` FOREIGN KEY (`cashier_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_gift_card_id_fkey` FOREIGN KEY (`gift_card_id`) REFERENCES `gift_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_tenants` ADD CONSTRAINT `user_tenants_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

