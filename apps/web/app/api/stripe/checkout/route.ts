import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { checkoutSchema, parseBody } from "@/lib/validations";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  vsme_comprehensive: process.env.STRIPE_PRICE_VSME_COMPREHENSIVE || "price_vsme_comprehensive",
  csrd: process.env.STRIPE_PRICE_CSRD || "price_csrd",
};

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = parseBody(checkoutSchema, raw);
    if (!parsed.success) return parsed.error;
    const { planType, orgId, userId, email } = parsed.data;

    const priceId = PRICE_IDS[planType];
    if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await supabase
      .from("feature_flag_subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", orgId)
      .single();

    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { orgId, userId } });
      customerId = customer.id;
      await supabase.from("feature_flag_subscriptions").update({ stripe_customer_id: customerId }).eq("organization_id", orgId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${request.headers.get("origin")}/dashboard/settings?checkout=success`,
      cancel_url: `${request.headers.get("origin")}/dashboard/settings?checkout=canceled`,
      subscription_data: { metadata: { orgId, planType } },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
