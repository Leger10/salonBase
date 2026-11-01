// Mise a niveau automatique du schema MySQL au demarrage.
//
// Pourquoi ce module existe : en production, la base a ete creee/importee
// (donnees Supabase) mais les migrations Prisma recentes ne sont pas jouees
// par l'hebergeur. Consequences observees :
//   - `/api/public/tenants` et `/api/me` -> 500 car `tenants.parent_tenant_id`
//     n'existe pas (migration 20261030120000_tenant_branches) ;
//   - connexion d'un utilisateur existant -> 500 car les tables/colonnes
//     Better Auth (`account`, `session`, `verification`) sont absentes ou
//     incompletes (base importee avant le branchement de l'auth).
//
// Le bootstrap est idempotent et uniquement additif : il ne supprime ni table
// ni colonne. Il tourne au demarrage et avant chaque requete /api/auth/*.
//
// Variables d'environnement :
//   AUTH_DEFAULT_PASSWORD=00000000   mot de passe des comptes crees/repares
//   AUTH_AUTO_PROVISION=false        desactive la creation automatique des comptes
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import { prisma } from './prisma.js';

const DEFAULT_PASSWORD = process.env.AUTH_DEFAULT_PASSWORD ?? '00000000';
const AUTO_PROVISION = process.env.AUTH_AUTO_PROVISION !== 'false';

// Format des hash Better Auth : "<sel hex>:<hash hex>" (scrypt).
const PASSWORD_HASH_RE = /^[0-9a-f]+:[0-9a-f]+$/i;

const CREATE_TABLES = {
  // --- Better Auth -------------------------------------------------------
  session: `CREATE TABLE IF NOT EXISTS \`session\` (
    \`id\` VARCHAR(36) NOT NULL,
    \`expires_at\` DATETIME(3) NOT NULL,
    \`token\` VARCHAR(255) NOT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`ip_address\` TEXT NULL,
    \`user_agent\` TEXT NULL,
    \`user_id\` CHAR(36) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`session_token_key\`(\`token\`),
    INDEX \`session_user_id_idx\`(\`user_id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  account: `CREATE TABLE IF NOT EXISTS \`account\` (
    \`id\` VARCHAR(36) NOT NULL,
    \`account_id\` TEXT NOT NULL,
    \`provider_id\` TEXT NOT NULL,
    \`user_id\` CHAR(36) NOT NULL,
    \`access_token\` TEXT NULL,
    \`refresh_token\` TEXT NULL,
    \`id_token\` TEXT NULL,
    \`access_token_expires_at\` DATETIME(3) NULL,
    \`refresh_token_expires_at\` DATETIME(3) NULL,
    \`scope\` TEXT NULL,
    \`password\` TEXT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX \`account_user_id_idx\`(\`user_id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  verification: `CREATE TABLE IF NOT EXISTS \`verification\` (
    \`id\` VARCHAR(36) NOT NULL,
    \`identifier\` VARCHAR(255) NOT NULL,
    \`value\` TEXT NOT NULL,
    \`expires_at\` DATETIME(3) NOT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX \`verification_identifier_idx\`(\`identifier\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // --- Abonnements (absents de la base de production importee) -----------
  subscription_plans: `CREATE TABLE IF NOT EXISTS \`subscription_plans\` (
    \`id\` CHAR(36) NOT NULL,
    \`name\` VARCHAR(100) NOT NULL,
    \`description\` TEXT NULL,
    \`price\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    \`currency\` VARCHAR(10) NULL DEFAULT 'FCFA',
    \`duration_months\` INTEGER NOT NULL DEFAULT 1,
    \`max_employees\` INTEGER NULL DEFAULT 5,
    \`max_services\` INTEGER NULL DEFAULT 20,
    \`max_products\` INTEGER NULL DEFAULT 50,
    \`features\` JSON NULL,
    \`is_active\` BOOLEAN NULL DEFAULT true,
    \`created_at\` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX \`idx_subscription_plans_is_active\`(\`is_active\`),
    INDEX \`idx_subscription_plans_name\`(\`name\`),
    INDEX \`idx_subscription_plans_price\`(\`price\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  subscriptions: `CREATE TABLE IF NOT EXISTS \`subscriptions\` (
    \`id\` CHAR(36) NOT NULL,
    \`tenant_id\` CHAR(36) NOT NULL,
    \`plan\` VARCHAR(50) NOT NULL,
    \`duration\` VARCHAR(20) NOT NULL,
    \`amount\` DECIMAL(10, 2) NOT NULL,
    \`payment_method\` VARCHAR(50) NULL,
    \`payment_reference\` VARCHAR(255) NULL,
    \`start_date\` DATE NOT NULL,
    \`end_date\` DATE NOT NULL,
    \`status\` VARCHAR(50) NULL DEFAULT 'pending',
    \`created_at\` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`validated_by\` CHAR(36) NULL,
    \`auto_renew\` BOOLEAN NULL DEFAULT false,
    \`max_employees\` INTEGER NULL DEFAULT 5,
    \`max_services\` INTEGER NULL DEFAULT 20,
    \`max_products\` INTEGER NULL DEFAULT 50,
    \`features\` JSON NULL,
    \`updated_at\` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`validated_at\` DATETIME(3) NULL,
    \`rejected_at\` DATETIME(3) NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`idx_subscriptions_status\`(\`status\`),
    INDEX \`idx_subscriptions_tenant_id\`(\`tenant_id\`),
    INDEX \`idx_subscriptions_validated_at\`(\`validated_at\`),
    INDEX \`idx_subscriptions_validated_by\`(\`validated_by\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // --- Notifications push (migration 20261020120000) ---------------------
  push_devices: `CREATE TABLE IF NOT EXISTS \`push_devices\` (
    \`id\` CHAR(36) NOT NULL,
    \`user_id\` CHAR(36) NOT NULL,
    \`token\` VARCHAR(255) NOT NULL,
    \`platform\` VARCHAR(20) NOT NULL DEFAULT 'web',
    \`user_agent\` TEXT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`last_seen_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`push_devices_token_key\`(\`token\`),
    INDEX \`idx_push_devices_user\`(\`user_id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  push_outbox: `CREATE TABLE IF NOT EXISTS \`push_outbox\` (
    \`id\` CHAR(36) NOT NULL,
    \`type\` VARCHAR(50) NOT NULL,
    \`event_key\` VARCHAR(191) NULL,
    \`tenant_id\` CHAR(36) NULL,
    \`target_user_id\` CHAR(36) NULL,
    \`entity_type\` VARCHAR(50) NULL,
    \`entity_id\` CHAR(36) NULL,
    \`title\` TEXT NOT NULL,
    \`body\` TEXT NOT NULL,
    \`url\` TEXT NULL DEFAULT '/',
    \`data\` JSON NULL,
    \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
    \`attempts\` INTEGER NOT NULL DEFAULT 0,
    \`last_error\` TEXT NULL,
    \`scheduled_at\` DATETIME(3) NULL,
    \`locked_at\` DATETIME(3) NULL,
    \`processed_at\` DATETIME(3) NULL,
    \`sent_at\` DATETIME(3) NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`uq_push_outbox_event_key\`(\`event_key\`),
    INDEX \`idx_push_outbox_status_scheduled\`(\`status\`, \`scheduled_at\`),
    INDEX \`idx_push_outbox_status_locked\`(\`status\`, \`locked_at\`),
    INDEX \`idx_push_outbox_tenant\`(\`tenant_id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  push_reminders: `CREATE TABLE IF NOT EXISTS \`push_reminders\` (
    \`id\` CHAR(36) NOT NULL,
    \`appointment_id\` CHAR(36) NOT NULL,
    \`user_id\` CHAR(36) NOT NULL,
    \`tenant_id\` CHAR(36) NULL,
    \`kind\` VARCHAR(40) NOT NULL DEFAULT 'appointment_reminder',
    \`scheduled_at\` DATETIME(3) NOT NULL,
    \`title\` TEXT NOT NULL,
    \`body\` TEXT NOT NULL,
    \`url\` TEXT NOT NULL DEFAULT '/rendez-vous',
    \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
    \`locked_at\` DATETIME(3) NULL,
    \`attempts\` INTEGER NOT NULL DEFAULT 0,
    \`last_error\` TEXT NULL,
    \`sent_at\` DATETIME(3) NULL,
    \`cancelled_at\` DATETIME(3) NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`uq_push_reminders_slot\`(\`appointment_id\`, \`user_id\`, \`scheduled_at\`),
    INDEX \`idx_push_reminders_pending\`(\`status\`, \`scheduled_at\`),
    INDEX \`idx_push_reminders_appointment\`(\`appointment_id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  push_jobs: `CREATE TABLE IF NOT EXISTS \`push_jobs\` (
    \`id\` CHAR(36) NOT NULL,
    \`name\` VARCHAR(50) NOT NULL,
    \`locked_until\` DATETIME(3) NULL,
    \`locked_by\` VARCHAR(100) NULL,
    \`last_run_at\` DATETIME(3) NULL,
    \`last_result\` TEXT NULL,
    \`run_count\` INTEGER NOT NULL DEFAULT 0,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`push_jobs_name_key\`(\`name\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
};

// Colonnes attendues par Prisma/Better Auth, au cas ou la table existe deja
// dans une version plus ancienne (import partiel, ancienne version du schema).
const COLUMNS = {
  profiles: {
    email_verified: 'BOOLEAN NOT NULL DEFAULT FALSE',
    must_change_password: 'BOOLEAN NOT NULL DEFAULT TRUE',
  },
  employees: {
    archived_at: 'DATETIME(3) NULL',
  },
  tenants: {
    parent_tenant_id: 'CHAR(36) NULL',
  },
  session: {
    // Colonnes ajoutees a une table existante : nullables pour que l'ALTER
    // passe meme si la table contient deja des lignes. Better Auth fournit
    // toujours ces valeurs a l'ecriture.
    expires_at: 'DATETIME(3) NULL',
    token: 'VARCHAR(255) NULL',
    created_at: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
    updated_at: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
    ip_address: 'TEXT NULL',
    user_agent: 'TEXT NULL',
    user_id: 'CHAR(36) NULL',
  },
  account: {
    account_id: 'TEXT NULL',
    provider_id: 'TEXT NULL',
    user_id: 'CHAR(36) NULL',
    access_token: 'TEXT NULL',
    refresh_token: 'TEXT NULL',
    id_token: 'TEXT NULL',
    access_token_expires_at: 'DATETIME(3) NULL',
    refresh_token_expires_at: 'DATETIME(3) NULL',
    scope: 'TEXT NULL',
    password: 'TEXT NULL',
    created_at: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
    updated_at: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
  },
  verification: {
    identifier: 'VARCHAR(255) NULL',
    value: 'TEXT NULL',
    expires_at: 'DATETIME(3) NULL',
    created_at: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
    updated_at: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
  },
};

const INDEXES = {
  session: [
    { name: 'session_token_key', columns: '`token`', unique: true },
    { name: 'session_user_id_idx', columns: '`user_id`', unique: false },
  ],
  account: [{ name: 'account_user_id_idx', columns: '`user_id`', unique: false }],
  verification: [{ name: 'verification_identifier_idx', columns: '`identifier`', unique: false }],
  tenants: [{ name: 'idx_tenants_parent_tenant_id', columns: '`parent_tenant_id`', unique: false }],
};

const firstValue = (row) => (row ? Object.values(row)[0] : undefined);

// --- Schema de reference (migrations Prisma) -------------------------------
//
// La base de production a ete importee partiellement : certaines tables du
// schema n'existent pas (platform_settings, activity_logs, ...), ce qui fait
// echouer toutes les pages qui les lisent. Plutot que de maintenir une seconde
// liste de DDL a la main, on relit les migrations versionnees et on rejoue
// uniquement les CREATE TABLE des tables absentes, puis on complete les
// colonnes/index manquants. Tout est idempotent et strictement additif.
const EXPECTED_TABLES = new Set(
  Prisma.dmmf.datamodel.models.map((model) => String(model.dbName ?? model.name).toLowerCase())
);

let migrationSchemaCache = null;

/**
 * Repertoire des migrations. En production le processus tourne depuis web/,
 * mais on couvre aussi le cas ou le depot entier est deploye.
 */
function migrationsDirectory() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.SCHEMA_MIGRATIONS_DIR,
    resolve(here, '../prisma/migrations'),
    resolve(process.cwd(), 'prisma/migrations'),
    resolve(process.cwd(), 'web/prisma/migrations'),
  ].filter(Boolean);
  return candidates.find((dir) => existsSync(dir)) ?? null;
}

/** Extrait les CREATE TABLE / index / cles etrangeres des fichiers .sql. */
function loadMigrationSchema() {
  if (migrationSchemaCache) return migrationSchemaCache;

  const schema = { tables: new Map(), foreignKeys: [], directory: null };
  const directory = migrationsDirectory();
  schema.directory = directory;
  if (!directory) {
    migrationSchemaCache = schema;
    return schema;
  }

  const files = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const seenTables = new Set();

  for (const name of files) {
    const file = resolve(directory, name, 'migration.sql');
    if (!existsSync(file)) continue;
    const sql = readFileSync(file, 'utf8');

    // Bloc complet CREATE TABLE ... DEFAULT CHARACTER SET ...;
    const createRe = /CREATE TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\n\)\s*DEFAULT CHARACTER SET[^;]*;/g;
    for (const match of sql.matchAll(createRe)) {
      const table = match[1].toLowerCase();
      if (seenTables.has(table)) continue;
      seenTables.add(table);

      const columns = new Map();
      const indexes = [];
      for (const rawLine of match[2].split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('--')) continue;

        const column = /^`([^`]+)`\s+(.+)$/.exec(line);
        if (column) {
          columns.set(column[1].toLowerCase(), column[2].replace(/,\s*$/, ''));
          continue;
        }
        const index = /^(UNIQUE\s+)?INDEX\s+`([^`]+)`\s*\((.+)\)\s*,?$/i.exec(line);
        if (index) {
          indexes.push({
            name: index[2],
            unique: Boolean(index[1]),
            columns: index[3],
          });
        }
      }

      schema.tables.set(table, {
        sql: match[0].replace(/^CREATE TABLE /, 'CREATE TABLE IF NOT EXISTS '),
        columns,
        indexes,
      });
    }

    const fkRe = /ALTER TABLE\s+`([^`]+)`\s+ADD CONSTRAINT\s+`([^`]+)`\s+FOREIGN KEY[\s\S]*?;/g;
    for (const match of sql.matchAll(fkRe)) {
      schema.foreignKeys.push({ table: match[1].toLowerCase(), name: match[2], sql: match[0] });
    }
  }

  migrationSchemaCache = schema;
  return schema;
}

async function existingTables() {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
  );
  return new Set(rows.map((row) => String(firstValue(row)).toLowerCase()));
}

async function allColumns() {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()'
  );
  const map = new Map();
  for (const row of rows) {
    const table = String(row.TABLE_NAME ?? Object.values(row)[0]).toLowerCase();
    const column = String(row.COLUMN_NAME ?? Object.values(row)[1]).toLowerCase();
    if (!map.has(table)) map.set(table, new Set());
    map.get(table).add(column);
  }
  return map;
}

async function allForeignKeys() {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT TABLE_NAME, CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY'"
  );
  return new Set(
    rows.map((row) => {
      const table = String(row.TABLE_NAME ?? Object.values(row)[0]).toLowerCase();
      const constraint = String(row.CONSTRAINT_NAME ?? Object.values(row)[1]).toLowerCase();
      return `${table}.${constraint}`;
    })
  );
}

/** Cree les tables du schema Prisma absentes (DDL des migrations). */
async function ensureMigrationTables(report) {
  const schema = loadMigrationSchema();
  const existing = await existingTables();
  for (const [table, definition] of schema.tables) {
    if (existing.has(table)) continue;
    try {
      await prisma.$executeRawUnsafe(definition.sql);
      report.createdTables.push(table);
      console.log(`[db] table \`${table}\` creee (migration)`);
    } catch (error) {
      console.error(`[db] impossible de creer la table \`${table}\` :`, error.message);
    }
  }
}

/**
 * Ajoute les colonnes manquantes des tables existantes. Une colonne NOT NULL
 * sans valeur par defaut est creee NULL : la table contient deja des lignes,
 * et Prisma fournit toujours une valeur a l'ecriture.
 */
async function ensureMigrationColumns(report) {
  const schema = loadMigrationSchema();
  const columnsByTable = await allColumns();
  for (const [table, definition] of schema.tables) {
    const existing = columnsByTable.get(table);
    if (!existing) continue;
    for (const [column, rawDefinition] of definition.columns) {
      if (existing.has(column)) continue;
      const requiresValue = /NOT NULL/i.test(rawDefinition);
      const hasDefault = /DEFAULT|AUTO_INCREMENT/i.test(rawDefinition);
      const safeDefinition = requiresValue && !hasDefault
        ? rawDefinition.replace(/NOT NULL/i, 'NULL')
        : rawDefinition;
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${safeDefinition}`
        );
        report.addedColumns.push(`${table}.${column}`);
        console.log(`[db] colonne \`${table}.${column}\` ajoutee (migration)`);
      } catch (error) {
        console.error(`[db] impossible d'ajouter \`${table}.${column}\` :`, error.message);
      }
    }
  }
}

/** Ajoute les index declares dans les migrations et absents en base. */
async function ensureMigrationIndexes(report) {
  const schema = loadMigrationSchema();
  const existingTablesSet = await existingTables();
  for (const [table, definition] of schema.tables) {
    if (!existingTablesSet.has(table) || definition.indexes.length === 0) continue;
    const existing = await indexNames(table);
    for (const index of definition.indexes) {
      if (existing.has(index.name.toLowerCase())) continue;
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE \`${table}\` ADD ${index.unique ? 'UNIQUE ' : ''}INDEX \`${index.name}\` (${index.columns})`
        );
        report.addedIndexes.push(`${table}.${index.name}`);
        console.log(`[db] index \`${table}.${index.name}\` ajoute (migration)`);
      } catch (error) {
        console.error(`[db] impossible d'ajouter l'index \`${table}.${index.name}\` :`, error.message);
      }
    }
  }
}

/** Rejoue les cles etrangeres manquantes (integrite et cascades). */
async function ensureMigrationForeignKeys(report) {
  const schema = loadMigrationSchema();
  if (schema.foreignKeys.length === 0) return;
  const existing = await allForeignKeys();
  for (const foreignKey of schema.foreignKeys) {
    if (existing.has(`${foreignKey.table}.${foreignKey.name.toLowerCase()}`)) continue;
    try {
      await prisma.$executeRawUnsafe(foreignKey.sql);
      report.addedConstraints.push(`${foreignKey.table}.${foreignKey.name}`);
    } catch (error) {
      // Donnees orphelines dans un import partiel : la contrainte n'est pas
      // indispensable au fonctionnement (Prisma joint explicitement), on
      // journalise sans bloquer le demarrage.
      console.warn(
        `[db] cle etrangere \`${foreignKey.table}.${foreignKey.name}\` non ajoutee :`,
        error.message
      );
    }
  }
}

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    table
  );
  return Number(firstValue(rows[0]) ?? 0) > 0;
}

async function columnNames(table) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    table
  );
  return new Set(rows.map((row) => String(firstValue(row)).toLowerCase()));
}

async function indexNames(table) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    table
  );
  return new Set(rows.map((row) => String(firstValue(row)).toLowerCase()));
}

async function rowCount(table) {
  if (!(await tableExists(table))) return null;
  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return Number(firstValue(rows[0]) ?? 0);
}

async function ensureTables(report) {
  for (const [table, sql] of Object.entries(CREATE_TABLES)) {
    if (await tableExists(table)) continue;
    try {
      await prisma.$executeRawUnsafe(sql);
      report.createdTables.push(table);
      console.log(`[db] table \`${table}\` creee`);
    } catch (error) {
      console.error(`[db] impossible de creer la table \`${table}\` :`, error.message);
    }
  }
}

async function ensureColumns(report) {
  for (const [table, columns] of Object.entries(COLUMNS)) {
    if (!(await tableExists(table))) continue;
    const existing = await columnNames(table);
    for (const [column, definition] of Object.entries(columns)) {
      if (existing.has(column.toLowerCase())) continue;
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
        );
        report.addedColumns.push(`${table}.${column}`);
        console.log(`[db] colonne \`${table}.${column}\` ajoutee`);
      } catch (error) {
        // Une colonne NOT NULL sans valeur par defaut peut echouer si la table
        // contient deja des lignes : on continue, les autres corrections
        // restent utiles.
        console.error(`[db] impossible d'ajouter \`${table}.${column}\` :`, error.message);
      }
    }
  }
}

async function ensureIndexes(report) {
  for (const [table, indexes] of Object.entries(INDEXES)) {
    if (!(await tableExists(table))) continue;
    const existing = await indexNames(table);
    for (const index of indexes) {
      if (existing.has(index.name.toLowerCase())) continue;
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE \`${table}\` ADD ${index.unique ? 'UNIQUE ' : ''}INDEX \`${index.name}\` (${index.columns})`
        );
        report.addedIndexes.push(`${table}.${index.name}`);
        console.log(`[db] index \`${table}.${index.name}\` ajoute`);
      } catch (error) {
        console.error(`[db] impossible d'ajouter l'index \`${table}.${index.name}\` :`, error.message);
      }
    }
  }
}

async function repairPasswordHashes(report) {
  if (!(await tableExists('account'))) return;

  // Better Auth exige `account_id = user_id` pour le provider "credential".
  // Certains imports mettent l'email : on normalise, sinon la connexion
  // renvoie "invalid email or password" alors que le compte existe.
  const normalized = await prisma.$executeRawUnsafe(
    "UPDATE account SET account_id = user_id WHERE provider_id = 'credential' AND (account_id IS NULL OR account_id <> user_id)"
  );
  if (normalized > 0) {
    report.normalizedAccountIds = normalized;
    console.log(`[db] ${normalized} identifiant(s) de compte normalise(s)`);
  }

  const accounts = await prisma.$queryRawUnsafe(
    "SELECT id, password FROM account WHERE provider_id = 'credential'"
  );
  const broken = accounts.filter(
    (account) => !account.password || !PASSWORD_HASH_RE.test(String(account.password))
  );
  if (broken.length === 0) return;

  // Un seul hash pour tous les comptes repares : meme comportement que
  // scripts/import-users.mjs.
  const hash = await hashPassword(DEFAULT_PASSWORD);
  for (const account of broken) {
    await prisma.$executeRawUnsafe(
      'UPDATE account SET password = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      hash,
      account.id
    );
  }
  report.repairedPasswords = broken.length;
  console.log(
    `[db] ${broken.length} mot(s) de passe incompatible(s) reinitialise(s) au mot de passe par defaut`
  );
}

async function provisionAccounts(report) {
  if (!AUTO_PROVISION || !(await tableExists('account'))) return;

  const missing = await prisma.$queryRawUnsafe(
    `SELECT p.id AS id
       FROM profiles p
       LEFT JOIN account a ON a.user_id = p.id AND a.provider_id = 'credential'
      WHERE a.id IS NULL`
  );
  if (missing.length === 0) return;

  const hash = await hashPassword(DEFAULT_PASSWORD);
  const ids = [];
  for (const row of missing) {
    const userId = row.id ?? row.ID;
    try {
      await prisma.$executeRawUnsafe(
        "INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES (?, ?, 'credential', ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))",
        randomUUID(),
        userId,
        userId,
        hash
      );
      ids.push(userId);
    } catch (error) {
      console.error(`[db] impossible de creer le compte de ${userId} :`, error.message);
    }
  }

  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await prisma.$executeRawUnsafe(
      `UPDATE profiles SET must_change_password = 1 WHERE id IN (${placeholders})`,
      ...ids
    );
    report.provisionedAccounts = ids.length;
    console.log(
      `[db] ${ids.length} compte(s) cree(s) avec le mot de passe par defaut (changement force a la connexion)`
    );
  }
}

/**
 * Etat du schema (utilise par /api/health).
 * Ne renvoie aucun secret : uniquement des noms de tables et des compteurs.
 */
export async function schemaStatus() {
  try {
    const tables = {};
    for (const table of [
      'profiles',
      'account',
      'session',
      'verification',
      'tenants',
      'employees',
      'push_devices',
      'push_outbox',
    ]) {
      tables[table] = await tableExists(table);
    }

    const counts = {};
    for (const table of ['profiles', 'account', 'session']) {
      if (tables[table]) counts[table] = await rowCount(table);
    }

    let credentialAccounts = null;
    let missingAccounts = null;
    let invalidPasswords = null;
    if (tables.account) {
      const [[credentials], [missing]] = await Promise.all([
        prisma.$queryRawUnsafe(
          "SELECT COUNT(*) AS n FROM account WHERE provider_id = 'credential'"
        ),
        prisma.$queryRawUnsafe(
          `SELECT COUNT(*) AS n FROM profiles p
             LEFT JOIN account a ON a.user_id = p.id AND a.provider_id = 'credential'
            WHERE a.id IS NULL`
        ),
      ]);
      credentialAccounts = Number(firstValue(credentials) ?? 0);
      missingAccounts = Number(firstValue(missing) ?? 0);

      const rows = await prisma.$queryRawUnsafe(
        "SELECT password FROM account WHERE provider_id = 'credential'"
      );
      invalidPasswords = rows.filter(
        (row) => !row.password || !PASSWORD_HASH_RE.test(String(row.password))
      ).length;
    }

    let tenantsParentColumn = null;
    if (tables.tenants) {
      tenantsParentColumn = (await columnNames('tenants')).has('parent_tenant_id');
    }
    let employeesArchiveColumn = null;
    if (tables.employees) {
      employeesArchiveColumn = (await columnNames('employees')).has('archived_at');
    }

    // Sondes de lecture : detectent les incompatibilites de type entre la base
    // importee et le client Prisma (colonnes absentes, types non convertibles).
    const probes = {};
    const probe = async (name, run) => {
      try {
        await run();
        probes[name] = { ok: true };
      } catch (error) {
        probes[name] = {
          ok: false,
          code: error?.code ?? null,
          message: String(error?.message ?? error).slice(0, 300),
        };
      }
    };
    await probe('tenant', () => prisma.tenant.findFirst({ where: { isActive: true } }));
    await probe('profile', () => prisma.profile.findFirst());
    await probe('subscription', () => prisma.subscription.findFirst());
    await probe('subscriptionPlan', () => prisma.subscriptionPlan.findFirst());
    await probe('employee', () => prisma.employee.findFirst());

    // Diagnostic complet : tables/colonnes du schema absentes en base.
    // Une seule requete par information_schema, quel que soit le nombre de
    // tables, pour ne pas ralentir /api/health.
    const schemaDefinition = loadMigrationSchema();
    const presentTables = await existingTables();
    const missingTables = [...EXPECTED_TABLES]
      .filter((table) => !presentTables.has(table))
      .sort();
    const columnsByTable = await allColumns();
    const missingColumns = [];
    for (const [table, definition] of schemaDefinition.tables) {
      const presentColumns = columnsByTable.get(table);
      if (!presentColumns) continue;
      for (const column of definition.columns.keys()) {
        if (!presentColumns.has(column)) missingColumns.push(`${table}.${column}`);
      }
    }

    return {
      probes,
      ok: Boolean(
        tables.profiles &&
          tables.account &&
          tables.session &&
          tenantsParentColumn !== false &&
          employeesArchiveColumn !== false &&
          missingTables.length === 0 &&
          missingColumns.length === 0
      ),
      tables,
      counts,
      credentialAccounts,
      missingAccounts,
      invalidPasswords,
      tenantsParentColumn,
      employeesArchiveColumn,
      migrationsAvailable: Boolean(schemaDefinition.directory),
      migrationTables: schemaDefinition.tables.size,
      missingTables,
      missingColumns: missingColumns.sort(),
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function run() {
  const report = {
    createdTables: [],
    addedColumns: [],
    addedIndexes: [],
    addedConstraints: [],
    provisionedAccounts: 0,
    repairedPasswords: 0,
    normalizedAccountIds: 0,
  };

  await ensureTables(report);
  await ensureMigrationTables(report);
  await ensureColumns(report);
  await ensureMigrationColumns(report);
  await ensureIndexes(report);
  await ensureMigrationIndexes(report);
  await ensureMigrationForeignKeys(report);
  await repairPasswordHashes(report);
  await provisionAccounts(report);

  const changed =
    report.createdTables.length +
    report.addedColumns.length +
    report.addedIndexes.length +
    report.addedConstraints.length +
    report.provisionedAccounts +
    report.repairedPasswords +
    report.normalizedAccountIds;

  if (changed === 0) {
    console.log('[db] schema deja a jour');
  } else {
    console.log(
      `[db] schema mis a niveau (tables: ${report.createdTables.length}, colonnes: ${report.addedColumns.length}, index: ${report.addedIndexes.length}, contraintes: ${report.addedConstraints.length}, comptes: ${report.provisionedAccounts}, mots de passe: ${report.repairedPasswords})`
    );
  }
  return report;
}

let bootstrapPromise = null;

/**
 * Lance (une seule fois) la mise a niveau du schema.
 * La promesse est reutilisee par toutes les requetes /api/auth/*.
 */
export function ensureSchemaReady() {
  if (!bootstrapPromise) {
    bootstrapPromise = run().catch((error) => {
      console.error('[db] echec de la mise a niveau du schema :', error);
      // Une base momentanement indisponible ne doit pas bloquer l'auth jusqu'au
      // prochain redemarrage : la prochaine requete retentera.
      bootstrapPromise = null;
      throw error;
    });
    // Evite un "unhandled rejection" si personne n'attend immediatement.
    bootstrapPromise.catch(() => {});
  }
  return bootstrapPromise;
}
