import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

/**
 * API Route: GET /api/vendor/onboarding/status
 * 
 * Checks the current onboarding status of a vendor
 * Returns Stripe account status and next steps
 */

export async function GET(request: Request) {
  try {
    // Get current user from Supabase auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get vendor record
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json(
        { 
          status: 'not_started',
          message: 'No vendor account found',
          next_step: 'create_vendor'
        },
        { status: 404 }
      );
    }

    // If no Stripe account ID, onboarding hasn't started
    if (!vendor.stripe_account_id) {
      return NextResponse.json({
        status: 'pending',
        message: 'Vendor account created, Stripe Connect not started',
        next_step: 'start_stripe_connect'
      });
    }

    // Check Stripe account status
    try {
      const stripeAccount = await stripe.accounts.retrieve(vendor.stripe_account_id);
      
      const status = {
        status: stripeAccount.charges_enabled ? 'completed' : 'pending',
        message: stripeAccount.charges_enabled 
          ? 'Stripe Connect setup completed' 
          : 'Stripe Connect setup in progress',
        next_step: stripeAccount.charges_enabled ? 'start_selling' : 'complete_stripe_onboarding',
        stripe_account_id: vendor.stripe_account_id,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        requirements: stripeAccount.requirements,
        dashboard_url: stripeAccount.charges_enabled 
          ? await stripe.accounts.createLoginLink(vendor.stripe_account_id).then(link => link.url)
          : null
      };

      return NextResponse.json(status);

    } catch (stripeError) {
      console.error('Error checking Stripe account:', stripeError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to check Stripe account status',
        next_step: 'retry_stripe_check'
      });
    }

  } catch (error) {
    console.error('Error checking vendor onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}

/**
 * API Route: POST /api/vendor/onboarding/start
 * 
 * Initiates Stripe Connect onboarding flow
 */
export async function POST(request: Request) {
  try {
    // Get current user from Supabase auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get vendor record
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json(
        { error: 'No vendor account found' },
        { status: 404 }
      );
    }

    // If already has Stripe account, return existing onboarding URL
    if (vendor.stripe_account_id) {
      try {
        const accountLink = await stripe.accountLinks.create({
          account: vendor.stripe_account_id,
          refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/vendor/onboarding?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/vendor/onboarding?success=true`,
          type: 'account_onboarding',
        });

        return NextResponse.json({
          onboarding_url: accountLink.url,
          message: 'Stripe Connect onboarding link generated'
        });
      } catch (error) {
        console.error('Error creating account link:', error);
        return NextResponse.json(
          { error: 'Failed to create onboarding link' },
          { status: 500 }
        );
      }
    }

    // Create new Stripe account and onboarding link
    const stripeAccount = await stripe.accounts.create({
      type: 'standard',
      country: 'AU',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Update vendor with Stripe account ID
    await supabase
      .from('vendors')
      .update({
        stripe_account_id: stripeAccount.id,
        stripe_account_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/vendor/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/vendor/onboarding?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      onboarding_url: accountLink.url,
      message: 'Stripe Connect onboarding started'
    });

  } catch (error) {
    console.error('Error starting Stripe Connect onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to start onboarding' },
      { status: 500 }
    );
  }
}