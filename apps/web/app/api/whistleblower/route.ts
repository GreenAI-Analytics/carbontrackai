import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { whistleblowerSchema, parseBody } from "@/lib/validations";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, RATE_LIMITS.publicForm);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const raw = await request.json();
    const parsed = parseBody(whistleblowerSchema, raw);
    if (!parsed.success) return parsed.error;
    const { orgRef, reportType, description, contact } = parsed.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("whistleblower_cases")
      .select("*", { count: "exact", head: true });
    const seq = String((count ?? 0) + 1).padStart(3, "0");
    const caseRef = `WB-${year}-${seq}`;

    let orgId: string | null = null;
    if (orgRef) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id")
        .ilike("name", `%${orgRef}%`)
        .limit(1);
      if (orgs?.length) orgId = orgs[0].id;
    }

    const { error } = await supabase.from("whistleblower_cases").insert({
      organization_id: orgId || "00000000-0000-0000-0000-000000000000",
      case_reference: caseRef,
      report_type: reportType,
      description,
      reporter_contact: contact || null,
      submission_channel: "web_form",
      case_status: "pending",
      submitted_at: new Date().toISOString(),
      feedback_deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      logger.error("Failed to insert whistleblower case", { error: error.message });
      return NextResponse.json({ error: "Failed to record report" }, { status: 500 });
    }

    return NextResponse.json({ caseRef });
  } catch (err: unknown) {
    logger.error("Whistleblower API error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
