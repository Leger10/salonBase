-- Influenceurs et partenariat.
--
-- Un influenceur est rattache (manuellement, par le super_admin) a des salons.
-- Chaque abonnement valide de ces salons lui verse une commission (20 % par
-- defaut). Il peut demander un retrait de son solde ; le super_admin approuve,
-- marque comme paye ou refuse la demande.

-- CreateTable
CREATE TABLE `influencers` (
    `id` CHAR(36) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `referral_code` VARCHAR(50) NULL,
    `commission_rate` DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `user_id` CHAR(36) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `influencers_email_key`(`email`),
    UNIQUE INDEX `influencers_referral_code_key`(`referral_code`),
    UNIQUE INDEX `influencers_user_id_key`(`user_id`),
    INDEX `idx_influencers_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `influencer_withdrawals` (
    `id` CHAR(36) NOT NULL,
    `influencer_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `fee_rate` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
    `fee_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `method` VARCHAR(50) NULL,
    `account_details` TEXT NULL,
    `note` TEXT NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `processed_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_influencer_withdrawals_influencer`(`influencer_id`),
    INDEX `idx_influencer_withdrawals_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `referred_by_influencer_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_tenants_referred_by_influencer` ON `tenants`(`referred_by_influencer_id`);

-- AddForeignKey
ALTER TABLE `influencer_withdrawals` ADD CONSTRAINT `influencer_withdrawals_influencer_id_fkey` FOREIGN KEY (`influencer_id`) REFERENCES `influencers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_referred_by_influencer_id_fkey` FOREIGN KEY (`referred_by_influencer_id`) REFERENCES `influencers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
