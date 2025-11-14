import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * API Route: GET /api/vendor/connect/callback
 *
 * Handles Stripe Connect OAuth callback
 * Updates vendor status after successful onboarding
 */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      const errorDescription =
        url.searchParams.get("error_description") || "Unknown error";
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_SITE_URL
        }/vendor/onboarding?error=${encodeURIComponent(errorDescription)}`
      );
    }

    // Handle missing authorization code
    if (!code) {
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_SITE_URL
        }/vendor/onboarding?error=${encodeURIComponent(
          "Missing authorization code"
        )}`
      );
    }

    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code: code,
    });

    const accountId = response.stripe_user_id;

    // Update vendor record with connected account status
    const { error: updateError } = await supabase
      .from("vendors")
      .update({
        stripe_account_id: accountId,
        stripe_account_status: "verified",
        can_sell_products: true,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", accountId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating vendor after Stripe Connect:", updateError);
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_SITE_URL
        }/vendor/onboarding?error=${encodeURIComponent(
          "Failed to update vendor account"
        )}`
      );
    }

    // Redirect to vendor dashboard with success message
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_SITE_URL
      }/vendor/dashboard?success=true&message=${encodeURIComponent(
        "Stripe Connect setup completed"
      )}`
    );
  } catch (error) {
    console.error("Error in Stripe Connect callback:", error);
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_SITE_URL
      }/vendor/onboarding?error=${encodeURIComponent("Authentication failed")}`
    );
  }
}
