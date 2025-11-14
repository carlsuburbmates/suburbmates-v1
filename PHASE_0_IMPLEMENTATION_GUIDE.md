# Suburbmates V1.1 - Phase 0 Implementation Guide

**Version:** 1.1  
**Date:** November 13, 2025  
**Status:** Ready for Implementation

---

## 🎯 Phase 0 Objectives

Phase 0 focuses on **critical gaps only** that block Phase 1 implementation:

1. **Stripe Connect Configuration** - Enable vendor onboarding as Merchant of Record
2. **Fixed Pricing Setup** - Create A$20/month Vendor Pro and A$20/30-day Featured products
3. **Schema Alignment** - Prepare database for V1.1 directory-marketplace hybrid architecture

**What Phase 0 is NOT:** Setting up all possible services (Resend, Sentry, PostHog, Claude, ABR) - these belong in later phases.

---

## 📋 Phase 0 Checklist

### ✅ Completed Tasks
- [x] Environment variables template updated with Stripe Connect config
- [x] Schema validation script created (`scripts/validate-schema.js`)
- [x] Migration script generated (`supabase/migrations/003_v11_schema_alignment.sql`)
- [x] Stripe setup script created (`scripts/setup-stripe.js`)
- [x] Stripe Connect OAuth flow stubs implemented
- [x] Implementation plan updated to focus on critical gaps

### 🔄 Implementation Steps

#### Step 1: Stripe Configuration Setup

**1.1 Run Stripe Setup Script**
```bash
# Ensure STRIPE_SECRET_KEY is set in .env.local
node scripts/setup-stripe.js
```

**Expected Output:**
```
✅ Stripe setup completed successfully!
📋 Generated product IDs:
   Vendor Pro Product: prod_xxxxxxxxxxxxx
   Vendor Pro Price: price_xxxxxxxxxxxxx
   Featured Product: prod_xxxxxxxxxxxxx
   Featured Price: price_xxxxxxxxxxxxx
```

**1.2 Add Stripe Connect Client ID**
- Go to [Stripe Dashboard](https://dashboard.stripe.com/connect/settings)
- Enable "Standard" Connect
- Register OAuth redirect URLs:
  - Development: `http://localhost:3000/vendor/connect/callback`
  - Production: `https://yourdomain.com/vendor/connect/callback`
- Copy Client ID and add to `.env.local`:
```bash
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxx
```

**1.3 Update Environment Variables**
Copy the generated configuration from `.env.stripe-output` to your `.env.local`:
```bash
# Add these to .env.local
STRIPE_PRODUCT_VENDOR_PRO=prod_xxxxxxxxxxxxx
STRIPE_PRICE_VENDOR_PRO_MONTH=price_xxxxxxxxxxxxx
STRIPE_PRODUCT_FEATURED_30D=prod_xxxxxxxxxxxxx
STRIPE_PRICE_FEATURED_30D=price_xxxxxxxxxxxxx
```

#### Step 2: Schema Migration

**2.1 Review Migration Script**
```bash
# Review the generated migration
cat supabase/migrations/003_v11_schema_alignment.sql
```

**Key Changes:**
- Creates `business_profiles` table for directory listings
- Adds missing fields for V1.1 compliance
- Updates user types from `vendor` to `business_owner`
- Adds auto-creation triggers for business profiles

**2.2 Apply Migration**
```bash
# Apply to local Supabase
npx supabase db push

# Verify migration applied
npx supabase db diff --schema-only
```

**2.3 Update RLS Policies**
The existing RLS policies in `supabase/migrations/002_rls_policies.sql` need updates for new schema. Key areas to update:
- Add policies for `business_profiles` table
- Update vendor access controls for new `can_sell_products` field
- Add directory vs marketplace separation in policies

#### Step 3: Test Configuration

**3.1 Test Stripe Integration**
```bash
# Start development server
npm run dev

# Test API endpoints
curl -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Test Business","tier":"basic"}' \
  http://localhost:3000/api/auth/create-vendor
```

**Expected Response:**
```json
{
  "message": "Vendor account created successfully",
  "vendor_id": "uuid",
  "stripe_account_id": "acct_xxxxxxxxxxxxx",
  "onboarding_url": "https://connect.stripe.com/...",
  "requires_payment": false
}
```

**3.2 Test Schema Changes**
```bash
# Test new tables exist
npx supabase sql "SELECT * FROM business_profiles LIMIT 1;"

# Test triggers work
npx supabase sql "INSERT INTO users (id, email, user_type) VALUES (gen_random_uuid(), 'test@example.com', 'business_owner');"
npx supabase sql "SELECT * FROM business_profiles WHERE email = 'test@example.com';"
```

#### Step 4: Vercel Deployment Setup

**4.1 Create Vercel Project**
- Link GitHub repository to Vercel
- Add core environment variables:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  STRIPE_CLIENT_ID
  NEXT_PUBLIC_SITE_URL
  ```

**4.2 Verify Deployment**
- Check that main branch deploys successfully
- Verify environment variables are accessible
- Test that API routes respond correctly

---

## 🔧 API Endpoints Implemented

### Vendor Onboarding Flow
- `POST /api/auth/create-vendor` - Create vendor account and Stripe Connect
- `GET /api/vendor/connect/callback` - Handle Stripe Connect OAuth callback
- `GET /api/vendor/onboarding/status` - Check onboarding status
- `POST /api/vendor/onboarding/start` - Initiate Stripe Connect flow

### Usage Examples

**Create Vendor Account:**
```javascript
fetch('/api/auth/create-vendor', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    business_name: 'My Business',
    tier: 'basic' // or 'pro'
  })
})
```

**Check Onboarding Status:**
```javascript
fetch('/api/vendor/onboarding/status', {
  headers: {
    'Authorization': `Bearer ${supabaseToken}`
  }
})
```

**Start Onboarding:**
```javascript
fetch('/api/vendor/onboarding/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`
  }
})
```

---

## 🚨 Critical Configuration Notes

### Stripe Connect Redirect URLs
**Must be registered in Stripe Dashboard:**
- Development: `http://localhost:3000/vendor/connect/callback`
- Production: `https://yourdomain.com/vendor/connect/callback`

### Environment Variables Priority
**Phase 0 (Critical):**
```bash
# Supabase (✅ Already working)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe (⚠️ Missing CLIENT_ID)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_CLIENT_ID  # CRITICAL - Must add

# Pricing (⚠️ Must create in Stripe)
STRIPE_PRODUCT_VENDOR_PRO
STRIPE_PRICE_VENDOR_PRO_MONTH
STRIPE_PRODUCT_FEATURED_30D
STRIPE_PRICE_FEATURED_30D
```

**Later Phases (Not Phase 0):**
```bash
# Auth/Notifications
RESEND_API_KEY

# Observability & Analytics
SENTRY_DSN
POSTHOG_API_KEY

# AI/Assistant
CLAUDE_API_KEY

# Compliance Extras
ABR_GUID
```

---

## ✅ Success Criteria

Phase 0 is complete when:

### Core Functionality
- [ ] `STRIPE_CLIENT_ID` configured and working
- [ ] Vendor Pro (A$20/month) and Featured (A$20/30 days) products created
- [ ] Schema migration applied successfully
- [ ] `business_profiles` table created with proper relationships
- [ ] Stripe Connect OAuth flow functional
- [ ] Vendor onboarding API endpoints working

### Testing Verification
- [ ] Vendor account creation returns onboarding URL
- [ ] Stripe Connect callback updates vendor status
- [ ] Business profiles auto-created for business owners
- [ ] Directory vs marketplace separation working

### Deployment Readiness
- [ ] Vercel project builds successfully
- [ ] Core environment variables accessible
- [ ] API routes respond correctly in deployed environment

---

## 🔄 Next Steps (Phase 1)

Once Phase 0 is complete:

1. **Authentication Enhancement** - Implement V1.1 user types and auto-creation
2. **Directory Implementation** - Build business profile pages
3. **Marketplace Features** - Implement product creation and marketplace
4. **Payment Integration** - Full checkout and subscription management
5. **Vendor Dashboard** - Complete vendor management interface

---

## 🆘 Troubleshooting

### Common Issues

**Stripe Connect Not Working:**
- Verify `STRIPE_CLIENT_ID` is correct
- Check OAuth redirect URLs match exactly
- Ensure Standard Connect is enabled in Stripe Dashboard

**Schema Migration Errors:**
- Check for existing data conflicts
- Verify Supabase connection
- Review migration script for syntax errors

**API Endpoints 404:**
- Restart development server after file changes
- Check file paths match Next.js App Router conventions
- Verify Supabase auth session

### Debug Commands
```bash
# Test Stripe connection
node -e "const stripe = require('./src/lib/stripe').stripe; stripe.accounts.retrieve().then(a => console.log('Stripe OK:', a.id))"

# Test Supabase connection
npx supabase status

# Check environment variables
grep -E "(STRIPE|NEXT_PUBLIC)" .env.local

# Test API endpoints
curl -I http://localhost:3000/api/vendor/onboarding/status
```

---

## 📞 Support

**For Phase 0 Issues:**
- Check console logs for error details
- Verify all environment variables are set
- Test individual components (Stripe, Supabase, API routes)
- Review migration script output

**Documentation References:**
- [Stripe Connect Standard](https://stripe.com/docs/connect/standard-accounts)
- [Supabase RLS Policies](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js App Router](https://nextjs.org/docs/app)

---

**Phase 0 Status:** Ready for implementation  
**Target Completion:** 2-3 days  
**Dependencies:** None (foundation work only)

---

*This guide covers only the critical Phase 0 implementation. See the main implementation plan for complete project roadmap.*