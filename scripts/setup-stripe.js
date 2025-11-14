#!/usr/bin/env node

/**
 * Stripe Setup Script for Suburbmates V1.1
 * 
 * This script helps set up the missing Stripe Connect configuration
 * and creates the required products/prices for Vendor Pro and Featured slots.
 * 
 * Usage: node scripts/setup-stripe.js
 * 
 * Prerequisites:
 * - STRIPE_SECRET_KEY must be set in environment
 * - Stripe CLI or Dashboard access for Connect setup
 */

require('dotenv').config();
const Stripe = require('stripe');

// Check for required environment variables
function checkEnvironment() {
  const required = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease add these to your .env.local file');
    process.exit(1);
  }
  
  console.log('✅ Environment variables check passed');
}

// Create Stripe client
function createStripeClient() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });
    return stripe;
  } catch (error) {
    console.error('❌ Failed to create Stripe client:', error.message);
    process.exit(1);
  }
}

// Test Stripe connection
async function testStripeConnection(stripe) {
  try {
    const account = await stripe.accounts.retrieve();
    console.log('✅ Stripe connection successful');
    console.log(`   Account: ${account.id}`);
    console.log(`   Type: ${account.type}`);
    return true;
  } catch (error) {
    console.error('❌ Stripe connection failed:', error.message);
    return false;
  }
}

// Create Vendor Pro subscription product and price
async function createVendorProProduct(stripe) {
  console.log('\n📦 Creating Vendor Pro subscription product...');
  
  try {
    // Check if product already exists
    const existingProducts = await stripe.products.list({
      limit: 100,
      active: true
    });
    
    const existingProduct = existingProducts.data.find(p => 
      p.name === 'Suburbmates Vendor Pro' || p.nickname === 'vendor_pro'
    );
    
    if (existingProduct) {
      console.log(`   Found existing product: ${existingProduct.id}`);
      
      // Check for existing price
      const existingPrices = await stripe.prices.list({
        product: existingProduct.id,
        limit: 10
      });
      
      const existingPrice = existingPrices.data.find(p => 
        p.recurring?.interval === 'month' && p.unit_amount === 2000
      );
      
      if (existingPrice) {
        console.log(`   Found existing price: ${existingPrice.id}`);
        return {
          productId: existingProduct.id,
          priceId: existingPrice.id
        };
      }
    }
    
    // Create product if it doesn't exist
    const product = await stripe.products.create({
      name: 'Suburbmates Vendor Pro',
      description: 'Monthly subscription for Pro vendor tier with reduced commission',
      nickname: 'vendor_pro',
      shippable: false,
      unit_label: 'month'
    });
    
    console.log(`   Created product: ${product.id}`);
    
    // Create monthly price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 2000, // A$20.00 in cents
      currency: 'aud',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      nickname: 'vendor_pro_monthly'
    });
    
    console.log(`   Created price: ${price.id}`);
    
    return {
      productId: product.id,
      priceId: price.id
    };
    
  } catch (error) {
    console.error('❌ Failed to create Vendor Pro product:', error.message);
    throw error;
  }
}

// Create Featured Business product and price
async function createFeaturedProduct(stripe) {
  console.log('\n🌟 Creating Featured Business product...');
  
  try {
    // Check if product already exists
    const existingProducts = await stripe.products.list({
      limit: 100,
      active: true
    });
    
    const existingProduct = existingProducts.data.find(p => 
      p.name === 'Suburbmates Featured Business – 30 days' || p.nickname === 'featured_30d'
    );
    
    if (existingProduct) {
      console.log(`   Found existing product: ${existingProduct.id}`);
      
      // Check for existing price
      const existingPrices = await stripe.prices.list({
        product: existingProduct.id,
        limit: 10
      });
      
      const existingPrice = existingPrices.data.find(p => 
        !p.recurring && p.unit_amount === 2000
      );
      
      if (existingPrice) {
        console.log(`   Found existing price: ${existingPrice.id}`);
        return {
          productId: existingProduct.id,
          priceId: existingPrice.id
        };
      }
    }
    
    // Create product if it doesn't exist
    const product = await stripe.products.create({
      name: 'Suburbmates Featured Business – 30 days',
      description: 'One-time payment for 30 days of featured placement in marketplace',
      nickname: 'featured_30d',
      shippable: false
    });
    
    console.log(`   Created product: ${product.id}`);
    
    // Create one-time price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 2000, // A$20.00 in cents
      currency: 'aud',
      nickname: 'featured_30d_onetime'
    });
    
    console.log(`   Created price: ${price.id}`);
    
    return {
      productId: product.id,
      priceId: price.id
    };
    
  } catch (error) {
    console.error('❌ Failed to create Featured product:', error.message);
    throw error;
  }
}

// Generate environment variable output
function generateEnvOutput(vendorPro, featured) {
  const envOutput = `
# === SUBURBMATES V1.1 STRIPE CONFIGURATION ===
# Generated on: ${new Date().toISOString()}

# Stripe Connect (CRITICAL - Must be obtained from Stripe Dashboard)
# Go to: Stripe Dashboard → Developers → Settings → Connect
# Register OAuth redirect URLs:
#   Dev:    http://localhost:3000/vendor/connect/callback
#   Prod:   https://yourdomain.com/vendor/connect/callback
# STRIPE_CLIENT_ID=ca_your_stripe_connect_client_id_here

# Stripe Products & Prices (created automatically)
STRIPE_PRODUCT_VENDOR_PRO=${vendorPro.productId}
STRIPE_PRICE_VENDOR_PRO_MONTH=${vendorPro.priceId}

STRIPE_PRODUCT_FEATURED_30D=${featured.productId}
STRIPE_PRICE_FEATURED_30D=${featured.priceId}

# Legacy variables (update your code to use new naming above)
# STRIPE_PRODUCT_PRO=${vendorPro.productId}
# STRIPE_PRICE_PRO_MONTH=${vendorPro.priceId}
`;

  return envOutput;
}

// Generate setup instructions
function generateSetupInstructions() {
  const instructions = `
# === SETUP INSTRUCTIONS ===

## 1. Stripe Connect Configuration (Manual Step)
1. Go to Stripe Dashboard: https://dashboard.stripe.com/
2. Navigate to: Developers → Settings → Connect
3. Enable "Standard" Connect account type
4. Add OAuth redirect URLs:
   - Development: http://localhost:3000/vendor/connect/callback
   - Production: https://yourdomain.com/vendor/connect/callback
5. Copy the "Client ID" and add it to your .env.local as STRIPE_CLIENT_ID

## 2. Update Environment Variables
Add the generated Stripe configuration to your .env.local file.

## 3. Update Application Code
Update your application to use the new environment variables:
- Replace any references to old pricing variables
- Implement Stripe Connect OAuth flow using STRIPE_CLIENT_ID
- Use the new product/price IDs for checkout

## 4. Test the Setup
1. Start your development server: npm run dev
2. Test the checkout flow with the new products
3. Test vendor onboarding with Stripe Connect

## 5. Deploy to Production
1. Create products in your Stripe production account
2. Update environment variables in your production deployment
3. Test the full flow in production environment

# === NEXT STEPS ===
After completing this setup:
1. Run the schema migration: npx supabase db push
2. Update RLS policies for new schema
3. Implement Stripe Connect OAuth flow
4. Test the complete vendor onboarding flow
`;

  return instructions;
}

// Main execution
async function main() {
  console.log('🚀 Suburbmates V1.1 Stripe Setup\n');
  
  // Check environment
  checkEnvironment();
  
  // Create Stripe client
  const stripe = createStripeClient();
  
  // Test connection
  const connectionOk = await testStripeConnection(stripe);
  if (!connectionOk) {
    process.exit(1);
  }
  
  // Create products and prices
  let vendorPro, featured;
  
  try {
    vendorPro = await createVendorProProduct(stripe);
    featured = await createFeaturedProduct(stripe);
  } catch (error) {
    console.error('\n❌ Setup failed. Please check your Stripe configuration and try again.');
    process.exit(1);
  }
  
  // Generate output
  const envOutput = generateEnvOutput(vendorPro, featured);
  const instructions = generateSetupInstructions();
  
  // Write to files
  const envOutputPath = '.env.stripe-output';
  const instructionsPath = 'SETUP_STRIPE_INSTRUCTIONS.md';
  
  require('fs').writeFileSync(envOutputPath, envOutput);
  require('fs').writeFileSync(instructionsPath, instructions);
  
  console.log('\n✅ Stripe setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log(`1. Add Stripe Connect Client ID to .env.local`);
  console.log(`2. Copy configuration from: ${envOutputPath}`);
  console.log(`3. Follow setup instructions: ${instructionsPath}`);
  console.log(`4. Test the configuration before proceeding`);
  
  console.log('\n🔧 Generated product IDs:');
  console.log(`   Vendor Pro Product: ${vendorPro.productId}`);
  console.log(`   Vendor Pro Price: ${vendorPro.priceId}`);
  console.log(`   Featured Product: ${featured.productId}`);
  console.log(`   Featured Price: ${featured.priceId}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  checkEnvironment,
  createStripeClient,
  createVendorProProduct,
  createFeaturedProduct
};