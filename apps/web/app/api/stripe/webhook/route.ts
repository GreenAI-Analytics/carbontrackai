import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature")!;
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orgId, planType } = session.metadata || {};
        if (orgId && planType && session.subscription) {
          const isComp = planType === "vsme_comprehensive" || planType === "csrd";
          await supabase.from("feature_flag_subscriptions").update({
            plan_type: planType,
            stripe_subscription_id: session.subscription as string,
            subscription_status: "active",
            pollution_enabled: isComp, water_enabled: isComp, biodiversity_enabled: isComp,
            circular_economy_enabled: isComp, valuechain_enabled: isComp,
            communities_enabled: isComp, consumers_enabled: isComp,
            taxonomy_enabled: isComp, workforce_enabled: true, business_conduct_enabled: true,
          }).eq("organization_id", orgId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status;

        const { data: subs } = await supabase
          .from("feature_flag_subscriptions")
          .select("organization_id")
          .eq("stripe_subscription_id", subscription.id);

        if (subs?.length) {
          for (const s of subs) {
            if (status === "canceled" || status === "unpaid") {
              await supabase.from("feature_flag_subscriptions").update({
                plan_type: "vsme_basic",
                subscription_status: "canceled",
                pollution_enabled: false, water_enabled: false, biodiversity_enabled: false,
                circular_economy_enabled: false, valuechain_enabled: false,
                communities_enabled: false, consumers_enabled: false, taxonomy_enabled: false,
                workforce_enabled: true, business_conduct_enabled: true,
              }).eq("organization_id", s.organization_id);
            } else {
              await supabase.from("feature_flag_subscriptions").update({
                subscription_status: status,
              }).eq("organization_id", s.organization_id);
            }
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    logger.error("Stripe webhook failed", {
      eventType: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
