import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { StripeCheckoutData } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const checkoutData: StripeCheckoutData = await req.json();

    // Validate required fields
    if (!checkoutData.items || !checkoutData.vendorStripeId || !checkoutData.platformFee) {
      return NextResponse.json(
        { error: "Missing required fields: items, vendorStripeId, platformFee" },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session (Connect Standard)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: "payment",
      line_items: checkoutData.items,
      payment_intent_data: {
        application_fee_amount: checkoutData.platformFee,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancel`,
    }, {
      stripeAccount: checkoutData.vendorStripeId
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
