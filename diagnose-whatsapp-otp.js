// Why is the WhatsApp OTP not arriving?
//
// Run this where DATABASE_URL is set (the Replit Shell):  node diagnose-whatsapp-otp.js
//
// Deliberately uses raw SQL rather than the app's Drizzle layer: Drizzle names
// every schema column in its SELECT, so if `db:push` has not run yet the app's
// own query throws before it can tell you anything. Raw SQL still reports.
//
// Prints no secrets - only whether a credential is present and how long it is.
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'node:fs';

// Same wiring as server/db.ts. The Neon driver talks over a WebSocket and has
// no constructor of its own under Node, so without this every connection fails
// with "All attempts to open a WebSocket to connect to the database failed".
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;

// The app has no dotenv: in production the env comes from whatever starts the
// process (systemd, pm2), so an interactive SSH shell on the Lightsail box has
// none of it. Read a local .env ourselves so this runs without the operator
// having to reconstruct the environment by hand.
function loadEnvFile(path = '.env') {
  if (!fs.existsSync(path)) return false;
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
  return true;
}

const ok = (m) => console.log(`\x1b[32m PASS\x1b[0m  ${m}`);
const bad = (m) => console.log(`\x1b[31m FAIL\x1b[0m  ${m}`);
const info = (m) => console.log(`       ${m}`);
const head = (m) => console.log(`\n=== ${m} ===`);

const problems = [];

async function main() {
  if (!process.env.DATABASE_URL) {
    const found = loadEnvFile();
    if (found) info('Loaded environment from .env');
  }

  if (!process.env.DATABASE_URL) {
    bad('DATABASE_URL is not set, and no .env here has it.');
    info('');
    info('Run this from the app directory on the server. If the app is managed by');
    info('pm2 or systemd, the value lives there, not in your login shell:');
    info('');
    info('  pm2 describe <app>            # look for DATABASE_URL under env');
    info('  systemctl cat <service>       # look for Environment= / EnvironmentFile=');
    info('');
    info('Then either run from the directory holding the .env, or prefix it:');
    info('  DATABASE_URL="postgres://..." node diagnose-whatsapp-otp.js');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  // 1. Has the new column been pushed? -------------------------------------
  head('1. Database schema');
  const col = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_name = 'whatsapp_templates' AND column_name = 'has_copy_code_button'`
  );
  const columnExists = col.rows.length > 0;
  if (columnExists) {
    ok('whatsapp_templates.has_copy_code_button exists (db:push has run)');
  } else {
    bad('whatsapp_templates.has_copy_code_button is MISSING');
    info('The deployed code selects this column, so EVERY WhatsApp message');
    info('fails - OTP and booking confirmations alike - until you run:');
    info('    npm run db:push');
    problems.push('Run `npm run db:push` - the new column is missing.');
  }

  // 2. Are the Meta credentials there and switched on? ---------------------
  head('2. WhatsApp credentials');
  const cfg = await client.query(
    `SELECT access_token, phone_number_id, business_account_id, is_enabled
       FROM whatsapp_config ORDER BY id DESC LIMIT 1`
  );
  let config = null;
  if (cfg.rows.length === 0) {
    bad('No row in whatsapp_config - WhatsApp was never configured');
    problems.push('Fill in WhatsApp credentials in Admin -> WhatsApp Settings.');
  } else {
    config = cfg.rows[0];
    const hasAll = !!(config.access_token && config.phone_number_id && config.business_account_id);
    info(`access token:       ${config.access_token ? `present (${config.access_token.length} chars)` : 'MISSING'}`);
    info(`phone number id:    ${config.phone_number_id || 'MISSING'}`);
    info(`business account:   ${config.business_account_id || 'MISSING'}`);
    info(`enabled:            ${config.is_enabled}`);
    if (hasAll && config.is_enabled) {
      ok('isConfigured() will pass');
    } else {
      bad('isConfigured() will return false, so every send is skipped');
      if (!config.is_enabled) problems.push('Switch WhatsApp ON in Admin -> WhatsApp Settings.');
      if (!hasAll) problems.push('A WhatsApp credential is blank in whatsapp_config.');
    }
  }

  // 3. Is there a template mapped for the OTP? -----------------------------
  head('3. Template mappings');
  const cols = columnExists
    ? 'notification_type, template_name, is_active, has_copy_code_button'
    : 'notification_type, template_name, is_active, NULL AS has_copy_code_button';
  const tpl = await client.query(`SELECT ${cols} FROM whatsapp_templates ORDER BY notification_type`);

  if (tpl.rows.length === 0) {
    info('(no rows at all)');
  } else {
    for (const r of tpl.rows) {
      info(`${r.is_active ? '[active]  ' : '[inactive]'} ${r.notification_type.padEnd(24)} -> ${r.template_name}`);
    }
  }

  const otp = tpl.rows.find((r) => r.notification_type === 'otp_verification' && r.is_active);
  if (otp) {
    ok(`otp_verification is mapped to "${otp.template_name}"`);
    info(`has_copy_code_button = ${otp.has_copy_code_button}`);
  } else {
    const inactive = tpl.rows.find((r) => r.notification_type === 'otp_verification');
    bad(inactive
      ? 'otp_verification exists but is INACTIVE - sendOTP skips it'
      : 'No otp_verification mapping at all - sendOTP returns false every time');
    info('This alone stops every WhatsApp OTP, whatever else is correct.');
    problems.push('Map an approved Meta template to "Login OTP" in Admin -> WhatsApp Settings -> Templates.');
  }

  // 4. Does Meta agree the template exists and is approved? ----------------
  if (config?.access_token && config?.business_account_id) {
    head('4. What Meta says');
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${config.business_account_id}/message_templates?limit=100`,
        { headers: { Authorization: `Bearer ${config.access_token}` } }
      );
      const body = await res.json();
      if (!res.ok) {
        bad(`Meta rejected the credentials: ${JSON.stringify(body.error || body)}`);
        problems.push('Meta rejected the access token - it may have expired.');
      } else {
        const list = body.data || [];
        info(`${list.length} template(s) on the business account:`);
        for (const t of list) {
          info(`  ${String(t.status).padEnd(10)} ${String(t.language).padEnd(7)} ${String(t.category || '').padEnd(15)} ${t.name}`);
        }
        if (otp) {
          const match = list.find((t) => t.name === otp.template_name);
          if (!match) {
            bad(`Mapped name "${otp.template_name}" does not exist on this account`);
            problems.push(`No Meta template named "${otp.template_name}".`);
          } else if (match.status !== 'APPROVED') {
            bad(`"${otp.template_name}" is ${match.status}, not APPROVED`);
            problems.push(`Template "${otp.template_name}" is ${match.status}.`);
          } else {
            ok(`"${otp.template_name}" is APPROVED (${match.category})`);
            // whatsapp.ts sends language.code 'en', hardcoded. Meta treats
            // 'en' and 'en_US' as different translations and rejects the send
            // outright if the one you ask for does not exist.
            if (match.language !== 'en') {
              bad(`Template language is "${match.language}" but the code sends "en"`);
              info('Meta rejects this as a missing translation - nothing is delivered.');
              problems.push(`Template "${otp.template_name}" is "${match.language}"; either add an "en" translation in Meta or change the hardcoded language in server/whatsapp.ts.`);
            }
            const buttons = (match.components || []).find((c) => c.type === 'BUTTONS');
            const metaHasButton = !!buttons;
            info(`Meta says this template ${metaHasButton ? 'HAS' : 'has NO'} button component`);
            if (columnExists && metaHasButton !== !!otp.has_copy_code_button) {
              bad(`Mismatch: has_copy_code_button is ${otp.has_copy_code_button}, Meta says ${metaHasButton}`);
              info('Every send will be rejected until the toggle matches the template.');
              problems.push(`Set the "Copy code button" toggle to ${metaHasButton} for the Login OTP mapping.`);
            }
          }
        }
      }
    } catch (e) {
      bad(`Could not reach Meta: ${e.message}`);
    }
  }

  head('Verdict');
  if (problems.length === 0) {
    console.log('Nothing wrong found here. If the code still does not arrive, the send is');
    console.log('being accepted by Meta but not delivered - check that the recipient has');
    console.log('messaged the business number, or is on the tester list for an unverified number.');
  } else {
    problems.forEach((p, i) => console.log(`${i + 1}. ${p}`));
  }

  client.release();
  await pool.end();
}

main().catch((e) => {
  console.error('Diagnostic itself failed:', e);
  process.exit(1);
});
