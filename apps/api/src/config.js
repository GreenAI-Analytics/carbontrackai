import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

dotenv.config();

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const requestedPort = Number(process.env.API_PORT ?? 4000);
const effectivePort = requestedPort === 3000 && process.env.NODE_ENV !== "production" ? 4000 : requestedPort;

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: effectivePort,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  externalTimeoutMs: Number(process.env.API_EXTERNAL_TIMEOUT_MS ?? 9000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
};
