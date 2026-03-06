import type { GovernedAgentId } from "@/data-layer/types";
import { listGovernanceEvents } from "@/services/governance-store";
import { appendBiasFinding } from "@/services/governance-store";

const MIN_EVENTS_FOR_BASELINE = 20;
const TREND_DISTRIBUTION_DEVIATION = 0.35; // flag if growth/termination share shifts by this much

/**
 * Bias Correction Agent: monitors ML model (career trajectory) and system recommendations
 * vs historical distribution. Flags abnormal changes in decision weights for human review.
 */
export function runBiasCorrectionAgent(): { findingsCreated: number } {
  let findingsCreated = 0;

  const careerEvents = listGovernanceEvents(200, "career_trajectory");
  if (careerEvents.length >= MIN_EVENTS_FOR_BASELINE) {
    const recent = careerEvents.slice(0, 30);
    const older = careerEvents.slice(30, 60);
    if (older.length >= 10) {
      const recentMix = getTrendMix(recent);
      const olderMix = getTrendMix(older);
      const growthDelta = Math.abs((recentMix.growth ?? 0) - (olderMix.growth ?? 0));
      const termDelta = Math.abs((recentMix.termination ?? 0) - (olderMix.termination ?? 0));
      if (growthDelta >= TREND_DISTRIBUTION_DEVIATION || termDelta >= TREND_DISTRIBUTION_DEVIATION) {
        appendBiasFinding({
          source: "career_trajectory",
          timestamp: new Date().toISOString(),
          description: `Career trajectory trend distribution has shifted: recent growth ${((recentMix.growth ?? 0) * 100).toFixed(0)}% vs older ${((olderMix.growth ?? 0) * 100).toFixed(0)}%; termination recent ${((recentMix.termination ?? 0) * 100).toFixed(0)}% vs older ${((olderMix.termination ?? 0) * 100).toFixed(0)}%. Review for unintentional bias or data drift.`,
          metric: growthDelta + termDelta,
          baseline: TREND_DISTRIBUTION_DEVIATION,
          severity: growthDelta + termDelta > 0.5 ? "high" : "medium",
          acknowledged: false,
        });
        findingsCreated++;
      }
    }
  }

  const synthesisEvents = listGovernanceEvents(200, "termination_synthesis");
  if (synthesisEvents.length >= MIN_EVENTS_FOR_BASELINE) {
    const recent = synthesisEvents.slice(0, 30);
    const recommendTerm = recent.filter((e) => e.decision === "recommend_termination").length;
    const share = recommendTerm / recent.length;
    if (share >= 0.7) {
      appendBiasFinding({
        source: "termination_synthesis",
        timestamp: new Date().toISOString(),
        description: `Termination synthesis recommendation rate is high: ${(share * 100).toFixed(0)}% recommend_termination in last 30 invocations. Ensure policy and evidence are applied consistently.`,
        metric: share,
        baseline: 0.5,
        severity: "medium",
        acknowledged: false,
      });
      findingsCreated++;
    }
  }

  return { findingsCreated };
}

function getTrendMix(events: { decision?: string; outcome?: Record<string, unknown> }[]): Record<string, number> {
  const total = events.length;
  if (total === 0) return {};
  let growth = 0;
  let termination = 0;
  let neutral = 0;
  for (const e of events) {
    const trend = (e.outcome as { trend?: string })?.trend ?? e.decision ?? "";
    if (trend === "growth") growth++;
    else if (trend === "termination" || trend === "recommend_termination") termination++;
    else neutral++;
  }
  return {
    growth: growth / total,
    termination: termination / total,
    neutral: neutral / total,
  };
}
