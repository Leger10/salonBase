const mysql = require('mysql2/promise');
const DB = 'SalonBase';
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', database: DB });
  const [[{ t }]] = await c.query('SELECT COUNT(*) t FROM information_schema.tables WHERE table_schema=? AND table_type="BASE TABLE"', [DB]);
  const [[{ f }]] = await c.query('SELECT COUNT(*) f FROM information_schema.referential_constraints WHERE constraint_schema=?', [DB]);
  console.log(`SalonBase: ${t} tables, ${f} FK`);

  const [mig] = await c.query('SELECT migration_name, finished_at IS NOT NULL AS ok, rolled_back_at FROM _prisma_migrations');
  console.log('migrations:', JSON.stringify(mig));

  const list = await c.query('SELECT table_name FROM information_schema.tables WHERE table_schema=? AND table_type="BASE TABLE" ORDER BY table_name', [DB]);
  let rows = 0;
  const dirty = [];
  for (const { table_name } of list[0]) {
    const [[{ n }]] = await c.query(`SELECT COUNT(*) n FROM \`${DB}\`.\`${table_name}\``);
    rows += n;
    if (n > 0) dirty.push(`${table_name}=${n}`);
  }
  console.log(`total rows: ${rows}`, dirty.length ? `(${dirty.join(', ')})` : '(base vide)');

  const [idx] = await c.query("SELECT COUNT(DISTINCT index_name, table_name) n FROM information_schema.statistics WHERE table_schema=?", [DB]);
  console.log('index distincts:', idx[0].n);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });