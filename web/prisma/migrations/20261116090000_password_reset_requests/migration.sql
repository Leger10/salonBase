-- Demandes de reinitialisation de mot de passe.
--
-- Aucun service d'email n'est configure sur l'hebergement : la page
-- "Mot de passe oublie" depose donc une demande que le super administrateur
-- traite depuis son tableau de bord. A l'approbation, le mot de passe du
-- compte est remis a "00000000" et l'utilisateur doit le changer a la
-- prochaine connexion (profiles.must_change_password).

-- CreateTable
CREATE TABLE `password_reset_requests` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `profile_id` CHAR(36) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `note` TEXT NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `processed_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_password_reset_requests_status`(`status`),
    INDEX `idx_password_reset_requests_email`(`email`),
    INDEX `idx_password_reset_requests_requested_at`(`requested_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
