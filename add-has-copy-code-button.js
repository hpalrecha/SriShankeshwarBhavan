// One-off migration: add whatsapp_templates.has_copy_code_button.
//
// `npm run db:push` cannot run inside the production image - drizzle-kit is a
// devDependency and the schema source is not shipped in it - and this column is
// the only pending schema change, so apply it directly instead.
//
// Run:  sudo docker cp add-has-copy-code-button.js ssbb:/app/
//       sudo docker exec ssbb node /app/add-has-copy-code-button.js
//
// Idempotent: safe to run twice, and safe to leave in place once db:push
// catches up, since ADD COLUMN IF NOT EXISTS becomes a no-op.
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run this inside the app container.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  // DEFAULT true backfills every existing row, which is what we want: the
  // previous code always sent the Copy-code button, so true reproduces the
  // behaviour these mappings were configured under. Change it per-mapping in
  // the admin panel once you know the shape of the template Meta approved.
  await client.query(
    `ALTER TABLE whatsapp_templates
       ADD COLUMN IF NOT EXISTS has_copy_code_button boolean DEFAULT true`
  );
  // Belt and braces for a column added earlier without the default.
  await client.query(
    `UPDATE whatsapp_templates SET has_copy_code_button = true
      WHERE has_copy_code_button IS NULL`
  );

  const { rows } = await client.query(
    `SELECT notification_type, template_name, is_active, has_copy_code_button
       FROM whatsapp_templates ORDER BY notification_type`
  );
  console.log('\nColumn added. Current mappings:\n');
  for (const r of rows) {
    console.log(
      `  ${r.is_active ? '[active]  ' : '[inactive]'} ${String(r.notification_type).padEnd(24)}` +
      ` -> ${String(r.template_name).padEnd(24)} copyCodeButton=${r.has_copy_code_button}`
    );
  }
  console.log('\nWhatsApp sends are no longer blocked by the missing column.');
} finally {
  client.release();
  await pool.end();
}
