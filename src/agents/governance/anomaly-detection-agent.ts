import type { GovernedAgentId, GovernanceEvent } from "@/data-layer/types";
import { getRecentEventsByAgent } from "@/services/governance-store";
import { appendAnomaly } from "@/services/governance-store";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CALL_FREQUENCY_BASELINE = 50; // max expected calls per hour per agent
const CALL_FREQUENCY_ANOMALY_MULTIPLIER = 3; // flag if 3x baseline

/**
 * Anomaly Detection Agent: behavioral monitoring. Detects unusual call frequency,
 * access patterns, or output distribution that may indicate model drift, prompt injection, or edge cases.
 */
export function runAnomalyDetectionAgent(): { anomaliesFound: number; agentsChecked: number } {
  const agents: GovernedAgentId[] = [
    "semantic_layer",
    "policy_evaluation",
    "termination_synthesis",
    "ai_assistant",
    "self_healing",
    "career_trajectory",
  ];
  let anomaliesFound = 0;

  for (const agentId of agents) {
    const events = getRecentEventsByAgent(agentId, WINDOW_MS);
    const count = events.length;

    if (count >= CALL_FREQUENCY_BASELINE * CALL_FREQUENCY_ANOMALY_MULTIPLIER) {
      appendAnomaly({
        agentId,
        timestamp: new Date().toISOString(),
        type: "call_frequency",
        description: `Unusual call frequency: ${count} invocations in the last hour (baseline ~${CALL_FREQUENCY_BASELINE}). Possible failure mode or abuse.`,
        severity: count >= CALL_FREQUENCY_BASELINE * 5 ? "high" : "medium",
        metric: count,
        baseline: CALL_FREQUENCY_BASELINE,
        acknowledged: false,
      });
      anomaliesFound++;
    }

    const decisionSpread = getDecisionSpread(events);
    if (decisionSpread.deviation !== undefined && decisionSpread.deviation > 0.4) {
      appendAnomaly({
        agentId,
        timestamp: new Date().toISOString(),
        type: "output_distribution",
        description: `Output distribution deviation: decisions have shifted significantly from typical mix (deviation ${(decisionSpread.deviation * 100).toFixed(0)}%).`,
        severity: decisionSpread.deviation > 0.6 ? "high" : "low",
        metric: decisionSpread.deviation,
        baseline: 0.2,
        acknowledged: false,
      });
      anomaliesFound++;
    }
  }

  return { anomaliesFound, agentsChecked: agents.length };
}

function getDecisionSpread(events: GovernanceEvent[]): { deviation?: number } {
  if (events.length < 10) return {};
  const decisions: Record<string, number> = {};
  for (const e of events) {
    const d = e.decision ?? "unknown";
    decisions[d] = (decisions[d] ?? 0) + 1;
  }
  const maxShare = Math.max(...Object.values(decisions)) / events.length;
  const expectedUniform = 1 / Math.max(1, Object.keys(decisions).length);
  const deviation = Math.abs(maxShare - expectedUniform);
  return { deviation };
}
