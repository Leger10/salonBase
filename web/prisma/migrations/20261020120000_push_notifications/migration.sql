-- Notifications push (FCM) : appareils, outbox transactionnelle, rappels, verrou
-- de worker. Migration versionnee, reproductible et compatible avec les donnees
-- existantes (aucune table pre-existante n'est modifiee).
--
-- Moteur : MySQL / MariaDB (provider Prisma "mysql"). Les CHECK ne sont pas
-- appliques par MariaDB 10.4 : les etats sont donc valides cote API.

-- CreateTable
CREATE TABLE `push_devices` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `platform` VARCHAR(20) NOT NULL DEFAULT 'web',
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `push_devices_token_key`(`token`),
    INDEX `idx_push_devices_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_outbox` (
    `id` CHAR(36) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `event_key` VARCHAR(191) NULL,
    `tenant_id` CHAR(36) NULL,
    `target_user_id` CHAR(36) NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_id` CHAR(36) NULL,
    `title` TEXT NOT NULL,
    `body` TEXT NOT NULL,
    `url` TEXT NULL DEFAULT '/',
    `data` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `scheduled_at` DATETIME(3) NULL,
    `locked_at` DATETIME(3) NULL,
    `processed_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_push_outbox_event_key`(`event_key`),
    INDEX `idx_push_outbox_status_scheduled`(`status`, `scheduled_at`),
    INDEX `idx_push_outbox_status_locked`(`status`, `locked_at`),
    INDEX `idx_push_outbox_tenant`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_reminders` (
    `id` CHAR(36) NOT NULL,
    `appointment_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NULL,
    `kind` VARCHAR(40) NOT NULL DEFAULT 'appointment_reminder',
    `scheduled_at` DATETIME(3) NOT NULL,
    `title` TEXT NOT NULL,
    `body` TEXT NOT NULL,
    `url` TEXT NOT NULL DEFAULT '/rendez-vous',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `locked_at` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `sent_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_push_reminders_slot`(`appointment_id`, `user_id`, `scheduled_at`),
    INDEX `idx_push_reminders_pending`(`status`, `scheduled_at`),
    INDEX `idx_push_reminders_appointment`(`appointment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_jobs` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `locked_until` DATETIME(3) NULL,
    `locked_by` VARCHAR(100) NULL,
    `last_run_at` DATETIME(3) NULL,
    `last_result` TEXT NULL,
    `run_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `push_jobs_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `push_devices` ADD CONSTRAINT `push_devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `push_reminders` ADD CONSTRAINT `push_reminders_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `push_reminders` ADD CONSTRAINT `push_reminders_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
