-- Suburbmates V1.1 Row Level Security (RLS) Policies
-- Based on v1.1-docs/03_ARCHITECTURE/03.0_TECHNICAL_OVERVIEW.md security requirements

-- Enable RLS on all tables
ALTER TABLE lgas ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_log ENABLE ROW LEVEL SECURITY;

-- LGAs table - Public read access (no write access needed)
CREATE POLICY "LGA public read" ON lgas
FOR SELECT USING (active = true);

CREATE POLICY "Admin can manage LGAs" ON lgas
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Categories table - Public read access
CREATE POLICY "Categories public read" ON categories
FOR SELECT USING (active = true);

CREATE POLICY "Admin can manage categories" ON categories
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Users table - Users can only see their own data
CREATE POLICY "Users own data" ON users
FOR ALL USING (id = auth.uid());

CREATE POLICY "Admin can read all users" ON users
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u2
        WHERE u2.id = auth.uid() 
        AND u2.user_type = 'admin'
    )
);

-- Vendors table - Users can only see their own vendor data, customers can see public vendor info
CREATE POLICY "Vendors own data" ON vendors
FOR ALL USING (
    user_id = auth.uid()
);

CREATE POLICY "Public can read active vendor profiles" ON vendors
FOR SELECT USING (
    tier IN ('basic', 'pro') 
    AND vendor_status = 'active'
);

CREATE POLICY "Admin can manage all vendors" ON vendors
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Products table - Vendors can manage their own products, customers can see published products
CREATE POLICY "Vendors own products" ON products
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM vendors 
        WHERE vendors.id = vendor_id 
        AND vendors.user_id = auth.uid()
    )
);

CREATE POLICY "Public can read published products" ON products
FOR SELECT USING (
    published = true 
    AND EXISTS (
        SELECT 1 FROM vendors 
        WHERE vendors.id = products.vendor_id 
        AND vendors.tier IN ('basic', 'pro')
        AND vendors.vendor_status = 'active'
    )
);

CREATE POLICY "Admin can manage all products" ON products
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Featured Slots table - Vendors can see their own slots, public can see active slots
CREATE POLICY "Vendors own featured slots" ON featured_slots
FOR ALL USING (
    vendor_id IN (
        SELECT id FROM vendors WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Public can read active featured slots" ON featured_slots
FOR SELECT USING (
    status = 'active'
    AND EXISTS (
        SELECT 1 FROM vendors 
        WHERE vendors.id = featured_slots.vendor_id 
        AND vendors.tier IN ('basic', 'pro')
        AND vendors.vendor_status = 'active'
    )
);

CREATE POLICY "Admin can manage all featured slots" ON featured_slots
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Featured Queue table - Vendors can manage their own queue position
CREATE POLICY "Vendors own queue position" ON featured_queue
FOR ALL USING (
    vendor_id IN (
        SELECT id FROM vendors WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Public can read queue positions" ON featured_queue
FOR SELECT USING (
    status = 'waiting'
    AND EXISTS (
        SELECT 1 FROM vendors 
        WHERE vendors.id = featured_queue.vendor_id 
        AND vendors.tier IN ('basic', 'pro')
        AND vendors.vendor_status = 'active'
    )
);

CREATE POLICY "Admin can manage all queue positions" ON featured_queue
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Orders table - Customers can see their orders, vendors can see their sales
CREATE POLICY "Customers own orders" ON orders
FOR ALL USING (
    customer_id = auth.uid()
);

CREATE POLICY "Vendors own sales" ON orders
FOR SELECT USING (
    vendor_id IN (
        SELECT id FROM vendors WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admin can manage all orders" ON orders
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Refund Requests table - Customers can manage their refund requests, vendors can see requests for their orders
CREATE POLICY "Customers own refund requests" ON refund_requests
FOR ALL USING (
    customer_id = auth.uid()
);

CREATE POLICY "Vendors can manage refund requests for their orders" ON refund_requests
FOR ALL USING (
    vendor_id IN (
        SELECT id FROM vendors WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admin can manage all refund requests" ON refund_requests
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Disputes table - Only admins and involved parties can see disputes
CREATE POLICY "Dispute parties can access" ON disputes
FOR ALL USING (
    auth.uid() IN (customer_id, vendor_id, admin_id)
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

CREATE POLICY "Admin can manage all disputes" ON disputes
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Transactions Log table - Vendors can see their transactions, admins can see all
CREATE POLICY "Vendors own transactions" ON transactions_log
FOR SELECT USING (
    vendor_id IN (
        SELECT id FROM vendors WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admin can see all transactions" ON transactions_log
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.user_type = 'admin'
    )
);

-- Functions for RLS policies that need vendor status checks
CREATE OR REPLACE FUNCTION get_vendor_status(vendor_uuid UUID)
RETURNS VARCHAR AS $$
BEGIN
    RETURN (
        SELECT vendor_status FROM vendors WHERE id = vendor_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_vendor_tier(vendor_uuid UUID)
RETURNS VARCHAR AS $$
BEGIN
    RETURN (
        SELECT tier FROM vendors WHERE id = vendor_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes to support RLS policies
CREATE INDEX idx_vendors_user_id_rls ON vendors(user_id);
CREATE INDEX idx_products_vendor_published ON products(vendor_id, published);
CREATE INDEX idx_orders_customer_vendor ON orders(customer_id, vendor_id);
CREATE INDEX idx_refund_requests_customer_vendor ON refund_requests(customer_id, vendor_id);
CREATE INDEX idx_disputes_parties ON disputes(customer_id, vendor_id, admin_id);

-- Enable real-time subscriptions for authenticated users only
ALTER PUBLICATION supabase_realtime ADD TABLE vendors, products, featured_slots, orders;