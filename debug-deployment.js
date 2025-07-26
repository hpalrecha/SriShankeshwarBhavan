// Debug script to check deployment configuration
import { Pool } from '@neondatabase/serverless';

console.log('=== DEPLOYMENT DEBUG INFO ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

async function testDeployment() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not found');
      return;
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check if WhatsApp config exists
    const result = await client.query('SELECT * FROM whatsapp_config LIMIT 1');
    console.log('WhatsApp config in database:', result.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');
    
    if (result.rows.length > 0) {
      const config = result.rows[0];
      console.log('Config enabled:', config.isEnabled);
      console.log('Has access token:', !!config.accessToken);
      console.log('Has phone ID:', !!config.phoneNumberId);
      console.log('Has business ID:', !!config.businessAccountId);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

testDeployment();