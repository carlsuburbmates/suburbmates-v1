#!/usr/bin/env node

/**
 * Complete Stripe Setup Script for Suburbmates V1.1
 *
 * This script automates everything possible for Stripe setup:
 * - Creates products and prices
 * - Sets up webhook endpoints
 * - Generates environment variables
 * - Provides instructions for manual steps
 *
 * Usage: node scripts/setup-stripe-complete.js
 */

// Load environment variables from .env.local if it exists
const fs = require('fs');
const path = require('path');

// Try to load .env.local file manually
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

const Stripe = require('stripe');

// Configuration
const STRIPE_CONFIG = {
  // Product configurations
  vendorPro: {
    name: "Suburbmates Vendor Pro",
    description: "Monthly subscription for Pro vendor tier with reduced commission",
    price: {
      amount: 2000, // A$20.00 in cents
      currency: 'aud',
      interval: 'month',
      nickname: 'vendor_pro_monthly'
    }
  },
  
  featured: {
    name: "Suburbmates Featured Business - 30 days",
    description: "One-time payment for 30 days of featured placement in marketplace",
    price: {
      amount: 2000, // A$20.00 in cents
      currency: 'aud',
      interval: null, // one-time
      nickname: 'featured_30d_onetime'
    }
  },
  
  // Webhook configuration
  webhook: {
    url: process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/stripe`
      : 'http://localhost:3000/api/webhooks/stripe',
    events: [
      'checkout.session.completed',
      'payment_intent.succeeded',
      'charge.refunded',
      'charge.dispute.created',
      'charge.dispute.updated',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed'
    ]
  }
};

// Setup results tracking
let setupResults = {
  completed: [],
  failed: [],
  manualRequired: [],
  warnings: []
};

function log(level, message) {
  const icon = {
    success: '✅',
    error: '❌',
    manual: '🔧',
    warning: '⚠️',
    info: 'ℹ️'
  }[level];
  
  console.log(`${icon} ${message}`);
  
  switch (level) {
    case 'success':
      setupResults.completed.push(message);
      break;
    case 'error':
      setupResults.failed.push(message);
      break;
    case 'manual':
      setupResults.manualRequired.push(message);
      break;
    case 'warning':
      setupResults.warnings.push(message);
      break;
  }
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 ${title}`);
  console.log(`${'='.repeat(60)}`);
}

/**
 * Validate Stripe API access
 */
async function validateStripeAccess() {
  logSection('Validating Stripe Access');
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    log('error', 'STRIPE_SECRET_KEY not found in environment');
    return false;
  }
  
  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
      timeout: 15000
    });
    
    // Test API access
    const account = await stripe.accounts.retrieve();
    log('success', `Connected to Stripe account: ${account.id}`);
    log('success', `Account type: ${account.type}, Country: ${account.country}`);
    log('success', `Live mode: ${!secretKey.startsWith('sk_test')}`);
    
    // Check if Connect is available
    if (account.type === 'standard') {
      log('success', '✅ Account supports Standard Connect');
    } else {
      log('warning', `Account type: ${account.type} (Standard expected)`);
    }
    
    return { stripe, account };
  } catch (error) {
    if (error.code === 'authentication_required') {
      log('error', '❌ Invalid Stripe API key');
    } else if (error.statusCode === 401) {
      log('error', '❌ Unauthorized access to Stripe API');
    } else {
      log('error', `❌ Stripe API error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Create Vendor Pro product and price
 */
async function createVendorProSetup(stripe) {
  logSection('Creating Vendor Pro Setup');
  
  try {
    // Check if product already exists
    const existingProducts = await stripe.products.list({
      limit: 100,
      active: true
    });
    
    let product = existingProducts.data.find(p => 
      p.name === STRIPE_CONFIG.vendorPro.name || 
      p.nickname === 'vendor_pro'
    );
    
    if (product) {
      log('info', `Found existing Vendor Pro product: ${product.id}`);
    } else {
      // Create product
      product = await stripe.products.create({
        name: STRIPE_CONFIG.vendorPro.name,
        description: STRIPE_CONFIG.vendorPro.description,
        nickname: 'vendor_pro',
        shippable: false,
        unit_label: 'month'
      });
      log('success', `Created Vendor Pro product: ${product.id}`);
    }
    
    // Check for existing price
    const existingPrices = await stripe.prices.list({
      product: product.id,
      limit: 10
    });
    
    let price = existingPrices.data.find(p => 
      p.recurring?.interval === STRIPE_CONFIG.vendorPro.price.interval &&
      p.unit_amount === STRIPE_CONFIG.vendorPro.price.amount
    );
    
    if (price) {
      log('info', `Found existing Vendor Pro price: ${price.id}`);
    } else {
      // Create monthly price
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: STRIPE_CONFIG.vendorPro.price.amount,
        currency: STRIPE_CONFIG.vendorPro.price.currency,
        recurring: {
          interval: STRIPE_CONFIG.vendorPro.price.interval,
          interval_count: 1
        },
        nickname: STRIPE_CONFIG.vendorPro.price.nickname
      });
      log('success', `Created Vendor Pro price: ${price.id}`);
    }
    
    return { product, price };
  } catch (error) {
    log('error', `Failed to create Vendor Pro setup: ${error.message}`);
    return null;
  }
}

/**
 * Create Featured Business product and price
 */
async function createFeaturedSetup(stripe) {
  logSection('Creating Featured Business Setup');
  
  try {
    // Check if product already exists
    const existingProducts = await stripe.products.list({
      limit: 100,
      active: true
    });
    
    let product = existingProducts.data.find(p => 
      p.name === STRIPE_CONFIG.featured.name || 
      p.nickname === 'featured_30d'
    );
    
    if (product) {
      log('info', `Found existing Featured product: ${product.id}`);
    } else {
      // Create product
      product = await stripe.products.create({
        name: STRIPE_CONFIG.featured.name,
        description: STRIPE_CONFIG.featured.description,
        nickname: 'featured_30d',
        shippable: false
      });
      log('success', `Created Featured Business product: ${product.id}`);
    }
    
    // Check for existing price
    const existingPrices = await stripe.prices.list({
      product: product.id,
      limit: 10
    });
    
    let price = existingPrices.data.find(p => 
      !p.recurring && 
      p.unit_amount === STRIPE_CONFIG.featured.price.amount
    );
    
    if (price) {
      log('info', `Found existing Featured price: ${price.id}`);
    } else {
      // Create one-time price
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: STRIPE_CONFIG.featured.price.amount,
        currency: STRIPE_CONFIG.featured.price.currency,
        nickname: STRIPE_CONFIG.featured.price.nickname
      });
      log('success', `Created Featured Business price: ${price.id}`);
    }
    
    return { product, price };
  } catch (error) {
    log('error', `Failed to create Featured setup: ${error.message}`);
    return null;
  }
}

/**
 * Set up webhook endpoint
 */
async function setupWebhook(stripe) {
  logSection('Setting Up Webhook Endpoint');
  
  try {
    // Check if webhook already exists
    const existingWebhooks = await stripe.webhookEndpoints.list({
      limit: 10
    });
    
    let webhook = existingWebhooks.data.find(w => 
      w.url === STRIPE_CONFIG.webhook.url
    );
    
    if (webhook) {
      log('info', `Found existing webhook: ${webhook.id}`);
      
      // Update if needed
      const needsUpdate = !arraysEqual(webhook.enabled_events, STRIPE_CONFIG.webhook.events);
      if (needsUpdate) {
        webhook = await stripe.webhookEndpoints.update(webhook.id, {
          enabled_events: STRIPE_CONFIG.webhook.events
        });
        log('success', `Updated webhook events: ${webhook.id}`);
      }
    } else {
      // Create new webhook
      webhook = await stripe.webhookEndpoints.create({
        url: STRIPE_CONFIG.webhook.url,
        enabled_events: STRIPE_CONFIG.webhook.events,
        description: 'Suburbmates V1.1 webhook endpoint'
      });
      log('success', `Created webhook endpoint: ${webhook.id}`);
    }
    
    log('success', `Webhook URL: ${webhook.url}`);
    log('success', `Webhook secret: ${webhook.secret}`);
    
    return webhook;
  } catch (error) {
    log('error', `Failed to setup webhook: ${error.message}`);
    return null;
  }
}

/**
 * Create OAuth application for Connect
 */
async function setupConnectOAuth(stripe) {
  logSection('Connect OAuth Setup Instructions');
  
  log('manual', '🔧 STRIPE_CLIENT_ID must be obtained manually from Stripe Dashboard');
  log('manual', '   1. Go to: https://dashboard.stripe.com/connect/settings');
  log('manual', '   2. Enable "Standard" Connect if not already enabled');
  log('manual', '   3. Register OAuth redirect URLs:');
  log('manual', '      • Development: http://localhost:3000/vendor/connect/callback');
  log('manual', '      • Production: https://yourdomain.com/vendor/connect/callback');
  log('manual', '   4. Copy the "Client ID" value (format: ca_...)');
  log('manual', '   5. Add to .env.local as STRIPE_CLIENT_ID');
  
  return null; // Cannot be automated
}

/**
 * Generate environment variables configuration
 */
function generateEnvironmentConfig(vendorPro, featured, webhook) {
  logSection('Generating Environment Configuration');
  
  const envConfig = `
# === SUBURBMATES V1.1 STRIPE CONFIGURATION ===
# Generated on: ${new Date().toISOString()}
# Run this script again if you need to regenerate

# Core Stripe configuration (already configured)
# STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY?.substring(0, 10)}... (already set)
# STRIPE_WEBHOOK_SECRET=${webhook?.secret || 'YOUR_WEBHOOK_SECRET'}

# Stripe Connect (MANUAL SETUP REQUIRED)
# Go to: Stripe Dashboard → Developers → Settings → Connect
# Register OAuth redirect URLs and copy Client ID
# STRIPE_CLIENT_ID=ca_your_client_id_here

# Vendor Pro subscription
STRIPE_PRODUCT_VENDOR_PRO=${vendorPro?.product.id || 'prod_vendor_pro_id'}
STRIPE_PRICE_VENDOR_PRO_MONTH=${vendorPro?.price.id || 'price_vendor_pro_monthly'}

# Featured Business 30-day add-on
STRIPE_PRODUCT_FEATURED_30D=${featured?.product.id || 'prod_featured_id'}
STRIPE_PRICE_FEATURED_30D=${featured?.price.id || 'price_featured_onetime'}

# Legacy variables (update if your code references these)
# STRIPE_PRODUCT_PRO=${vendorPro?.product.id || 'prod_vendor_pro_id'}
# STRIPE_PRICE_PRO_MONTH=${vendorPro?.price.id || 'price_vendor_pro_monthly'}
`;

  log('info', '📋 Generated environment variables configuration:');
  console.log(envConfig);
  
  return envConfig;
}

/**
 * Create setup summary and next steps
 */
function createSetupSummary() {
  logSection('Setup Summary');
  
  const totalTasks = setupResults.completed.length + setupResults.failed.length + setupResults.manualRequired.length;
  const completedTasks = setupResults.completed.length;
  
  console.log(`\n📊 SETUP RESULTS:`);
  console.log(`   Total Tasks: ${totalTasks}`);
  console.log(`   ✅ Completed: ${completedTasks}`);
  console.log(`   ❌ Failed: ${setupResults.failed.length}`);
  console.log(`   🔧 Manual Required: ${setupResults.manualRequired.length}`);
  
  if (setupResults.failed.length > 0) {
    console.log(`\n❌ FAILED TASKS:`);
    setupResults.failed.forEach(task => console.log(`   • ${task}`));
  }
  
  if (setupResults.manualRequired.length > 0) {
    console.log(`\n🔧 MANUAL TASKS REQUIRED:`);
    setupResults.manualRequired.forEach(task => console.log(`   • ${task}`));
  }
  
  if (setupResults.warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS:`);
    setupResults.warnings.forEach(warning => console.log(`   • ${warning}`));
  }
  
  console.log(`\n🎯 NEXT STEPS:`);
  console.log(`   1. Copy the generated environment variables above`);
  console.log(`   2. Complete the manual Connect OAuth setup`);
  console.log(`   3. Update your .env.local file with the new variables`);
  console.log(`   4. Run: node scripts/verify-stripe-access.js`);
  console.log(`   5. Test the integration: node scripts/test-stripe-integration.js`);
  
  if (setupResults.failed.length === 0) {
    console.log(`\n🎉 SUCCESS! All automatable tasks completed.`);
    console.log(`   Only manual Connect setup remains.`);
  } else {
    console.log(`\n⚠️ Some tasks failed. Check the error messages above.`);
    console.log(`   You may need to resolve these before proceeding.`);
  }
}

/**
 * Utility functions
 */
function arraysEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && 
         a.every((val, index) => val === b[index]);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Suburbmates V1.1 - Complete Stripe Setup');
  console.log('============================================');
  console.log('This script will automate everything possible for Stripe setup.');
  console.log('Manual steps will be clearly marked.\n');
  
  // Validate access
  const stripeAccess = await validateStripeAccess();
  if (!stripeAccess) {
    console.error('\n💥 Cannot proceed without valid Stripe API access.');
    console.error('Please check your STRIPE_SECRET_KEY in .env.local');
    process.exit(1);
  }
  
  const { stripe } = stripeAccess;
  
  // Run setup tasks
  const vendorPro = await createVendorProSetup(stripe);
  const featured = await createFeaturedSetup(stripe);
  const webhook = await setupWebhook(stripe);
  await setupConnectOAuth(stripe);
  
  // Generate configuration
  const envConfig = generateEnvironmentConfig(vendorPro, featured, webhook);
  
  // Save configuration to file
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '../.env.stripe-generated');
  
  try {
    fs.writeFileSync(outputPath, envConfig);
    log('success', `Environment configuration saved to: ${outputPath}`);
  } catch (error) {
    log('error', `Failed to save configuration file: ${error.message}`);
  }
  
  // Create setup summary
  createSetupSummary();
  
  // Exit with appropriate code
  const hasErrors = setupResults.failed.length > 0;
  const manualStepsRemaining = setupResults.manualRequired.length > 0;
  
  if (hasErrors) {
    console.log('\n❌ Setup completed with errors. Please review and retry.');
    process.exit(1);
  } else if (manualStepsRemaining) {
    console.log('\n✅ Automated setup completed. Manual steps still required.');
    process.exit(0);
  } else {
    console.log('\n🎉 Complete setup finished successfully!');
    process.exit(0);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Unexpected error during setup:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = {
  validateStripeAccess,
  createVendorProSetup,
  createFeaturedSetup,
  setupWebhook,
  setupConnectOAuth,
  generateEnvironmentConfig
};