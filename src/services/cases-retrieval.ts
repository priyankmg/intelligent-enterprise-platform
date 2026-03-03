import type { HRCase } from "@/data-layer/types";
import { hrCases } from "@/data-layer/mock-data";

/**
 * Retrieves past termination cases where the same policy clause was applied.
 * Used by Retrieval Augmentation Agent (takes input from Policy Evaluation Agent).
 */
export function getPastTerminationCasesByPolicy(
  appliedPolicyClauseId: string
): HRCase[] {
  return hrCases.filter(
    (c) =>
      c.type === "termination" &&
      c.status === "resolved" &&
      (c.appliedPolicyClauseId === appliedPolicyClauseId ||
        // Fallback: match by related clause (e.g. device vs second-offense)
        relatedClause(appliedPolicyClauseId, c.appliedPolicyClauseId))
  );
}

function relatedClause(a: string, b?: string): boolean {
  if (!b) return false;
  const restricted = ["restricted-area-device", "restricted-area-photography", "restricted-area-second-offense"];
  return restricted.includes(a) && restricted.includes(b);
}
