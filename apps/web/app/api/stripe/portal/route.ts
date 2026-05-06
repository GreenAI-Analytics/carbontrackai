import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { portalSchema, parseBody } from "@/lib/validations";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = parseBody(portalSchema, raw);
    if (!parsed.success) return parsed.error;
    const { orgId } = parsed.data;

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: sub } = await supabase
      .from("feature_flag_subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", orgId)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${request.headers.get("origin")}/dashboard/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
