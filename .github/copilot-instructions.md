# Suburbmates V1.1 – Copilot Instructions

**Last Updated:** November 14, 2025  
**Stack:** Next.js 16 / Supabase / Stripe Connect / Vercel  
**Truth Source:** `v1.1-docs/**` (SSOT over all other sources)

---

## Core Architecture

**Suburbmates is a vendor-centric local marketplace** (31 Melbourne LGAs) with two distinct layers:

1. **Directory**: Business discovery (no prices/checkout)
   - Shows vendors with `is_vendor = true` and `vendor_status = 'active'`
   - No checkout flow; links to marketplace
2. **Marketplace**: Product discovery & checkout
   - Only lists products from active vendors
   - Vendors are **Merchant of Record (MoR)** — handle refunds, disputes, product quality
   - Suburbmates deducts commission via Stripe `application_fee_amount`

**Never:** Assume Suburbmates issues refunds, handles disputes, or "sells" products.

---

## Tech Stack (Strict)

| Component  | Technology                                    | Notes                               |
| ---------- | --------------------------------------------- | ----------------------------------- |
| Frontend   | Next.js 16 (App Router, TypeScript strict)    | API routes only (no tRPC)           |
| Database   | Supabase PostgreSQL + RLS policies            | Via `supabase.ts` client            |
| Auth       | Supabase Auth (JWT)                           | Email/password; magic link optional |
| Payments   | Stripe Payments + Stripe Connect **Standard** | Vendors set up Connect accounts     |
| Email      | Resend (via React Email templates)            | Transactional only (no bulk)        |
| Storage    | Supabase Storage                              | For product images, vendor logos    |
| Monitoring | Sentry                                        | Error tracking; no PII logging      |
| Hosting    | Vercel (Next.js native)                       | Auto-scaling, zero manual ops       |

**Forbidden:** tRPC, Drizzle ORM, MySQL, Express, legacy monorepo code.

---

## Key Patterns & Conventions

### 1. API Routes (`src/app/api/`)

- **No tRPC**: Use Next.js App Router API routes directly
- **Pattern**: Each endpoint in `api/[resource]/[action]/route.ts`
- **Auth**: Validate JWT via Supabase client in route handler
- **Example**: `POST /api/auth/signup` → `src/app/api/auth/signup/route.ts`
- **Response format**: Always `NextResponse.json()` with `status` codes

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { data, error } = await supabase.auth.signUp({
      /* ... */
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

### 2. Database Access (`src/lib/supabase.ts`)

- **Client**: Single `supabase` instance (Supabase JS library v2.81+)
- **URL/Key**: From env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **RLS**: All production tables enforce Row-Level Security policies
- **Schema**: `01_initial_schema.sql` + `02_rls_policies.sql` in `supabase/migrations/`

### 3. Type Safety (`src/lib/types.ts`)

- **User**: `id`, `email`, `user_type` ('customer' | 'vendor' | 'admin')
- **Vendor**: `user_id`, `tier` ('none' | 'basic' | 'pro' | 'suspended'), `abn_verified`, `stripe_account_id`, `product_count`
- **Product**: `vendor_id`, `title`, `published` (gate by vendor_status + ABN), `featured_until`
- **Key fields**: `is_vendor`, `vendor_status` ('pending' | 'active' | 'suspended'), `delivery_type` ('pickup' | 'delivery' | 'both')

### 4. Authentication Flow

- **Signup**: `auth.signUp()` → create user record in `users` table → return JWT
- **Login**: `auth.signInWithPassword()` → fetch user + vendor data → return JWT + profile
- **Middleware**: Validate JWT on protected API routes (no session middleware needed for Next.js 16)

### 5. Stripe Integration

- **Commission model**: Vendors set pricing; Suburbmates takes `application_fee_amount` per transaction
- **Vendor account setup**: Stripe Connect **Standard** (onboarding via Stripe dashboard)
- **Webhooks**: Listen for `charge.succeeded`, `customer.subscription.updated` on pro tier upgrades
- **Never**: Process refunds directly; vendors manage via Stripe Connect dashboard

### 6. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLIC_KEY=
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
RESEND_API_KEY=
SENTRY_DSN=
```

---

## Critical Constraints (Non-Negotiable)

### Merchant of Record

- ✅ Vendors control refunds, pricing, product descriptions
- ✅ Vendors liable under Australian Consumer Law
- ✅ Suburbmates collects commission via `application_fee_amount`
- ❌ Never suggest Suburbmates issues refunds
- ❌ Never suggest Suburbmates "sells" products
- ❌ Never process money back to customers

### Directory vs Marketplace

- **Directory**: Business name, bio, LGA, categories, contact (no pricing)
- **Marketplace**: Products with prices, checkout, vendor storefronts
- **Gate**: Only show marketplace to active vendors (`vendor_status = 'active'` + `is_vendor = true`)

### Forbidden Strings (CI Enforcer)

If any of these appear in code → CI fails immediately:

- "platform-issued refund", "Suburbmates issues a refund", "Merchant of Record: Suburbmates"
- "mysql", "drizzle", "trpc", "manus"
- "hard deadline", "launch date", "December 1"

---

## Developer Workflow

### Build & Run

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint (Next.js config)
```

### Database

- **Schema**: `supabase/migrations/` (numbered SQL files)
- **Local**: Use Supabase CLI for local dev (optional)
- **Deployment**: Via Vercel env vars or Supabase dashboard

### Deployment

- **Frontend**: Automatic via Vercel (push to `main`)
- **Database**: Migrations applied via Supabase dashboard or CLI
- **Secrets**: Set in Vercel project settings (env vars)

### Testing & Monitoring

- **Errors**: Sentry dashboard (linked in Vercel)
- **Database queries**: Supabase dashboard (query editor, logs)
- **Email**: Resend dashboard (delivery logs)
- **Payments**: Stripe dashboard (charges, payouts, disputes)

---

## Documentation Hierarchy (Truth Order)

If conflict arises, follow this order **strictly**:

1. **`v1.1-docs/**`\*\* (SSOT — all architecture, design, API specs)
2. **`v1.1-docs/DEV_NOTES/00_BUILD_POLICY.md`** (strict tech choices)
3. **`v1.1-docs/DEV_NOTES/ARCHITECTURAL_GUARDS.md`** (hard constraints)
4. Best practices & external references (advisory only)

Never reverse this order.

---

## When You're Stuck

1. **Architecture questions**: Read `v1.1-docs/03_ARCHITECTURE/03.0_TECHNICAL_OVERVIEW.md`
2. **API design**: Check `v1.1-docs/04_API/04.0_COMPLETE_SPECIFICATION.md`
3. **Schema questions**: See `v1.1-docs/03_ARCHITECTURE/03.3_SCHEMA_REFERENCE.md`
4. **Payment/MoR logic**: Review `v1.1-docs/DEV_NOTES/ARCHITECTURAL_GUARDS.md`
5. **Quick ref**: `v1.1-docs/DEV_NOTES/DEVELOPER_CHEAT_SHEET.md`

---

## Commit & PR Standards

- **Branch naming**: `feat/`, `fix/`, `docs/` prefix
- **Messages**: Clear, referencing which component changed (e.g., "feat: add vendor signup API")
- **Forbidden strings**: CI will reject if commit contains forbidden terms
- **PR review**: Ensure no directory/marketplace boundary violations, correct MoR model
