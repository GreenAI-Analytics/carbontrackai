import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { orgRef, reportType, description, contact } = await request.json();

    if (!description || description.length < 20) {
      return NextResponse.json({ error: "Description must be at least 20 characters" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate anonymous case reference
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("whistleblower_cases")
      .select("*", { count: "exact", head: true });
    const seq = String((count ?? 0) + 1).padStart(3, "0");
    const caseRef = `WB-${year}-${seq}`;

    // Try to find organisation by name if provided
    let orgId: string | null = null;
    if (orgRef) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id")
        .ilike("name", `%${orgRef}%`)
        .limit(1);
      if (orgs?.length) orgId = orgs[0].id;
    }

    // Insert anonymous case
    const { error } = await supabase.from("whistleblower_cases").insert({
      organization_id: orgId || "00000000-0000-0000-0000-000000000000", // placeholder org
      case_reference: caseRef,
      report_type: reportType,
      description,
      reporter_contact: contact || null,
      submission_channel: "web_form",
      case_status: "pending",
      submitted_at: new Date().toISOString(),
      feedback_deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months
    });

    if (error) {
      console.error("Whistleblower insert error:", error);
      return NextResponse.json({ error: "Failed to record report" }, { status: 500 });
    }

    return NextResponse.json({ caseRef });
  } catch (err: any) {
    console.error("Whistleblower API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
