#!/usr/bin/env node

/**
 * Stripe Access Verification Script for Suburbmates V1.1
 *
 * This script performs comprehensive Stripe access verification
 * and provides actionable feedback for missing configurations.
 *
 * Usage: node scripts/verify-stripe-access.js
 */

// Load environment variables from .env.local if it exists
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Try to load .env.local file manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

import Stripe from 'stripe';

// Configuration
const REQUIRED_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

const OPTIONAL_ENV_VARS = [
  'STRIPE_CLIENT_ID',
  'STRIPE_PRODUCT_VENDOR_PRO',
  'STRIPE_PRICE_VENDOR_PRO_MONTH',
  'STRIPE_PRODUCT_FEATURED_30D',
  'STRIPE_PRICE_FEATURED_30D'
];

const PLACEHOLDER_VALUES = [
  'ca_...',
  'prod_...',
  'price_...'
];

// Results tracking
let verificationResults = {
  critical: [],
  warnings: [],
  info: [],
  success: []
};

function log(level, message) {
  verificationResults[level].push(message);
  const icon = {
    critical: '❌',
    warnings: '⚠️',
    info: 'ℹ️',
    success: '✅'
  }[level];
  
  console.log(`${icon} ${message}`);
}

function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...\n');
  
  // Check required variables
  REQUIRED_ENV_VARS.forEach(envVar => {
    const value = process.env[envVar];
    if (!value) {
      log('critical', `Missing required environment variable: ${envVar}`);
    } else {
      log('success', `✅ ${envVar} is set`);
    }
  });
  
  // Check optional but critical variables
  OPTIONAL_ENV_VARS.forEach(envVar => {
    const value = process.env[envVar];
    if (!value) {
      log('critical', `Missing environment variable: ${envVar} (required for implementation)`);
    } else if (PLACEHOLDER_VALUES.some(placeholder => value.includes(placeholder))) {
      log('critical', `⚠️ ${envVar} contains placeholder value: ${value.substring(0, 20)}...`);
    } else {
      log('success', `✅ ${envVar} is properly configured`);
    }
  });
}

async function testStripeConnectivity() {
  console.log('\n🔌 Testing Stripe API Connectivity...\n');
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    log('critical', 'Cannot test connectivity - STRIPE_SECRET_KEY not set');
    return false;
  }
  
  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
      timeout: 10000
    });
    
    // Test basic API access
    const account = await stripe.accounts.retrieve();
    log('success', `Stripe API connection successful - Account: ${account.id}`);
    log('success', `Account type: ${account.type}`);
    log('success', `Country: ${account.country}`);
    
    // Check if account supports Connect
    if (account.type === 'standard') {
      log('success', '✅ Account supports Standard Connect');
    } else {
      log('info', `Account type: ${account.type} (expected: standard)`);
    }
    
    return true;
  } catch (error) {
    if (error.code === 'authentication_required') {
      log('critical', '❌ Invalid Stripe secret key');
    } else if (error.code === 'api_key_expired') {
      log('critical', '❌ Stripe API key has expired');
    } else if (error.statusCode === 401) {
      log('critical', '❌ Unauthorized access to Stripe API');
    } else if (error.statusCode === 429) {
      log('warnings', '⚠️ Rate limited by Stripe API');
    } else {
      log('critical', `❌ Stripe API error: ${error.message}`);
    }
    return false;
  }
}

async function testConnectConfiguration() {
  console.log('\n🔗 Testing Stripe Connect Configuration...\n');
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return;
  
  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover'
    });
    
    // Check Connect Client ID
    const clientId = process.env.STRIPE_CLIENT_ID;
    if (clientId && !PLACEHOLDER_VALUES.some(p => clientId.includes(p))) {
      log('success', `✅ Connect Client ID configured: ${clientId.substring(0, 15)}...`);
    } else {
      log('critical', '❌ Stripe Connect Client ID missing or placeholder');
      log('info', '   Go to: Stripe Dashboard → Developers → Settings → Connect');
      log('info', '   Register OAuth redirect URLs:');
      log('info', '     Dev: http://localhost:3000/vendor/connect/callback');
      log('info', '     Prod: https://yourdomain.com/vendor/connect/callback');
    }
    
    // Test Connect account creation capability
    try {
      const testAccount = await stripe.accounts.create({
        type: 'standard',
        country: 'AU',
        email: 'test@example.com'
      });
      
      log('success', '✅ Can create Connect accounts');
      
      // Clean up test account
      await stripe.accounts.del(testAccount.id);
    } catch (error) {
      if (error.code === 'account_not_connected') {
        log('critical', '❌ Account not configured for Connect - enable in Dashboard');
      } else if (error.code === 'country_unsupported') {
        log('critical', '❌ Country not supported for Connect');
      } else {
        log('warnings', `⚠️ Connect account creation test failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    log('critical', `❌ Connect configuration test failed: ${error.message}`);
  }
}

async function testProductsAndPrices() {
  console.log('\n🛒 Testing Products and Prices...\n');
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return;
  
  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover'
    });
    
    const productChecks = [
      { envVar: 'STRIPE_PRODUCT_VENDOR_PRO', name: 'Vendor Pro Product' },
      { envVar: 'STRIPE_PRODUCT_FEATURED_30D', name: 'Featured Business Product' }
    ];
    
    const priceChecks = [
      { envVar: 'STRIPE_PRICE_VENDOR_PRO_MONTH', name: 'Vendor Pro Monthly Price' },
      { envVar: 'STRIPE_PRICE_FEATURED_30D', name: 'Featured Business One-time Price' }
    ];
    
    // Check products
    for (const check of productChecks) {
      const productId = process.env[check.envVar];
      if (!productId) {
        log('critical', `❌ ${check.name}: Missing product ID`);
        continue;
      }
      
      if (PLACEHOLDER_VALUES.some(p => productId.includes(p))) {
        log('critical', `❌ ${check.name}: Placeholder value detected`);
        continue;
      }
      
      try {
        const product = await stripe.products.retrieve(productId);
        log('success', `✅ ${check.name}: ${product.name} (${product.id})`);
      } catch (error) {
        log('critical', `❌ ${check.name}: Invalid product ID - ${error.message}`);
      }
    }
    
    // Check prices
    for (const check of priceChecks) {
      const priceId = process.env[check.envVar];
      if (!priceId) {
        log('critical', `❌ ${check.name}: Missing price ID`);
        continue;
      }
      
      if (PLACEHOLDER_VALUES.some(p => priceId.includes(p))) {
        log('critical', `❌ ${check.name}: Placeholder value detected`);
        continue;
      }
      
      try {
        const price = await stripe.prices.retrieve(priceId);
        const product = await stripe.products.retrieve(price.product);
        log('success', `✅ ${check.name}: $${(price.unit_amount / 100).toFixed(2)} ${price.recurring ? '(recurring)' : '(one-time)'} for ${product.name}`);
      } catch (error) {
        log('critical', `❌ ${check.name}: Invalid price ID - ${error.message}`);
      }
    }
    
  } catch (error) {
    log('critical', `❌ Product/Price verification failed: ${error.message}`);
  }
}

async function testWebhookConfiguration() {
  console.log('\n📨 Testing Webhook Configuration...\n');
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log('critical', '❌ Webhook secret not configured');
    return;
  }
  
  if (PLACEHOLDER_VALUES.some(p => webhookSecret.includes(p))) {
    log('critical', '❌ Webhook secret contains placeholder value');
    return;
  }
  
  log('success', `✅ Webhook secret configured: ${webhookSecret.substring(0, 20)}...`);
  
  // Test webhook endpoint availability (basic check)
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': webhookSecret
      },
      body: JSON.stringify({ type: 'test.webhook' })
    });
    
    if (response.ok) {
      log('success', '✅ Webhook endpoint is reachable');
    } else {
      log('warnings', `⚠️ Webhook endpoint returned status: ${response.status}`);
    }
  } catch (error) {
    log('warnings', `⚠️ Webhook endpoint test failed: ${error.message}`);
    log('info', '   This is expected if development server is not running');
  }
}

function generateActionPlan() {
  console.log('\n📋 ACTION PLAN\n');
  
  const criticalIssues = verificationResults.critical;
  const warningsCount = verificationResults.warnings.length;
  
  if (criticalIssues.length === 0) {
    log('success', '🎉 All critical Stripe configuration is complete!');
    log('info', '   Ready for implementation.');
    return;
  }
  
  log('critical', `${criticalIssues.length} critical issue(s) found:`);
  criticalIssues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue.replace(/❌ /, '').replace(/⚠️ /, '')}`);
  });
  
  console.log('\n🎯 IMMEDIATE ACTIONS REQUIRED:');
  
  // Generate specific actions based on issues found
  if (verificationResults.critical.some(issue => issue.includes('STRIPE_CLIENT_ID'))) {
    console.log('\n1. STRIPE CONNECT CONFIGURATION:');
    console.log('   - Go to: https://dashboard.stripe.com/connect/settings');
    console.log('   - Enable "Standard" Connect');
    console.log('   - Register OAuth redirect URLs:');
    console.log('     • Development: http://localhost:3000/vendor/connect/callback');
    console.log('     • Production: https://yourdomain.com/vendor/connect/callback');
    console.log('   - Copy Client ID to .env.local as STRIPE_CLIENT_ID');
  }
  
  if (verificationResults.critical.some(issue => issue.includes('placeholder value'))) {
    console.log('\n2. CREATE STRIPE PRODUCTS & PRICES:');
    console.log('   - Go to: https://dashboard.stripe.com/products');
    console.log('   - Create "Suburbmates Vendor Pro" product');
    console.log('   - Add A$20/month recurring price');
    console.log('   - Create "Suburbmates Featured Business – 30 days" product');
    console.log('   - Add A$20 one-time price');
    console.log('   - Update environment variables with actual IDs');
  }
  
  if (verificationResults.critical.some(issue => issue.includes('authentication'))) {
    console.log('\n3. VERIFY STRIPE ACCOUNT ACCESS:');
    console.log('   - Check that STRIPE_SECRET_KEY is correct');
    console.log('   - Ensure account has necessary permissions');
    console.log('   - Verify account is not restricted');
  }
  
  if (warningsCount > 0) {
    console.log(`\n⚠️ ${warningsCount} warning(s) found - see details above`);
  }
}

function printSummary() {
  console.log('\n📊 VERIFICATION SUMMARY\n');
  
  const totalChecks = Object.values(verificationResults).flat().length;
  const successCount = verificationResults.success.length;
  const criticalCount = verificationResults.critical.length;
  const warningsCount = verificationResults.warnings.length;
  
  console.log(`Total checks: ${totalChecks}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Critical: ${criticalCount}`);
  console.log(`⚠️ Warnings: ${warningsCount}`);
  console.log(`ℹ️ Info: ${verificationResults.info.length}`);
  
  const successRate = totalChecks > 0 ? (successCount / totalChecks * 100) : 0;
  console.log(`\nSuccess Rate: ${successRate.toFixed(1)}%`);
  
  if (criticalCount === 0) {
    console.log('\n🎉 READY FOR IMPLEMENTATION!');
    console.log('   All critical Stripe configuration is complete.');
  } else {
    console.log(`\n🛑 ${criticalCount} CRITICAL ISSUE(S) MUST BE RESOLVED`);
    console.log('   Implementation cannot proceed until critical issues are fixed.');
  }
}

// Main execution
async function main() {
  console.log('🔍 Suburbmates V1.1 - Stripe Access Verification');
  console.log('==============================================\n');
  
  // Check environment first
  checkEnvironmentVariables();
  
  // Test API connectivity
  const canConnect = await testStripeConnectivity();
  
  if (canConnect) {
    // Run detailed tests
    await testConnectConfiguration();
    await testProductsAndPrices();
    await testWebhookConfiguration();
  }
  
  // Generate action plan
  generateActionPlan();
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  const criticalCount = verificationResults.critical.length;
  process.exit(criticalCount > 0 ? 1 : 0);
}

// Run main function
main().catch(error => {
  console.error('\n💥 Unexpected error during verification:');
  console.error(error.message);
  process.exit(1);
});

export {
  checkEnvironmentVariables,
  testStripeConnectivity,
  testConnectConfiguration,
  testProductsAndPrices,
  testWebhookConfiguration,
  generateActionPlan
};