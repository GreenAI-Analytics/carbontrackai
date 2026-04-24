import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { module1CalculationSchema } from "./schemas.js";
import {
  assessReportingQuality,
  calculateModule1,
  resolveFactors,
} from "./factor-service.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: [config.webOrigin],
  methods: ["GET", "POST"],
});

app.get("/health", async () => {
  return { ok: true, service: "carbontrackai-api", environment: config.nodeEnv };
});

app.get("/v1/providers", async () => {
  return {
    supportedCountries: [
      { countryCode: "FR", provider: "ademe_api" },
      { countryCode: "ES", provider: "miteco_api" },
      { countryCode: "IE", provider: "seai_2024_static" },
    ],
  };
});

app.post("/v1/calculations/module1", async (request, reply) => {
  const parsed = module1CalculationSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      error: "Invalid payload",
      details: parsed.error.flatten(),
    });
  }

  const { countryCode, reportingYear, qualityMode, records } = parsed.data;

  const activityTypes = [...new Set(records.map((record) => record.activity_type))];

  const factorResolution = await resolveFactors(countryCode, activityTypes, reportingYear);
  const quality = assessReportingQuality(factorResolution.provenance);

  if (qualityMode === "reporting" && !quality.reportingReady) {
    return reply.status(422).send({
      error: "Reporting-grade calculation unavailable for one or more activity types.",
      qualityMode,
      quality,
      countryCode: factorResolution.countryCode,
      reportingYear: factorResolution.reportingYear,
      providerDiagnostics: factorResolution.diagnostics,
      factorProvenance: factorResolution.provenance,
    });
  }

  const result = calculateModule1(records, factorResolution.resolved, factorResolution.resolvedDetails);

  return {
    countryCode: factorResolution.countryCode,
    reportingYear: factorResolution.reportingYear,
    qualityMode,
    quality,
    providerDiagnostics: factorResolution.diagnostics,
    factorProvenance: factorResolution.provenance,
    ...result,
  };
});

const address = await app.listen({
  port: config.port,
  host: "0.0.0.0",
});

app.log.info(`API server listening on ${address}`);
