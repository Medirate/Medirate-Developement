import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

/**
 * Retrieves the current user's subscription from Stripe using their email.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json(); // Expect email from frontend

    console.log("🔍 Stripe API: Checking subscription for email:", email);

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Fetch customer using email
    console.log("🔍 Stripe API: Fetching customers with email:", email);
    const customers = await stripe.customers.list({ email });

    console.log("🔍 Stripe API: Found customers:", customers.data.length);

    if (!customers.data.length) {
      console.log("❌ Stripe API: No customer found for email:", email);
      return NextResponse.json({ status: "no_customer" }, { status: 200 });
    }

    const customer = customers.data[0];
    console.log("🔍 Stripe API: Customer found:", { id: customer.id, email: customer.email });

    // Fetch active subscriptions for the customer
    console.log("🔍 Stripe API: Fetching subscriptions for customer:", customer.id);
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      // Include all valid subscription statuses, not just "active"
      status: "all", // This will get all subscriptions regardless of status
      expand: ["data.latest_invoice", "data.default_payment_method"],
    });

    console.log("🔍 Stripe API: Found subscriptions:", subscriptions.data.length);
    console.log("🔍 Stripe API: Subscription statuses:", subscriptions.data.map(s => ({ id: s.id, status: s.status })));

    // Filter for valid subscription statuses (not cancelled, incomplete, or unpaid)
    const validSubscriptions = subscriptions.data.filter(sub => {
      // Include canceled subscriptions if they haven't expired yet
      if (sub.status === 'canceled') {
        const now = Math.floor(Date.now() / 1000);
        return sub.current_period_end > now;
      }
      return ['active', 'trialing', 'past_due', 'incomplete'].includes(sub.status);
    });

    console.log("🔍 Stripe API: Valid subscriptions:", validSubscriptions.length);
    console.log("🔍 Stripe API: Valid subscription statuses:", validSubscriptions.map(s => ({ id: s.id, status: s.status })));

    if (!validSubscriptions.length) {
      console.log("❌ Stripe API: No valid subscriptions found for customer:", customer.id);
      console.log("❌ Stripe API: All subscription statuses:", subscriptions.data.map(s => s.status));
      return NextResponse.json({ status: "no_subscription" }, { status: 200 });
    }

    // Use the first valid subscription
    const subscription = validSubscriptions[0];

    if (!subscription.items?.data || subscription.items.data.length === 0) {
      return NextResponse.json({ status: "no_items" }, { status: 200 });
    }

    // Get product details
    const planId = subscription.items.data[0]?.price?.product ?? null;
    const product = planId ? await stripe.products.retrieve(planId as string) : null;

    // Ensure safe access to payment method details
    const paymentMethod =
      typeof subscription.default_payment_method === "object" &&
      subscription.default_payment_method !== null
        ? subscription.default_payment_method
        : null;

    return NextResponse.json({
      plan: product?.name ?? "Unknown Plan",
      amount: (subscription.items.data[0]?.price?.unit_amount ?? 0) / 100, // Convert cents to dollars
      currency: subscription.currency.toUpperCase(),
      billingInterval: subscription.items.data[0]?.price?.recurring?.interval ?? "N/A",
      status: subscription.status,
      startDate: subscription.start_date
        ? new Date(subscription.start_date * 1000).toLocaleDateString()
        : "N/A",
      endDate: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toLocaleDateString()
        : "N/A",
      trialEndDate: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toLocaleDateString()
        : null,
      latestInvoice:
        typeof subscription.latest_invoice === "object" && subscription.latest_invoice !== null
          ? subscription.latest_invoice.id
          : subscription.latest_invoice || "N/A",
      paymentMethod: paymentMethod ? paymentMethod.type : "N/A",
    });
  } catch (error: unknown) {
    console.error("❌ Stripe API: Subscription Fetch Error:", error);
    console.error("❌ Stripe API: Error details:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name
    });
    
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: (error as Error).message || "An unexpected error occurred.",
        details: {
          message: (error as Error).message,
          name: (error as Error).name,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}
