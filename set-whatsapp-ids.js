// Set the WhatsApp phone number id and business account id directly.
//
// The admin panel does the same thing and applies it without a restart, but
// this is here for when the panel is not to hand. It writes only those two
// fields - the access token and enabled flag are left exactly as they are.
//
// Run:  sudo docker cp set-whatsapp-ids.js ssbb:/app/
//       sudo docker exec ssbb node /app/set-whatsapp-ids.js 633152823218797 681013564674244
//       sudo docker restart ssbb
//
// The restart matters: the running service holds its config in memory and only
// re-reads the database at startup (server/init-whatsapp.ts). Saving through
// the admin panel instead calls setConfig() and needs no restart.
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const [phoneNumberId, businessAccountId] = process.argv.slice(2);
if (!phoneNumberId || !businessAccountId) {
  console.error('Usage: node set-whatsapp-ids.js <phone_number_id> <business_account_id>');
  process.exit(1);
}
for (const [name, value] of [['phone_number_id', phoneNumberId], ['business_account_id', businessAccountId]]) {
  if (!/^\d{10,20}$/.test(value)) {
    console.error(`${name} "${value}" does not look like a Meta id (digits only).`);
    process.exit(1);
  }
  if (value.length <= 12) {
    console.error(`${name} "${value}" is only ${value.length} digits - Meta ids are 15-16.`);
    console.error('That looks like a phone number, which is the bug this is fixing.');
    process.exit(1);
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run this inside the app container.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  const before = await client.query(
    'SELECT id, phone_number_id, business_account_id, is_enabled FROM whatsapp_config ORDER BY id DESC LIMIT 1'
  );
  if (before.rows.length === 0) {
    console.error('No row in whatsapp_config to update.');
    process.exit(1);
  }
  const row = before.rows[0];
  console.log('before:');
  console.log(`  phone_number_id:     ${row.phone_number_id}`);
  console.log(`  business_account_id: ${row.business_account_id}`);

  await client.query(
    `UPDATE whatsapp_config
        SET phone_number_id = $1, business_account_id = $2, updated_at = now()
      WHERE id = $3`,
    [phoneNumberId, businessAccountId, row.id]
  );

  const after = await client.query(
    'SELECT phone_number_id, business_account_id, is_enabled FROM whatsapp_config WHERE id = $1',
    [row.id]
  );
  const a = after.rows[0];
  console.log('after:');
  console.log(`  phone_number_id:     ${a.phone_number_id}`);
  console.log(`  business_account_id: ${a.business_account_id}`);
  console.log(`  enabled:             ${a.is_enabled}`);
  console.log('\nNow restart so the service picks it up:  sudo docker restart ssbb');
} finally {
  client.release();
  await pool.end();
}
