// Recree la base MySQL a partir des migrations Prisma.
// Refuse de detruire une base contenant des donnees (utiliser --force pourConfirmed).
// Usage : node scripts/db-reset.cjs [--force]
const mysql = require("mysql2/promise");

const DB = process.env.DB_NAME ?? "SalonBase";
const force = process.argv.includes("--force");

(async () => {
  const c = await mysql.createConnection({ host: "127.0.0.1", user: "root" });
  const [[{ tables }]] = await c.query(
    "SELECT COUNT(*) tables FROM information_schema.tables WHERE table_schema = ?",
    [DB]
  );
  let rows = 0;
  if (tables > 0) {
    const list = await c.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
      [DB]
    );
    for (const { table_name } of list[0]) {
      const [[{ n }]] = await c.query(`SELECT COUNT(*) n FROM \`${DB}\`.\`${table_name}\``);
      rows += n;
    }
  }
  console.log(`${DB}: ${tables} tables, ${rows} lignes`);

  // les tables de suivi Prisma sont recreees par migrate deploy
  if (rows > 0 && !force) {
    console.error(`ABORT: ${rows} lignes detectees. Utiliser --force pour detruire ${DB}.`);
    await c.end();
    process.exit(1);
  }

  await c.query(`DROP DATABASE IF EXISTS \`${DB}\``);
  await c.query(`CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`${DB} recreee (utf8mb4_unicode_ci)`);
  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});