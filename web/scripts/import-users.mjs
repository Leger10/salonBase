// Import des tenants + profils Supabase vers MariaDB, et creation des comptes
// Better Auth avec le mot de passe par defaut `00000000`.
// Usage : node scripts/import-users.mjs [repertoire-des-ndjson]
// Attendu : tenants.ndjson, profiles.ndjson, authusers.ndjson (export psql row_to_json)
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { hashPassword } from "better-auth/crypto";

const SRC = process.argv[2] ?? "C:/WINDOWS/TEMP/opencode";
const DEFAULT_PASSWORD = "00000000";
const DEFAULT_LIMIT = 20;

const cfg = () => {
  const url = new URL(process.env.DATABASE_URL ?? "mysql://root:@127.0.0.1:3306/SalonBase");
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
};

const readNdjson = (name) => {
  const p = path.join(SRC, name);
  return fs
    .readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
};

// --- conversions PostgreSQL -> MySQL -------------------------------
const toMysqlDateTime = (iso) => {
  // 2026-06-16T14:15:25.243646+00:00 -> 2026-06-16 14:15:25.243
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})$/.exec(iso);
  if (!m) return iso;
  let [, date, time, frac, zone] = m;
  if (zone !== "Z") {
    const sign = zone[0] === "-" ? 1 : -1;
    const [hh, mm] = zone.slice(1).replace(":", "").match(/\d{2}/g).map(Number);
    const d = new Date(`${date}T${time}Z`);
    d.setUTCMinutes(d.getUTCMinutes() + sign * (hh * 60 + mm));
    const p = (n, l = 2) => String(n).padStart(l, "0");
    date = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
    time = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
  }
  return `${date} ${time}.${(frac ?? "0").slice(0, 3).padEnd(3, "0")}`;
};

const convert = (col, v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) return toMysqlDateTime(v);
  if (typeof v === "object") return JSON.stringify(v);
  return v;
};

async function insertRows(conn, table, rows, extra = {}) {
  if (rows.length === 0) return 0;
  const cols = Object.keys(rows[0]);
  const allCols = [...cols, ...Object.keys(extra)];
  const placeholders = `(${allCols.map(() => "?").join(",")})`;
  const values = rows.flatMap((r) => [...cols.map((c) => convert(c, r[c])), ...Object.keys(extra).map((k) => extra[k])]);
  const sql = `INSERT INTO \`${table}\` (${allCols.map((c) => `\`${c}\``).join(",")}) VALUES ${rows
    .map(() => placeholders)
    .join(",")}`;
  const [res] = await conn.query(sql, values);
  return res.affectedRows;
}

let failures = 0;
const check = (label, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` :: ${extra}` : ""}`);
  if (!cond) failures++;
};

async function main() {
  const conn = await mysql.createConnection({ ...cfg(), multipleStatements: false });
  const tenants = readNdjson("tenants.ndjson");
  const profiles = readNdjson("profiles.ndjson");
  const authUsers = readNdjson("authusers.ndjson");
  console.log(`source : ${tenants.length} tenants, ${profiles.length} profils, ${authUsers.length} auth.users`);

  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of ["account", "session", "verification", "profiles", "tenants"]) await conn.query(`DELETE FROM \`${t}\``);
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");

  console.log("\n--- import ---");
  check("6 tenants inseres", (await insertRows(conn, "tenants", tenants)) === tenants.length);

  const authById = new Map(authUsers.map((u) => [u.id, u]));
  let inserted = 0;
  for (const p of profiles) {
    const auth = authById.get(p.id);
    const ok = await insertRows(conn, "profiles", [p], {
      email_verified: auth?.email_confirmed_at ? 1 : 0,
      must_change_password: 1,
    });
    inserted += ok;
  }
  check(`${profiles.length} profils inseres`, inserted === profiles.length, `inseres=${inserted}`);

  console.log("\n--- mots de passe par defaut ---");
  const hash = await hashPassword(DEFAULT_PASSWORD);
  let accounts = 0;
  for (const p of profiles) {
    await conn.query(
      "INSERT INTO `account` (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES (UUID(), ?, 'credential', ?, ?, NOW(3), NOW(3))",
      [p.id, p.id, hash]
    );
    accounts++;
  }
  check(`${accounts} comptes credential crees`, accounts === profiles.length);
  const [[{ n }]] = await conn.query("SELECT COUNT(*) n FROM `account` WHERE provider_id = 'credential' AND password = ?", [hash]);
  check("tous les comptes partagent le hash du mot de passe par defaut", n === profiles.length, `n=${n}`);

  const [[{ mcp }]] = await conn.query("SELECT COUNT(*) mcp FROM profiles WHERE must_change_password = 1");
  check("must_change_password = 1 pour tous", mcp === profiles.length, `n=${mcp}`);
  const [[{ verified }]] = await conn.query("SELECT COUNT(*) verified FROM profiles WHERE email_verified = 1");
  check("email_verified reporte depuis Supabase", verified > 0 && verified <= profiles.length, `confirmes=${verified}/${profiles.length}`);

  await conn.end();
  console.log(`\n${failures === 0 ? "IMPORT OK" : `${failures} ECHEC(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERREUR", e.message);
  process.exit(1);
});