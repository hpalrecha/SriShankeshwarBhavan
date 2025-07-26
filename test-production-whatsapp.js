// Test production WhatsApp configuration
import { storage } from './server/storage.js';

async function testProductionWhatsApp() {
  try {
    console.log('🔍 Testing production WhatsApp configuration...');
    
    // Check if database config exists
    const config = await storage.getWhatsAppConfig();
    
    if (!config) {
      console.log('❌ No WhatsApp configuration found in database');
      return;
    }
    
    console.log('✅ WhatsApp config found in database');
    console.log('- Enabled:', config.isEnabled);
    console.log('- Has Access Token:', !!config.accessToken);
    console.log('- Access Token Length:', config.accessToken?.length || 0);
    console.log('- Phone Number ID:', config.phoneNumberId);
    console.log('- Business Account ID:', config.businessAccountId);
    
    // Test API connection
    if (config.isEnabled && config.accessToken) {
      console.log('🧪 Testing Meta API connection...');
      
      const response = await fetch(`https://graph.facebook.com/v18.0/${config.businessAccountId}`, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        }
      });
      
      console.log('API Response Status:', response.status);
      
      if (response.ok) {
        console.log('✅ Meta API connection successful');
      } else {
        const errorData = await response.text();
        console.log('❌ Meta API connection failed:', errorData);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProductionWhatsApp();