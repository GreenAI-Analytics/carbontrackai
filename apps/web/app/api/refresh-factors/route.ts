import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAllFactors, mapToDbRows, type FactorRefreshResult } from "@/lib/climatiq";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  // Require admin API key
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const result: FactorRefreshResult = {
    source: "Climatiq",
    factorsFetched: 0,
    factorsInserted: 0,
    countries: [],
    errors: [],
    durationMs: 0,
  };

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const factors = await fetchAllFactors();
    result.factorsFetched = factors.length;

    const countries = new Set(factors.map((f) => f.region).filter((r) => r !== "EU"));
    result.countries = Array.from(countries).sort();

    if (factors.length === 0) {
      result.errors.push("No factors returned from Climatiq API");
      result.durationMs = Date.now() - start;
      return NextResponse.json(result, { status: 200 });
    }

    let { data: source } = await supabase
      .from("factor_sources")
      .select("id")
      .eq("name", "Climatiq")
      .eq("provider", "climatiq")
      .single();

    if (!source) {
      const { data: newSource } = await supabase
        .from("factor_sources")
        .insert({
          name: "Climatiq",
          provider: "climatiq",
          url: "https://www.climatiq.io/data",
          is_active: true,
          last_updated: new Date().toISOString(),
        })
        .select("id")
        .single();
      source = newSource;
    }

    if (!source) {
      result.errors.push("Failed to create/find Climatiq factor source");
      result.durationMs = Date.now() - start;
      return NextResponse.json(result, { status: 500 });
    }

    await supabase
      .from("emission_factors")
      .delete()
      .eq("source_id", source.id);

    const rows = mapToDbRows(factors);
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row) => ({
        source_id: source!.id,
        activity_type: row.activity_type,
        unit: row.unit,
        region: row.region,
        value: row.value,
        version: 1,
        effective_date: new Date().toISOString().split("T")[0],
        metadata: row.metadata,
      }));

      const { error } = await supabase.from("emission_factors").insert(batch);
      if (error) {
        result.errors.push(`Insert batch ${i}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    result.factorsInserted = inserted;

    await supabase
      .from("factor_sources")
      .update({ last_updated: new Date().toISOString() })
      .eq("id", source.id);

    result.durationMs = Date.now() - start;
    return NextResponse.json(result);
  } catch (err: unknown) {
    result.errors.push(err instanceof Error ? err.message : "Unknown error");
    result.durationMs = Date.now() - start;
    return NextResponse.json(result, { status: 500 });
  }
}
