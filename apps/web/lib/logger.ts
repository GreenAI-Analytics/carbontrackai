/**
 * Lightweight structured logger.
 * Replace with pino or winston for production at scale.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case "debug":
      if (process.env.NODE_ENV !== "production") console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};
