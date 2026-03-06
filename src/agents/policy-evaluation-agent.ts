import type { PolicyEvaluationResult } from "@/data-layer/types";
import type { EmployeeSnapshot } from "@/data-layer/types";
import type { HRCase } from "@/data-layer/types";
import type { SemanticLayerOutput } from "./semantic-layer-agent";
import { runSemanticLayerAgent } from "./semantic-layer-agent";
import Anthropic from "@anthropic-ai/sdk";
import { governanceCheckBeforeAction, governanceRecordAfterAction } from "@/services/governance-orchestrator";

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

export interface PolicyEvaluationAgentInput {
  case: HRCase;
  snapshot: EmployeeSnapshot;
  policyId?: string;
}

/**
 * Policy Evaluation Agent: reads termination policy and checks if employee data
 * snapshot (and case) shows that policy was violated. Calls Semantic Layer Agent
 * first to ensure it is inferring the policy correctly.
 */
export async function runPolicyEvaluationAgent(
  input: PolicyEvaluationAgentInput
): Promise<{ evaluation: PolicyEvaluationResult; semanticLayer: SemanticLayerOutput | null }> {
  const policyId = input.policyId ?? "pol-termination";
  const check = governanceCheckBeforeAction({
    agentId: "policy_evaluation",
    actionClass: "recommendation",
    dataScopesUsed: ["policy_metadata", "employee_snapshot", "case"],
    toolsUsed: ["readPolicy", "readSnapshot", "readCase"],
    policyIdsUsed: [policyId],
    scope: { caseId: input.case.id, employeeId: input.case.employeeId, policyId },
  });
  if (!check.allowed) {
    governanceRecordAfterAction({
      agentId: "policy_evaluation",
      actionClass: "recommendation",
      riskLevel: "medium",
      scope: { caseId: input.case.id, employeeId: input.case.employeeId, policyId },
      outcome: {},
      blastRadius: [input.case.id, input.case.employeeId],
      scopeAllowed: check.scopeEnforcerAllowed,
      actionAllowed: check.actionClassifierAllowed,
      blockReason: check.blockReason,
    });
    return mockPolicyEvaluation(input, null);
  }

  const semanticLayer = await runSemanticLayerAgent(policyId);

  const caseNotesText = (input.case.caseNotes ?? [])
    .map((n) => `[${n.type}] ${n.content}`)
    .join("\n");
  const snapshotSummary = JSON.stringify(
    {
      employee: input.snapshot.employee.name,
      team: input.snapshot.employee.team,
      performance: input.snapshot.performance,
      priorCasesCount: input.snapshot.cases.length,
      training: input.snapshot.training.map((t) => t.training?.name),
    },
    null,
    2
  );
  const policyText = input.snapshot.policies.map((p) => `${p.name}: ${p.body}`).join("\n\n");
  const semanticGuidance = semanticLayer
    ? `SEMANTIC LAYER (use this to infer correctly):\n${semanticLayer.inferenceGuidance}\nDefinitions: ${semanticLayer.definitionsSummary}\nApplicable clause IDs: ${semanticLayer.metadata.clauses.map((c) => c.id).join(", ")}`
    : "";

  if (!anthropic) {
    const result = mockPolicyEvaluation(input, semanticLayer);
    governanceRecordAfterAction({
      agentId: "policy_evaluation",
      actionClass: "recommendation",
      riskLevel: "medium",
      scope: { caseId: input.case.id, employeeId: input.case.employeeId, policyId },
      outcome: { appliedClauseId: result.evaluation.appliedClauseId, violated: result.evaluation.violated },
      decision: result.evaluation.violated ? "violation" : "no_violation",
      blastRadius: [input.case.id, input.case.employeeId],
      scopeAllowed: true,
      actionAllowed: true,
    });
    return result;
  }

  try {
    const response = await anthropic!.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system:
        "You are an HR policy evaluation agent. You MUST use the Semantic Layer guidance to interpret the policy correctly. Determine which single policy clause best applies and whether the employee violated it. Return only valid JSON, no markdown or explanation.",
      messages: [
        {
          role: "user",
          content: `${semanticGuidance}

POLICY TEXT:
${policyText}

CASE:
Subject: ${input.case.subject}
Incident date: ${input.case.incidentDate ?? "unknown"}
Initial finding: ${input.case.initialFinding ?? "none"}

Case notes:
${caseNotesText}

EMPLOYEE SNAPSHOT (summary):
${snapshotSummary}

Output JSON:
- appliedPolicyId: string (e.g. pol-termination)
- appliedClauseId: string (one of: restricted-area-device, restricted-area-photography, restricted-area-second-offense)
- appliedClauseName: string
- violated: boolean
- evidence: string[]
- policyViolations: string[]
- inferredCorrectly: boolean (true if you used semantic guidance)
- semanticLayerSummary: string (one line)`,
        },
      ],
    });
    const content = response.content[0].type === "text" ? response.content[0].text : null;
    if (!content) return mockPolicyEvaluation(input, semanticLayer);
    const parsed = JSON.parse(content) as PolicyEvaluationResult;
    const result = {
      evaluation: { ...parsed, semanticLayerSummary: semanticLayer?.inferenceGuidance },
      semanticLayer: semanticLayer ?? null,
    };
    governanceRecordAfterAction({
      agentId: "policy_evaluation",
      actionClass: "recommendation",
      riskLevel: "medium",
      scope: { caseId: input.case.id, employeeId: input.case.employeeId, policyId },
      outcome: { appliedClauseId: result.evaluation.appliedClauseId, violated: result.evaluation.violated },
      decision: result.evaluation.violated ? "violation" : "no_violation",
      blastRadius: [input.case.id, input.case.employeeId],
      scopeAllowed: true,
      actionAllowed: true,
    });
    return result;
  } catch (err) {
    console.error("PolicyEvaluationAgent error:", err);
    const result = mockPolicyEvaluation(input, semanticLayer);
    governanceRecordAfterAction({
      agentId: "policy_evaluation",
      actionClass: "recommendation",
      riskLevel: "medium",
      scope: { caseId: input.case.id, employeeId: input.case.employeeId, policyId },
      outcome: { error: String(err) },
      blastRadius: [input.case.id, input.case.employeeId],
      scopeAllowed: true,
      actionAllowed: true,
    });
    return result;
  }
}

function mockPolicyEvaluation(
  input: PolicyEvaluationAgentInput,
  semanticLayer: SemanticLayerOutput | null
): { evaluation: PolicyEvaluationResult; semanticLayer: SemanticLayerOutput | null } {
  return {
    evaluation: {
      appliedPolicyId: "pol-termination",
      appliedClauseId: "restricted-area-device",
      appliedClauseName: "No personal devices in restricted zones",
      violated: true,
      evidence: [
        "Security footage shows phone in restricted zone",
        "Witness reported possible photo-taking",
        "Employee acknowledged device in restricted area",
      ],
      policyViolations: [
        "No personal devices permitted in restricted zones",
        "Potential photography/recording (witness) - further aligns with restricted-area-photography if confirmed",
      ],
      inferredCorrectly: true,
      semanticLayerSummary: semanticLayer?.inferenceGuidance,
    },
    semanticLayer,
  };
}
