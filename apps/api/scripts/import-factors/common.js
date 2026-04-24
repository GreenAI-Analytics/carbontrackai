import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { supabaseAdmin } from "../../src/supabase.js";

const stagedFactorSchema = z.object({
  datasetName: z.string().min(1),
  datasetVersion: z.string().min(1),
  sourceUrl: z.string().url(),
  license: z.string().min(1),
  factorSourceName: z.string().min(1),
  factorSourceProvider: z.string().min(1),
  factorSourceUrl: z.string().min(1),
  activityType: z.string().min(1),
  unit: z.string().min(1),
  region: z.string().trim().min(2).max(32),
  value: z.number().positive(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  uncertaintyPct: z.number().nonnegative().nullable().optional(),
  gas: z.string().nullable().optional(),
  gwpBasis: z.string().nullable().optional(),
});

function printUsage(scriptName) {
  console.log(
    [
      `Usage: node ${scriptName} --input <snapshot.json|csv> [--activate] [--stage-only] [--dry-run]`,
      "",
      "Flags:",
      "  --input       Snapshot file path (JSON or CSV)",
      "  --activate    Activate the dataset batch after promotion",
      "  --stage-only  Write validated/rejected rows to factor_import_staging only",
      "  --dry-run     Validate in memory only, do not write to Supabase",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = { input: null, activate: false, stageOnly: false, dryRun: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--input") {
      args.input = argv[index + 1] ?? null;
      index += 1;
    } else if (token === "--activate") {
      args.activate = true;
    } else if (token === "--stage-only") {
      args.stageOnly = true;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--help" || token === "-h") {
      args.help = true;
    }
  }

  return args;
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let record = [];
  let insideQuotes = false;

  const pushValue = () => {
    record.push(current);
    current = "";
  };

  const pushRecord = () => {
    if (record.length > 0 || current.length > 0) {
      pushValue();
      rows.push(record);
      record = [];
    }
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      pushValue();
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && next === "\n") {
        index += 1;
      }
      pushRecord();
      continue;
    }

    current += character;
  }

  pushRecord();

  if (rows.length === 0) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  return dataRows
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row) =>
      headers.reduce((recordObject, header, columnIndex) => {
        recordObject[String(header).trim()] = row[columnIndex]?.trim() ?? "";
        return recordObject;
      }, {})
    );
}

async function loadSnapshot(inputPath) {
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const rawText = await fs.readFile(absolutePath, "utf8");
  const extension = path.extname(absolutePath).toLowerCase();

  if (extension === ".json") {
    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed)) {
      throw new Error("JSON snapshot must contain an array of records.");
    }
    return parsed;
  }

  if (extension === ".csv") {
    return parseCsv(rawText);
  }

  throw new Error(`Unsupported snapshot extension: ${extension}`);
}

function datasetChecksum(rows) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(rows))
    .digest("hex");
}

function rowChecksum(row) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        activityType: row.activityType,
        unit: row.unit,
        region: row.region,
        value: row.value,
        effectiveDate: row.effectiveDate,
        validTo: row.validTo ?? null,
      })
    )
    .digest("hex");
}

function numericVersion(datasetVersion) {
  const yearMatch = String(datasetVersion).match(/(20\d{2})/);
  return yearMatch ? Number(yearMatch[1]) : 1;
}

async function ensureFactorSource({ name, provider, url }) {
  const { error: upsertError } = await supabaseAdmin
    .from("factor_sources")
    .upsert(
      [{ name, provider, url, is_active: true, last_updated: new Date().toISOString() }],
      { onConflict: "name,provider" }
    );

  if (upsertError) {
    throw new Error(`Failed to upsert factor source: ${upsertError.message}`);
  }

  const { data, error } = await supabaseAdmin
    .from("factor_sources")
    .select("id")
    .eq("name", name)
    .eq("provider", provider)
    .single();

  if (error) {
    throw new Error(`Failed to load factor source: ${error.message}`);
  }

  return data.id;
}

async function ensureDatasetRegistryEntry({ name, version, sourceUrl, license, activate, notes, checksums }) {
  const payload = {
    name,
    version,
    source_url: sourceUrl,
    license,
    status: activate ? "active" : "inactive",
    activated_at: activate ? new Date().toISOString() : null,
    checksums,
    notes,
  };

  const { error: upsertError } = await supabaseAdmin
    .from("dataset_registry")
    .upsert([payload], { onConflict: "name,version" });

  if (upsertError) {
    throw new Error(`Failed to upsert dataset registry entry: ${upsertError.message}`);
  }

  const { data, error } = await supabaseAdmin
    .from("dataset_registry")
    .select("id, name, status")
    .eq("name", name)
    .eq("version", version)
    .single();

  if (error) {
    throw new Error(`Failed to load dataset registry entry: ${error.message}`);
  }

  if (activate) {
    const { error: deactivateError } = await supabaseAdmin
      .from("dataset_registry")
      .update({ status: "inactive", activated_at: null })
      .eq("name", name)
      .neq("id", data.id)
      .eq("status", "active");

    if (deactivateError) {
      throw new Error(`Failed to deactivate prior dataset versions: ${deactivateError.message}`);
    }

    const { error: activateError } = await supabaseAdmin
      .from("dataset_registry")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", data.id);

    if (activateError) {
      throw new Error(`Failed to activate dataset registry entry: ${activateError.message}`);
    }
  }

  return data.id;
}

async function insertStagingRows(datasetId, sourceId, validRows, rejectedRows) {
  const stagingPayload = [
    ...validRows.map((row) => ({
      dataset_id: datasetId,
      source_id: sourceId,
      activity_type: row.normalized.activityType,
      unit: row.normalized.unit,
      region: row.normalized.region,
      value: row.normalized.value,
      effective_date: row.normalized.effectiveDate,
      valid_to: row.normalized.validTo ?? null,
      normalized_payload: row.normalized,
      raw_payload: row.raw,
      checksum: row.checksum,
      status: "validated",
      validation_errors: null,
    })),
    ...rejectedRows.map((row) => ({
      dataset_id: datasetId,
      source_id: sourceId,
      activity_type: null,
      unit: null,
      region: null,
      value: null,
      effective_date: null,
      valid_to: null,
      normalized_payload: {},
      raw_payload: row.raw,
      checksum: null,
      status: "rejected",
      validation_errors: row.errors,
    })),
  ];

  if (stagingPayload.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.from("factor_import_staging").insert(stagingPayload);
  if (error) {
    throw new Error(`Failed to insert factor staging rows: ${error.message}`);
  }
}

async function promoteRows(datasetId, sourceId, validRows) {
  if (validRows.length === 0) {
    return;
  }

  const payload = validRows.map((row) => ({
    source_id: sourceId,
    activity_type: row.normalized.activityType,
    unit: row.normalized.unit,
    region: row.normalized.region,
    value: row.normalized.value,
    version: numericVersion(row.normalized.datasetVersion),
    effective_date: row.normalized.effectiveDate,
    expiry_date: row.normalized.validTo ?? null,
    metadata: row.normalized.metadata,
    source_version: row.normalized.datasetVersion,
    license: row.normalized.license,
    uncertainty_pct: row.normalized.uncertaintyPct ?? null,
    gas: row.normalized.gas ?? null,
    gwp_basis: row.normalized.gwpBasis ?? null,
    valid_from: row.normalized.effectiveDate,
    valid_to: row.normalized.validTo ?? null,
    import_batch_id: datasetId,
    checksum: row.checksum,
  }));

  const { error } = await supabaseAdmin
    .from("emission_factors")
    .upsert(payload, { onConflict: "source_id,activity_type,unit,region,version,effective_date" });

  if (error) {
    throw new Error(`Failed to promote staged factors into emission_factors: ${error.message}`);
  }

  const checksums = validRows.map((row) => row.checksum);
  const { error: stagingUpdateError } = await supabaseAdmin
    .from("factor_import_staging")
    .update({ status: "promoted", promoted_at: new Date().toISOString() })
    .eq("dataset_id", datasetId)
    .in("checksum", checksums)
    .eq("status", "validated");

  if (stagingUpdateError) {
    throw new Error(`Failed to mark staging rows as promoted: ${stagingUpdateError.message}`);
  }
}

export function createImporter(importer) {
  return async function run() {
    const args = parseArgs(process.argv.slice(2));

    if (args.help || !args.input) {
      printUsage(path.relative(process.cwd(), process.argv[1] ?? "script.js"));
      process.exit(args.help ? 0 : 1);
    }

    const rawRows = await loadSnapshot(args.input);
    const validRows = [];
    const rejectedRows = [];

    for (const [index, rawRow] of rawRows.entries()) {
      const mapped = importer.mapRow(rawRow, index);
      const parsed = stagedFactorSchema.safeParse(mapped);

      if (!parsed.success) {
        rejectedRows.push({
          raw: rawRow,
          errors: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        continue;
      }

      validRows.push({
        raw: rawRow,
        normalized: parsed.data,
        checksum: rowChecksum(parsed.data),
      });
    }

    const datasetMeta = importer.describe(validRows.map((row) => row.normalized), rawRows);
    const summary = {
      importer: importer.name,
      inputRows: rawRows.length,
      validRows: validRows.length,
      rejectedRows: rejectedRows.length,
      datasetName: datasetMeta.datasetName,
      datasetVersion: datasetMeta.datasetVersion,
    };

    console.log(JSON.stringify(summary, null, 2));

    if (args.dryRun) {
      return;
    }

    const datasetId = await ensureDatasetRegistryEntry({
      name: datasetMeta.datasetName,
      version: datasetMeta.datasetVersion,
      sourceUrl: datasetMeta.sourceUrl,
      license: datasetMeta.license,
      activate: args.activate,
      notes: datasetMeta.notes,
      checksums: {
        importer: importer.name,
        source_file_rows: rawRows.length,
        valid_rows: validRows.length,
        rejected_rows: rejectedRows.length,
        sha256: datasetChecksum(validRows.map((row) => row.normalized)),
      },
    });

    const sourceId = await ensureFactorSource({
      name: datasetMeta.factorSourceName,
      provider: datasetMeta.factorSourceProvider,
      url: datasetMeta.factorSourceUrl,
    });

    await insertStagingRows(datasetId, sourceId, validRows, rejectedRows);

    if (args.stageOnly) {
      return;
    }

    if (rejectedRows.length > 0) {
      throw new Error(
        `Import aborted because ${rejectedRows.length} rows failed validation. Review factor_import_staging before promotion.`
      );
    }

    await promoteRows(datasetId, sourceId, validRows);
  };
}