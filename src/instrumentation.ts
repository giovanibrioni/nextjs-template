export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startTelemetry } = await import("@/backend/core/telemetry");
    startTelemetry();
  }
}
