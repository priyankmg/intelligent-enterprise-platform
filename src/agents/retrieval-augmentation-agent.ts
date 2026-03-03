import type { SimilarCase } from "@/data-layer/types";
import { getPastTerminationCasesByPolicy } from "@/services/cases-retrieval";
import { employees } from "@/data-layer/mock-data";

export interface RetrievalAugmentationInput {
  /** From Policy Evaluation Agent: the specific policy clause being applied */
  appliedPolicyClauseId: string;
}

/**
 * Retrieval Augmentation Agent: retrieves past cases where employees were
 * terminated for the same policy (clause) the current case is being evaluated under.
 * Uses data aggregation / cases retrieval service (not LLM) to fetch by policy.
 */
export async function runRetrievalAugmentationAgent(
  input: RetrievalAugmentationInput
): Promise<SimilarCase[]> {
  const pastCases = getPastTerminationCasesByPolicy(input.appliedPolicyClauseId);

  const similar: SimilarCase[] = pastCases.map((c) => {
    const emp = employees.find((e) => e.id === c.employeeId);
    return {
      caseId: c.id,
      employeeId: c.employeeId,
      subject: c.subject,
      terminationReason: c.terminationReason ?? "N/A",
      rehireEligible: c.rehireEligible ?? false,
      appliedClauseId: c.appliedPolicyClauseId ?? input.appliedPolicyClauseId,
      similarity: emp
        ? `Same policy clause (${input.appliedPolicyClauseId}). Outcome: ${c.terminationReason}. Employee: ${emp.name}.`
        : `Same policy clause. ${c.terminationReason}`,
    };
  });

  return similar;
}
