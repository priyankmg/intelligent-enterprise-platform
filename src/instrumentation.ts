/**
 * Runs when the Next.js server starts. Starts the governance background cycle
 * (Anomaly Detection, Policy Control, Bias Correction) every 5 minutes in Node.js runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runGovernanceBackgroundCycle } = await import("@/services/governance-orchestrator");
    const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    setInterval(() => {
      try {
        runGovernanceBackgroundCycle();
      } catch (err) {
        console.error("Governance background cycle error:", err);
      }
    }, INTERVAL_MS);
  }
}
