import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * Retrieves the current user's subscription from Stripe using their email.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json(); // Expect email from frontend

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Fetch customer using email
    const customers = await stripe.customers.list({ email });

    if (!customers.data.length) {
      return NextResponse.json({ error: "No customer found with this email." }, { status: 404 });
    }

    const customer = customers.data[0];

    // Fetch active subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      expand: ["data.latest_invoice", "data.default_payment_method"],
    });

    if (!subscriptions.data.length) {
      return NextResponse.json({ error: "No active subscriptions found." }, { status: 404 });
    }

    // Extract subscription details safely
    const subscription = subscriptions.data[0];

    if (!subscription.items?.data || subscription.items.data.length === 0) {
      return NextResponse.json({ error: "No subscription items found." }, { status: 404 });
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
    console.error("❌ Subscription Fetch Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
