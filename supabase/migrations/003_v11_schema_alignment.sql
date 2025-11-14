-- Suburbmates V1.1 Schema Migration
-- Generated on: 2025-11-13T17:12:54.598Z

-- Create missing tables
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  profile_description TEXT,
  is_vendor BOOLEAN DEFAULT false,
  vendor_tier VARCHAR(10) DEFAULT 'none',
  vendor_status VARCHAR(20) DEFAULT 'inactive',
  category_id INTEGER REFERENCES categories(id),
  suburb_id INTEGER REFERENCES lgas(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing fields to users
ALTER TABLE users ADD COLUMN created_as_business_owner_at TIMESTAMPTZ;

-- Add missing fields to vendors
ALTER TABLE vendors ADD COLUMN can_sell_products BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN stripe_account_status TEXT DEFAULT 'pending';

-- Add missing fields to products
ALTER TABLE products ADD COLUMN name TEXT NOT NULL;
-- Step 1: Add slug column as nullable and without UNIQUE constraint
ALTER TABLE products ADD COLUMN slug TEXT;

-- Step 2: Populate slug for existing products with unique values
UPDATE products
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || id::text
WHERE slug IS NULL;

-- Step 3: Set slug column as NOT NULL and add UNIQUE constraint
ALTER TABLE products ALTER COLUMN slug SET NOT NULL;
ALTER TABLE products ADD CONSTRAINT products_slug_unique UNIQUE (slug);
ALTER TABLE products ADD COLUMN lga_id INTEGER REFERENCES lgas(id);

-- Update incorrect fields in vendors
-- TODO: Update vendors.stripe_account_id from VARCHAR(255) to TEXT UNIQUE

-- Update incorrect fields in products
-- TODO: Update products.price from DECIMAL(10 to INTEGER NOT NULL

-- Update incorrect fields in orders
-- TODO: Update orders.stripe_payment_intent_id from VARCHAR(255) to TEXT

-- Add auto-creation triggers
CREATE OR REPLACE FUNCTION create_business_profile_for_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_type = 'business_owner' THEN
        INSERT INTO business_profiles (user_id, business_name, slug, created_as_business_owner_at)
        VALUES (NEW.id, 'New Business', 'new-business-' || NEW.id, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_business_profile
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION create_business_profile_for_owner();

-- Add performance indexes
-- Index for business profile lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_slug ON business_profiles(slug);

-- Index for vendor lookups  
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);

-- Index for product filtering
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);
CREATE INDEX IF NOT EXISTS idx_products_lga_id ON products(lga_id);

-- Index for order lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);

