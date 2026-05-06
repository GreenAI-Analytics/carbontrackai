/**
 * Next.js instrumentation hook — runs once at startup.
 * Registers global error handlers for uncaught exceptions and unhandled rejections.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("@/lib/logger");

    process.on("uncaughtException", (error: Error) => {
      logger.error("Uncaught exception", {
        message: error.message,
        stack: error.stack,
      });
      // Give the logger time to flush, then exit
      setTimeout(() => process.exit(1), 1000);
    });

    process.on("unhandledRejection", (reason: unknown) => {
      logger.error("Unhandled rejection", {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });

    const shutdown = (signal: string) => {
      logger.info("Received shutdown signal", { signal });
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}
