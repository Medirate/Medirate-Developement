import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body
  },
};

// Initialize Stripe & Supabase
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.arrayBuffer();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "No Stripe signature found" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        Buffer.from(rawBody),
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (error) {
      return NextResponse.json({ error: `Webhook Error: ${(error as Error).message}` }, { status: 400 });
    }

    // Handle different Stripe events
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscription(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handlePayment(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.deleted":
        await handleCancellation(event.data.object as Stripe.Subscription);
        break;

      case "checkout.session.completed":
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("🚨 Webhook Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ✅ **Handle Subscription Sync (Insert or Update)**
async function handleSubscription(subscription: Stripe.Subscription) {
  const customerEmail = (await stripe.customers.retrieve(subscription.customer as string)) as Stripe.Customer;
  if (!customerEmail.email) return;

  console.log(`🆕 Syncing Subscription for: ${customerEmail.email}`);

  const { data: user, error } = await supabase
    .from("User")
    .select("UserID")
    .eq("Email", customerEmail.email)
    .single();

  if (error) {
    console.error("❌ User not found in database:", error);
    return;
  }

  const planID = subscription.items.data[0]?.price.id;
  if (!planID) {
    console.error("❌ Error fetching subscription or missing PlanID");
    return;
  }

  // Check if the subscription already exists
  const { data: existingSubscription, error: fetchError } = await supabase
    .from("Subscription")
    .select("SubscriptionID")
    .eq("SubscriptionID", subscription.id)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("⚠️ Error checking existing subscription:", fetchError);
    return;
  }

  if (existingSubscription) {
    console.log(`🔄 Updating Subscription: ${subscription.id}`);
    const { error: updateError } = await supabase
      .from("Subscription")
      .update({
        PlanID: planID,
        Status: subscription.status,
        UpdatedAt: new Date().toISOString(),
      })
      .eq("SubscriptionID", subscription.id);

    if (updateError) {
      console.error("❌ Error updating subscription:", updateError);
    }
  } else {
    console.log(`➕ Creating new Subscription: ${subscription.id}`);
    const { error: insertError } = await supabase
      .from("Subscription")
      .insert([
        {
          SubscriptionID: subscription.id,
          UserID: user.UserID,
          PlanID: planID,
          Status: subscription.status,
          CreatedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      console.error("❌ Error inserting subscription:", insertError);
    } else {
      console.log("✅ Subscription successfully synced.");
    }
  }
}

// ✅ **Handle Payment Sync**
async function handlePayment(invoice: Stripe.Invoice) {
  const customerEmail = (await stripe.customers.retrieve(invoice.customer as string)) as Stripe.Customer;
  if (!customerEmail.email) return;

  console.log(`💰 Syncing payment for: ${customerEmail.email}`);

  const { data: user, error } = await supabase
    .from("User")
    .select("UserID")
    .eq("Email", customerEmail.email)
    .single();

  if (error) {
    console.error("❌ User not found in database:", error);
    return;
  }

  // Get Subscription ID
  const { data: subscription, error: subscriptionError } = await supabase
    .from("Subscription")
    .select("SubscriptionID, PlanID")
    .eq("UserID", user.UserID)
    .single();

  if (subscriptionError || !subscription?.PlanID) {
    console.error("❌ Error fetching subscription or missing PlanID:", subscriptionError);
    return;
  }

  console.log(`➕ Creating new Payment for Subscription: ${subscription.SubscriptionID}`);

  const { error: insertError } = await supabase
    .from("Payment")
    .insert([
      {
        UserID: user.UserID,
        SubscriptionID: subscription.SubscriptionID,
        PlanID: subscription.PlanID,
        Amount: invoice.amount_paid / 100,
        PaymentStatus: invoice.status,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      },
    ]);

  if (insertError) {
    console.error("❌ Error inserting payment:", insertError);
  } else {
    console.log("✅ Payment successfully synced.");
  }
}

// ✅ **Handle Subscription Cancellation**
async function handleCancellation(subscription: Stripe.Subscription) {
  console.log(`🚫 Cancelling Subscription: ${subscription.id}`);

  const { error: updateError } = await supabase
    .from("Subscription")
    .update({ Status: "canceled", UpdatedAt: new Date().toISOString() })
    .eq("SubscriptionID", subscription.id);

  if (updateError) {
    console.error("❌ Error updating cancellation:", updateError);
  } else {
    console.log("✅ Subscription successfully cancelled.");
  }
}

// ✅ **Handle Checkout Session Completion**
async function handleCheckoutSession(session: Stripe.Checkout.Session) {
  console.log("⚡ Handling Checkout Session Completion...");
  if (!session.customer_email || !session.subscription) return;

  console.log(`✅ Checkout completed for: ${session.customer_email}`);
  await handleSubscription(
    (await stripe.subscriptions.retrieve(session.subscription as string)) as Stripe.Subscription
  );
}
