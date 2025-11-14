# Suburbmates V1.1 - Setup Checklist

**Version:** 1.1  
**Date:** November 13, 2025  
**Status:** Active

---

## 📋 Table of Contents

1. [Pre-Setup Requirements](#pre-setup-requirements)
2. [Development Environment Setup](#development-environment-setup)
3. [Service Configuration](#service-configuration)
4. [Database Setup](#database-setup)
5. [Application Configuration](#application-configuration)
6. [Testing Setup](#testing-setup)
7. [Deployment Preparation](#deployment-preparation)
8. [Team Onboarding](#team-onboarding)

---

## ✅ Pre-Setup Requirements

### System Requirements Check
- [ ] **Operating System:** macOS 12+, Windows 10+, or Linux Ubuntu 20.04+
- [ ] **CPU:** 4+ cores (8+ recommended)
- [ ] **RAM:** 8GB+ (16GB recommended)
- [ ] **Storage:** 256GB+ SSD (512GB recommended)
- [ ] **Internet Connection:** Stable broadband connection

### Software Requirements Check
- [ ] **Node.js:** Version 20.19.2+ installed
- [ ] **npm:** Version 10.8.0+ (included with Node.js)
- [ ] **Git:** Version 2.30+ installed
- [ ] **Code Editor:** VS Code with required extensions
- [ ] **Terminal:** Modern terminal (iTerm2, Windows Terminal, etc.)

### Account Requirements Check
- [ ] **GitHub/GitLab:** Account for version control
- [ ] **Supabase:** Account for database and auth
- [ ] **Stripe:** Account for payments (with Connect enabled)
- [ ] **Email Service:** Resend, SendGrid, or similar account
- [ ] **Domain Registrar:** Account for production domain

---

## 🛠️ Development Environment Setup

### 1. Project Repository Setup
```bash
# Clone the repository
git clone <repository-url>
cd suburbmates-v1

# Verify project structure
ls -la
# Should show: src/, v1.1-docs/, package.json, etc.
```

**Verification Steps:**
- [ ] Repository cloned successfully
- [ ] Project structure matches documentation
- [ ] All required files are present

### 2. Dependencies Installation
```bash
# Install npm dependencies
npm install

# Verify installation
npm run lint -- --help
```

**Verification Steps:**
- [ ] All dependencies installed without errors
- [ ] No npm warnings or critical vulnerabilities
- [ ] ESLint is working properly

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
code .env.local  # or use your preferred editor
```

**Required Environment Variables:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `NEXTAUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` - Application URL (e.g., `http://localhost:3000`)

### 4. IDE Configuration
**VS Code Extensions Required:**
- [ ] ESLint
- [ ] Prettier
- [ ] TypeScript Importer
- [ ] Supabase extension
- [ ] Thunder Client (for API testing)
- [ ] GitLens

**Workspace Settings:**
- [ ] Format on save enabled
- [ ] ESLint auto-fix on save enabled
- [ ] TypeScript strict mode working
- [ ] Path aliases configured (`@/*` → `./src/*`)

### 5. Initial Development Server Test
```bash
# Start development server
npm run dev

# Verify in browser
# Visit: http://localhost:3000
```

**Verification Steps:**
- [ ] Development server starts without errors
- [ ] Application loads in browser
- [ ] No TypeScript compilation errors
- [ ] No ESLint errors in console
- [ ] Hot reload working

---

## 🔌 Service Configuration

### 1. Supabase Setup
**Create Supabase Project:**
- [ ] Visit [Supabase Dashboard](https://supabase.com)
- [ ] Create new project
- [ ] Note project URL and keys
- [ ] Configure authentication settings
- [ ] Set up database schema (migrations)

**Supabase Configuration:**
- [ ] Project URL configured in `.env.local`
- [ ] Anonymous key added to client variables
- [ ] Service role key added to server variables
- [ ] Authentication providers configured
- [ ] Storage buckets created (if needed)
- [ ] RLS policies planned

### 2. Stripe Setup
**Create Stripe Account:**
- [ ] Sign up at [Stripe](https://stripe.com)
- [ ] Enable Stripe Connect (Standard)
- [ ] Verify business details
- [ ] Get API keys from dashboard

**Stripe Configuration:**
- [ ] Test mode keys configured for development
- [ ] Live mode keys ready for production
- [ ] Webhook endpoints configured
- [ ] Products and prices created in dashboard
- [ ] OAuth client ID configured for Connect
- [ ] Webhook secret added to environment variables

**Required Stripe Products/Prices:**
- [ ] `STRIPE_PRODUCT_VENDOR_PRO` - Pro vendor subscription
- [ ] `STRIPE_PRICE_VENDOR_PRO_MONTH` - Monthly price for Pro tier
- [ ] `STRIPE_PRODUCT_FEATURED_30D` - Featured listing product
- [ ] `STRIPE_PRICE_FEATURED_30D` - One-time price for featured listing

### 3. Email Service Setup
**Choose Email Provider:**
- [ ] Resend (recommended)
- [ ] SendGrid
- [ ] AWS SES
- [ ] Other transactional email service

**Email Configuration:**
- [ ] API key obtained and configured
- [ ] From email address verified
- [ ] Template system set up (if needed)
- [ ] Test email sending functionality

### 4. Additional Services (Optional)
**Monitoring Services:**
- [ ] Sentry account for error tracking
- [ ] PostHog account for analytics
- [ ] Uptime monitoring service

**Development Tools:**
- [ ] GitHub repository with proper permissions
- [ ] CI/CD pipeline configured (GitHub Actions)
- [ ] Code quality tools (SonarQube, etc.)

---

## 🗄️ Database Setup

### 1. Initial Schema Setup
```bash
# Apply database migrations
npx supabase db push

# Or run migrations manually
# Visit Supabase SQL editor and run migration scripts
```

**Required Tables:**
- [ ] `users` - User accounts
- [ ] `vendor_profiles` - Vendor-specific information
- [ ] `business_listings` - Directory listings
- [ ] `products` - Marketplace products
- [ ] `orders` - Order transactions
- [ ] `refunds` - Refund requests
- [ ] `disputes` - Dispute resolution
- [ ] `notifications` - User notifications

### 2. RLS Policies Configuration
**Security Policies:**
- [ ] Row Level Security enabled on all tables
- [ ] User access policies configured
- [ ] Vendor access policies configured
- [ ] Admin access policies configured
- [ ] Public read access configured for listings

### 3. Indexes and Performance
**Database Optimization:**
- [ ] Primary keys on all tables
- [ ] Unique constraints where required
- [ ] Performance indexes on frequently queried columns
- [ ] Foreign key relationships established
- [ ] Cascading deletes configured appropriately

### 4. Test Data
**Seed Data (Optional):**
- [ ] Sample users created for testing
- [ ] Sample vendor profiles created
- [ ] Sample products and listings added
- [ ] Test orders created for checkout testing

---

## ⚙️ Application Configuration

### 1. Authentication Setup
**NextAuth Configuration:**
- [ ] Authentication providers configured
- [ ] Session management working
- [ ] Protected routes working
- [ ] User role management implemented
- [ ] Email verification configured

### 2. Frontend Configuration
**TypeScript Configuration:**
- [ ] Strict mode enabled
- [ ] Path aliases working
- [ ] Type definitions created
- [ ] No TypeScript errors

**Styling Configuration:**
- [ ] Tailwind CSS working
- [ ] Custom theme configured
- [ ] Component styles applied
- [ ] Responsive design working

### 3. API Configuration
**API Routes:**
- [ ] Authentication endpoints working
- [ ] Business listing endpoints working
- [ ] Product endpoints working
- [ ] Order/checkout endpoints working
- [ ] Webhook endpoints configured

**API Security:**
- [ ] CORS configured
- [ ] Rate limiting implemented
- [ ] Input validation working
- [ ] Error handling implemented

### 4. Environment-Specific Configuration
**Development Environment:**
- [ ] Debug logging enabled
- [ ] Hot reload working
- [ ] Source maps enabled
- [ ] Test data available

**Production Environment:**
- [ ] Debug logging disabled
- [ ] Optimizations enabled
- [ ] Security headers configured
- [ ] SSL enforcement

---

## 🧪 Testing Setup

### 1. Testing Framework Setup
```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Configure test scripts
# Add to package.json:
# "test": "jest",
# "test:watch": "jest --watch",
# "test:coverage": "jest --coverage"
```

**Testing Configuration:**
- [ ] Jest configured for React/Next.js
- [ ] Testing library installed
- [ ] Test scripts added to package.json
- [ ] Mock functions configured
- [ ] Test coverage thresholds set

### 2. Unit Tests
**Core Components:**
- [ ] Authentication components tested
- [ ] Business listing components tested
- [ ] Product components tested
- [ ] Utility functions tested
- [ ] API route handlers tested

### 3. Integration Tests
**API Integration:**
- [ ] Authentication flow tested
- [ ] Business CRUD operations tested
- [ ] Product operations tested
- [ ] Order processing tested
- [ ] Payment integration tested

### 4. End-to-End Tests
**User Journeys:**
- [ ] User registration flow tested
- [ ] Vendor onboarding flow tested
- [ ] Product purchase flow tested
- [ ] Refund request flow tested
- [ ] Admin workflows tested

### 5. Performance Tests
**Load Testing:**
- [ ] Critical pages load tested
- [ ] API endpoints performance tested
- [ ] Database query performance tested
- [ ] Image loading optimized

---

## 🚀 Deployment Preparation

### 1. Production Environment Setup
**Vercel Configuration:**
- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] Build settings configured
- [ ] Custom domain configured
- [ ] SSL certificates configured

**Alternative Platforms:**
- [ ] Netlify configuration (if using)
- [ ] AWS Amplify configuration (if using)
- [ ] Docker configuration (if containerizing)

### 2. Production Database Setup
**Supabase Production:**
- [ ] Production project created
- [ ] Database schema applied
- [ ] Production data migration planned
- [ ] Backup procedures configured
- [ ] Monitoring set up

### 3. Production Services Configuration
**Stripe Production:**
- [ ] Live mode API keys configured
- [ ] Production webhook endpoints configured
- [ ] OAuth redirect URIs updated
- [ ] Payment methods configured

**Email Production:**
- [ ] Production email service configured
- [ ] Email templates finalized
- [ ] Sending limits verified
- [ ] Bounce handling configured

### 4. Monitoring and Observability
**Error Tracking:**
- [ ] Sentry configured for production
- [ ] Error notifications set up
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured

**Analytics:**
- [ ] Google Analytics configured
- [ ] User behavior tracking enabled
- [ ] Conversion tracking set up
- [ ] Privacy compliance verified

### 5. Security Hardening
**Security Audit:**
- [ ] SSL/TLS configuration verified
- [ ] Security headers configured
- [ ] Input validation comprehensive
- [ ] Authentication security verified
- [ ] Rate limiting configured
- [ ] CORS policies verified

---

## 👥 Team Onboarding

### 1. Developer Setup Guide
**For New Team Members:**
- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Copy `.env.example` to `.env.local`
- [ ] Configure development environment variables
- [ ] Start development server (`npm run dev`)
- [ ] Verify application loads correctly

### 2. Code Standards and Guidelines
**Development Standards:**
- [ ] TypeScript strict mode enforced
- [ ] ESLint rules followed
- [ ] Prettier formatting applied
- [ ] Git commit message conventions followed
- [ ] Code review process understood
- [ ] Branch naming conventions followed

### 3. Development Workflow
**Git Workflow:**
- [ ] Feature branch creation process
- [ ] Commit message format (`type(scope): description`)
- [ ] Pull request creation and review process
- [ ] Merge and deployment process
- [ ] Release tagging process

**Development Process:**
- [ ] Daily standup participation
- [ ] Sprint planning attendance
- [ ] Code review participation
- [ ] Testing requirements understanding
- [ ] Documentation update responsibility

### 4. Communication and Collaboration
**Team Communication:**
- [ ] Slack/Discord channel access
- [ ] Project management tool access (Jira, Trello, etc.)
- [ ] Code repository access and permissions
- [ ] Documentation access and editing rights
- [ ] Meeting schedule understanding

---

## 📊 Verification Checklist

### Pre-Development Verification
- [ ] All environment variables configured
- [ ] Development server starts without errors
- [ ] Database connection working
- [ ] Authentication system functional
- [ ] Stripe integration working
- [ ] Email system configured

### Pre-Testing Verification
- [ ] Test environment configured
- [ ] Test data available
- [ ] Test scripts working
- [ ] Coverage reporting functional
- [ ] CI/CD pipeline configured

### Pre-Deployment Verification
- [ ] Production environment configured
- [ ] All environment variables set
- [ ] Database migrations ready
- [ ] Monitoring configured
- [ ] Backup procedures in place
- [ ] Rollback procedures documented

### Launch Readiness Verification
- [ ] All features implemented and tested
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Support procedures established
- [ ] Team training completed

---

## 🆘 Troubleshooting

### Common Setup Issues

**Environment Variables Not Loading:**
```bash
# Check if .env.local exists
ls -la | grep .env

# Restart development server
# Environment variables are loaded at startup
```

**Database Connection Issues:**
```bash
# Test Supabase connection
npx supabase status

# Check if migrations are applied
npx supabase db diff
```

**Stripe Webhook Issues:**
- Verify webhook secret matches
- Check webhook endpoint URL
- Test with Stripe CLI: `stripe trigger payment_intent.created`

**Authentication Issues:**
- Verify `NEXTAUTH_SECRET` is properly set
- Check `NEXTAUTH_URL` matches actual URL
- Clear browser cookies and try again

### Getting Help
**Documentation:**
- [Architecture Guide](v1.1-docs/03_ARCHITECTURE/)
- [API Documentation](v1.1-docs/04_API/)
- [Development Notes](v1.1-docs/DEV_NOTES/)

**Support Channels:**
- Team chat for immediate questions
- GitHub issues for bugs
- Documentation for reference
- External support (Supabase, Stripe) for service issues

---

## 📝 Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-13 | Initial setup checklist created | Development Team |
| 1.1 | TBD | Updates based on implementation experience | Team |

---

**Document Status:** Active - Regular updates during implementation  
**Next Review:** After initial setup completion  
**Owner:** Development Team  
**Approver:** Technical Lead

---

*This checklist ensures consistent setup across all development environments and provides a comprehensive guide for team members joining the project.*