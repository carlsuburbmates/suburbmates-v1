import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new NextResponse(`Webhook error: ${errorMessage}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      // Create order record in Supabase
      break;

    case "charge.refunded":
      // Vendor refund → log only
      break;

    case "charge.dispute.created":
      // Vendor dispute → log only
      break;
  }

  return NextResponse.json({ received: true });
}
