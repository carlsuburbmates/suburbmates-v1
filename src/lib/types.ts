// User Types
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type: "customer" | "vendor" | "admin";
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Vendor Types
export interface Vendor {
  id: string;
  user_id: string;
  tier: "none" | "basic" | "pro" | "suspended";
  business_name?: string;
  bio?: string;
  primary_lga_id?: number;
  secondary_lgas?: number[];
  logo_url?: string;
  profile_color_hex?: string;
  profile_url?: string;
  abn_verified: boolean;
  abn?: string;
  abn_verified_at?: string;
  product_count: number;
  storage_used_mb: number;
  stripe_account_id?: string;
  pro_subscription_id?: string;
  pro_subscribed_at?: string;
  pro_cancelled_at?: string;
  last_activity_at: string;
  inactivity_flagged_at?: string;
  suspension_reason?: string;
  suspended_at?: string;
  can_appeal: boolean;
  payment_reversal_count: number;
  payment_reversal_window_start?: string;
  created_at: string;
  updated_at: string;
}

// Product Types
export interface Product {
  id: string;
  vendor_id: string;
  title: string;
  description?: string;
  price: number;
  category_id?: number;
  delivery_type: "download" | "license_key" | "service_booking";
  file_type?: string;
  file_url?: string;
  file_size_mb?: number;
  thumbnail_url?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Order Types
export interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  product_id: string;
  amount_cents: number;
  commission_cents: number;
  vendor_net_cents: number;
  stripe_payment_intent_id: string;
  stripe_charge_id?: string;
  status: "pending" | "succeeded" | "failed" | "reversed";
  download_url?: string;
  created_at: string;
  updated_at: string;
}

// Refund Request Types
export interface RefundRequest {
  id: string;
  order_id: string;
  vendor_id: string;
  customer_id: string;
  reason: string;
  description: string;
  amount_cents: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approved_at?: string;
  rejected_at?: string;
  rejected_reason?: string;
  stripe_refund_id?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

// LGA (Local Government Area) Types
export interface LGA {
  id: number;
  name: string;
  council_abbreviation?: string;
  featured_slot_cap: number;
  active: boolean;
  created_at: string;
}

// Category Types
export interface Category {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  icon_url?: string;
  active: boolean;
  created_at: string;
}

// Supabase Auth Types
export interface SupabaseUser {
  id: string;
  email?: string | null;
}

// Auth Session Types
export interface AuthSession {
  user: User;
  vendor?: Vendor;
  token: string;
}

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Stripe Types
export interface StripeCheckoutData {
  items: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
      };
      unit_amount: number; // in cents
    };
    quantity: number;
  }>;
  vendorStripeId: string;
  platformFee: number; // in cents
}
