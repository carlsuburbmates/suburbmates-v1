#!/usr/bin/env node

/**
 * Setup Stripe Recurring Price and Get Connect Client ID
 * 
 * This script:
 * 1. Creates a proper recurring monthly price for Vendor Pro
 * 2. Retrieves the Stripe Connect Client ID
 */

import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim().replace(/["']/g, '');
      }
    }
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover'
});

async function createRecurringPrice() {
  console.log('🔄 Creating recurring monthly price for Vendor Pro...\n');
  
  try {
    // Create recurring monthly price
    const price = await stripe.prices.create({
      product: 'prod_TPuOEuSTspxJVj', // Vendor Pro product ID
      unit_amount: 2000, // A$20.00
      currency: 'aud',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      nickname: 'Vendor Pro Monthly'
    });
    
    console.log('✅ Recurring price created successfully!');
    console.log(`Price ID: ${price.id}`);
    console.log(`Amount: $${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}/month\n`);
    
    return price.id;
  } catch (error) {
    console.error('❌ Error creating recurring price:', error.message);
    return null;
  }
}

async function getConnectSettings() {
  console.log('🔍 Retrieving Stripe Connect settings...\n');
  
  try {
    const account = await stripe.accounts.retrieve();
    
    console.log('📊 Account Information:');
    console.log(`Account ID: ${account.id}`);
    console.log(`Type: ${account.type}`);
    console.log(`Country: ${account.country}`);
    
    // For Connect Client ID, we need to check the account settings
    if (account.type === 'standard') {
      console.log('\n⚠️  This is a Standard account. To get the Connect Client ID:');
      console.log('1. Go to https://dashboard.stripe.com/settings/connect');
      console.log('2. Enable Connect if not already enabled');
      console.log('3. Register your OAuth redirect URLs:');
      console.log('   - Development: http://localhost:3000/vendor/connect/callback');
      console.log('   - Production: https://yourdomain.com/vendor/connect/callback');
      console.log('4. Copy the Client ID from the Connect settings page');
      console.log('\n📝 The Client ID will look like: ca_XXXXXXXXXXXXXXXX');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error retrieving account:', error.message);
    return false;
  }
}

async function updateEnvFile(priceId) {
  console.log('\n📝 Updating .env.local file...\n');
  
  const envPath = path.join(__dirname, '../.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update the recurring price ID
  if (priceId) {
    envContent = envContent.replace(
      /STRIPE_PRICE_VENDOR_PRO_MONTH=.*/,
      `STRIPE_PRICE_VENDOR_PRO_MONTH=${priceId}   # recurring, 2000 AUD / month`
    );
    console.log(`✅ Updated STRIPE_PRICE_VENDOR_PRO_MONTH=${priceId}`);
  }
  
  // Update product IDs
  envContent = envContent.replace(
    /STRIPE_PRODUCT_VENDOR_PRO=.*/,
    `STRIPE_PRODUCT_VENDOR_PRO=prod_TPuOEuSTspxJVj        # Suburbmates Vendor Pro`
  );
  
  envContent = envContent.replace(
    /STRIPE_PRODUCT_FEATURED_30D=.*/,
    `STRIPE_PRODUCT_FEATURED_30D=prod_TPuPw6OUFH7W56      # Suburbmates Featured Business`
  );
  
  envContent = envContent.replace(
    /STRIPE_PRICE_FEATURED_30D=.*/,
    `STRIPE_PRICE_FEATURED_30D=price_1ST4atL1jaQsKn6ZGWmPQAu4       # one-time, 2000 AUD`
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local file updated successfully!');
}

async function main() {
  console.log('🚀 Stripe Setup Script\n');
  console.log('======================\n');
  
  // Create recurring price
  const priceId = await createRecurringPrice();
  
  // Get Connect settings
  await getConnectSettings();
  
  // Update env file
  await updateEnvFile(priceId);
  
  console.log('\n\n📋 NEXT STEPS:');
  console.log('1. Get your Connect Client ID from: https://dashboard.stripe.com/settings/connect');
  console.log('2. Manually update STRIPE_CLIENT_ID in .env.local');
  console.log('3. Run "node scripts/verify-stripe-access.js" to verify everything is configured');
  
  console.log('\n✅ Script completed!');
}

main().catch(error => {
  console.error('\n💥 Unexpected error:', error.message);
  process.exit(1);
});