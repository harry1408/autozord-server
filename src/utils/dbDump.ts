import { prisma } from './prisma';

// Data-only SQL dump (INSERT statements), generated purely via Prisma's raw
// query interface - no dependency on the pg_dump binary, which isn't
// available in this deploy environment. Table list is discovered at
// runtime from pg_tables, so new models are picked up automatically
// without touching this file.
//
// Restore assumes the schema already exists (`prisma db push` against an
// empty database recreates it exactly) - this only carries the data.
// session_replication_role=replica disables FK/trigger checks for the
// duration of the restore, so insert order doesn't need to respect
// foreign-key dependencies (the same trick pg_dump itself uses for its
// data-only sections).

function escapeIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function escapeValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Buffer.isBuffer(value)) return `'\\x${value.toString('hex')}'`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

export async function generateDatabaseDumpSql(): Promise<{ sql: string; tableCount: number; rowCount: number }> {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );

  const parts: string[] = [
    `-- Autozord database dump (data only)`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Restore into a database with the schema already applied (prisma db push).`,
    ``,
    `SET session_replication_role = replica;`,
    ``,
  ];

  let rowCount = 0;

  for (const { tablename } of tables) {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${escapeIdent(tablename)}`
    );
    if (rows.length === 0) continue;

    parts.push(`-- Table: ${tablename} (${rows.length} rows)`);
    const columns = Object.keys(rows[0]);
    const columnList = columns.map(escapeIdent).join(', ');
    for (const row of rows) {
      const values = columns.map(col => escapeValue(row[col])).join(', ');
      parts.push(`INSERT INTO ${escapeIdent(tablename)} (${columnList}) VALUES (${values});`);
      rowCount++;
    }
    parts.push('');
  }

  parts.push(`SET session_replication_role = DEFAULT;`);

  return { sql: parts.join('\n'), tableCount: tables.length, rowCount };
}
