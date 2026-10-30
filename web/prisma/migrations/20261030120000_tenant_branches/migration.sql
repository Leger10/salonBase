ALTER TABLE `tenants`
  ADD COLUMN `parent_tenant_id` CHAR(36) NULL,
  ADD INDEX `idx_tenants_parent_tenant_id`(`parent_tenant_id`),
  ADD CONSTRAINT `tenants_parent_tenant_id_fkey`
    FOREIGN KEY (`parent_tenant_id`) REFERENCES `tenants`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
