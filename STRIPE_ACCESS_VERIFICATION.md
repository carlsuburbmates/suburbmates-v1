# Stripe Access Verification Plan

**Purpose:** Verify and establish complete Stripe access before implementation
**Status:** Critical Path Blocker

---

## 🚨 Current Issues Identified

### 1. Missing Critical Configuration
- `STRIPE_CLIENT_ID` - Only placeholder: `"ca_..."`
- `STRIPE_PRODUCT_VENDOR_PRO` - Placeholder: `"prod_..."`
- `STRIPE_PRICE_VENDOR_PRO_MONTH` - Placeholder: `"price_..."`
- `STRIPE_PRODUCT_FEATURED_30D` - Placeholder: `"prod_..."`
- `STRIPE_PRICE_FEATURED_30D` - Placeholder: `"price_..."`

### 2. Environment Configuration
- Using **LIVE** Stripe keys (`sk_live_...`)
- No test environment setup
- Missing validation of current account permissions

### 3. Connect Standard Setup
- Stripe Connect not configured in dashboard
- OAuth redirect URLs not registered
- Standard Connect account type not verified

---

## ✅ Verification Checklist

### Phase 1: Account Access Verification
- [ ] Test API connectivity with current live credentials
- [ ] Verify account has required permissions for Connect Standard
- [ ] Confirm account is in good standing (no restrictions)
- [ ] Check if account supports Standard Connect

### Phase 2: Dashboard Configuration
- [ ] Access Stripe Dashboard: https://dashboard.stripe.com/
- [ ] Verify account type and permissions
- [ ] Enable Stripe Connect Standard
- [ ] Register OAuth redirect URLs:
  - Development: `http://localhost:3000/vendor/connect/callback`
  - Production: `https://yourdomain.com/vendor/connect/callback`
- [ ] Obtain `STRIPE_CLIENT_ID` from Connect settings

### Phase 3: Products & Prices Setup
- [ ] Create "Suburbmates Vendor Pro" product
- [ ] Create A$20/month recurring price
- [ ] Create "Suburbmates Featured Business – 30 days" product
- [ ] Create A$20 one-time price
- [ ] Copy actual IDs to environment variables

### Phase 4: Webhook Configuration
- [ ] Test webhook endpoint: `/api/webhooks/stripe`
- [ ] Configure webhook events:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `charge.refunded`
  - `charge.dispute.*`
  - `customer.subscription.*`
- [ ] Verify webhook secret matches `.env.local`

### Phase 5: Environment Validation
- [ ] Test all Stripe environment variables
- [ ] Verify API client initialization
- [ ] Test basic Stripe operations
- [ ] Confirm webhook signature verification

---

## 🔧 Verification Scripts

### Script 1: API Connectivity Test
```bash
# Test basic Stripe API access
node -e "
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover'
});

stripe.accounts.retrieve()
  .then(account => console.log('✅ Stripe API Access:', account.id))
  .catch(err => console.error('❌ Stripe API Error:', err.message));
" < .env.local
```

### Script 2: Connect Configuration Check
```bash
# Check Connect setup
node -e "
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover'
});

stripe.accounts.list({ limit: 1 })
  .then(accounts => {
    console.log('✅ Connect Access Available');
    console.log('Account ID:', accounts.data[0]?.id);
  })
  .catch(err => {
    if (err.code === 'account_not_connected') {
      console.log('⚠️ Connect not configured');
    } else {
      console.error('❌ Connect Error:', err.message);
    }
  });
" < .env.local
```

### Script 3: Product/Price Validation
```bash
# Verify products exist
node -e "
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover'
});

const checkProduct = async (productId, name) => {
  try {
    const product = await stripe.products.retrieve(productId);
    console.log('✅', name, 'exists:', product.id);
  } catch (err) {
    console.log('❌', name, 'missing:', productId);
  }
};

// Test with placeholder IDs - will show what's missing
checkProduct('prod_placeholder', 'Vendor Pro');
checkProduct('prod_placeholder_2', 'Featured Business');
" < .env.local
```

---

## 📊 Implementation Readiness Matrix

| Component | Status | Action Required | Priority |
|-----------|--------|-----------------|----------|
| API Access | ❓ Unknown | Test connectivity | HIGH |
| Connect Setup | ❌ Missing | Configure in Dashboard | HIGH |
| Products/Prices | ❌ Missing | Create in Dashboard | HIGH |
| Webhooks | ⚠️ Partial | Test and configure | MEDIUM |
| Environment | ⚠️ Partial | Validate all vars | MEDIUM |
| OAuth Flow | ❌ Blocked | Requires Client ID | HIGH |

---

## 🎯 Next Steps (Sequential)

### Step 1: Immediate Verification (15 minutes)
1. Run API connectivity test
2. Check current account status
3. Verify basic Stripe operations work

### Step 2: Dashboard Setup (30 minutes)
1. Access Stripe Dashboard
2. Enable Connect Standard
3. Register OAuth redirect URLs
4. Obtain Client ID

### Step 3: Product Creation (15 minutes)
1. Create Vendor Pro product + price
2. Create Featured Business product + price
3. Update environment variables

### Step 4: Configuration Testing (30 minutes)
1. Test webhook endpoints
2. Validate all environment variables
3. Run integration tests

### Step 5: Implementation Readiness (15 minutes)
1. Verify all components work together
2. Document any remaining issues
3. Confirm implementation can proceed

---

## ⚠️ Blockers to True Implementation

**CRITICAL:** Without resolving these, implementation cannot proceed:

1. **Stripe Connect Client ID** - OAuth flow impossible without this
2. **Valid Product/Price IDs** - Checkout will fail with placeholder IDs
3. **Connect Standard Configuration** - Vendor onboarding blocked
4. **API Access Verification** - Cannot proceed without confirmed access

---

## 📞 Escalation Path

If issues are found during verification:

### Technical Issues
1. API connectivity problems → Check network, credentials, account status
2. Permission errors → Contact Stripe support, verify account type
3. Configuration errors → Review Stripe documentation, test in sandbox

### Account Issues
1. Account restrictions → Verify business verification, compliance
2. Connect not available → Check country support, business type eligibility
3. Missing features → Upgrade account, contact Stripe sales

### Implementation Delays
1. Dashboard access issues → Coordinate with account owner
2. Configuration complexity → Consider using Stripe test mode first
3. Product setup confusion → Follow Stripe product creation guide

---

**Status:** Ready for verification execution
**Timeline:** 1.5-2 hours for complete verification
**Dependencies:** Stripe Dashboard access, account permissions