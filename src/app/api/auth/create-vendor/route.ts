import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * API Route: POST /api/auth/create-vendor
 *
 * Creates a vendor account and initiates Stripe Connect onboarding
 * This is the entry point for vendor onboarding flow
 */

export async function POST(request: Request) {
  try {
    // Get current user from Supabase auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    const { business_name, tier = "basic" } = await request.json();

    if (!business_name) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    // Check if user already has a vendor account
    const { data: existingVendor, error } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!error && existingVendor) {
      return NextResponse.json(
        { error: "User already has a vendor account" },
        { status: 409 }
      );
    }

    // Create Stripe Connect account
    const stripeAccount = await stripe.accounts.create({
      type: "standard",
      country: "AU",
      email: user.email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: "manual",
          },
        },
      },
    });

    // Create vendor record in database
    const { data: vendor, error: insertError } = await supabase
      .from("vendors")
      .insert({
        user_id: user.id,
        tier: tier,
        business_name: business_name,
        stripe_account_id: stripeAccount.id,
        stripe_account_status: "pending",
        can_sell_products: tier === "basic" ? true : false, // Pro tier requires payment
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // Clean up Stripe account if database insertion fails
      await stripe.accounts.del(stripeAccount.id);
      throw insertError;
    }

    // Create Stripe Connect account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/vendor/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/vendor/onboarding?success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      message: "Vendor account created successfully",
      vendor_id: vendor.id,
      stripe_account_id: stripeAccount.id,
      onboarding_url: accountLink.url,
      requires_payment: tier === "pro",
    });
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json(
      { error: "Failed to create vendor account" },
      { status: 500 }
    );
  }
}
