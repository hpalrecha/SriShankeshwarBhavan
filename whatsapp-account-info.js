// Inspect one or more WhatsApp Business Accounts using the token already
// stored in the database, and print exactly what the admin panel needs.
//
// Get the account id from Meta Business Settings -> WhatsApp accounts: it is
// the "ID: 681013564674244" line under the account name.
//
// Run:  sudo docker cp whatsapp-account-info.js ssbb:/app/
//       sudo docker exec ssbb node /app/whatsapp-account-info.js 681013564674244 [more ids...]
//
// Prints no secrets.
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('Usage: node whatsapp-account-info.js <whatsapp-business-account-id> [...]');
  console.error('Find the id in Meta Business Settings -> WhatsApp accounts, under the name.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run this inside the app container.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const { rows } = await client.query(
  'SELECT access_token FROM whatsapp_config ORDER BY id DESC LIMIT 1'
);
client.release();
await pool.end();

const token = rows[0]?.access_token;
if (!token) {
  console.error('No access token stored in whatsapp_config.');
  process.exit(1);
}
const auth = { headers: { Authorization: `Bearer ${token}` } };
const api = (path) => fetch(`https://graph.facebook.com/v18.0/${path}`, auth).then((r) => r.json());

for (const id of ids) {
  console.log(`\n${'='.repeat(70)}\nAccount ${id}\n${'='.repeat(70)}`);

  const acct = await api(`${id}?fields=id,name,timezone_id,message_template_namespace`);
  if (acct.error) {
    console.log(`  UNREACHABLE: ${acct.error.message}`);
    console.log('  The stored token has no access to this account. Ask P91 to assign it,');
    console.log('  or use an account this token can already reach.');
    continue;
  }
  console.log(`  name: ${acct.name}`);

  // The phone number id is what the app posts to. It is NOT the phone number.
  const nums = await api(`${id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`);
  if (nums.error) {
    console.log(`  phone numbers: unreadable (${nums.error.message})`);
  } else if (!nums.data?.length) {
    console.log('  phone numbers: none registered on this account');
  } else {
    console.log('\n  PHONE NUMBERS  (use the id as "Phone Number ID")');
    for (const n of nums.data) {
      console.log(`    phone_number_id: ${n.id}`);
      console.log(`      number:        ${n.display_phone_number}`);
      console.log(`      sender name:   ${n.verified_name}   <- what guests see`);
      console.log(`      verified:      ${n.code_verification_status}   quality: ${n.quality_rating}`);
    }
  }

  // Templates, so we can see whether an OTP one exists and what shape it is.
  const tpl = await api(`${id}/message_templates?fields=name,status,category,language,components&limit=100`);
  if (tpl.error) {
    console.log(`\n  templates: unreadable (${tpl.error.message})`);
  } else {
    console.log(`\n  TEMPLATES (${tpl.data?.length || 0})`);
    for (const t of tpl.data || []) {
      const hasButton = (t.components || []).some((c) => c.type === 'BUTTONS');
      console.log(`    ${String(t.status).padEnd(10)} ${String(t.language).padEnd(7)} ${String(t.category || '').padEnd(15)} ${t.name}${hasButton ? '  [has buttons]' : ''}`);
    }
    const otp = (tpl.data || []).find((t) => /otp|verif|auth|login/i.test(t.name));
    if (otp) {
      const hasButton = (otp.components || []).some((c) => c.type === 'BUTTONS');
      console.log(`\n  An OTP-looking template exists: "${otp.name}"`);
      console.log(`    status ${otp.status}, language ${otp.language}, category ${otp.category}`);
      console.log(`    Set the admin "Copy code button" toggle to ${hasButton} for this one.`);
      if (otp.language !== 'en') {
        console.log(`    WARNING: the code sends language "en" but this template is "${otp.language}".`);
      }
    }
  }
}

console.log('\nPut the account id and the phone_number_id into Admin -> WhatsApp Settings.');
