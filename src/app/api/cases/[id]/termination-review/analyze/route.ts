import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { getEmployeeSnapshot } from "@/services/data-aggregation";
import { hrCases } from "@/data-layer/mock-data";
import { runPolicyEvaluationAgent } from "@/agents/policy-evaluation-agent";
import { runRetrievalAugmentationAgent } from "@/agents/retrieval-augmentation-agent";
import { governanceCheckBeforeAction, governanceRecordAfterAction } from "@/services/governance-orchestrator";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Orchestrates three agents for case review:
 * 1. Semantic Layer Agent (invoked inside Policy Evaluation) – policy metadata for correct inference
 * 2. Policy Evaluation Agent – reads termination policy, uses semantic layer, checks snapshot vs policy
 * 3. Retrieval Augmentation Agent – takes applied policy clause from (2), retrieves past cases via cases service
 * Then synthesizes recommendation for HR.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionUser();
  if (!canAccess(user, "cases", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const c = hrCases.find((x) => x.id === id);
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  const incidentDate = c.incidentDate ?? c.createdAt.slice(0, 10);
  const snapshot = getEmployeeSnapshot(c.employeeId, incidentDate);
  if (!snapshot) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // 1. Policy Evaluation Agent (internally calls Semantic Layer Agent)
  const { evaluation: policyEvaluation, semanticLayer } = await runPolicyEvaluationAgent({
    case: c,
    snapshot,
    policyId: "pol-termination",
  });

  // 2. Retrieval Augmentation Agent – input from Policy Evaluation: which clause is applied
  const similarCases = await runRetrievalAugmentationAgent({
    appliedPolicyClauseId: policyEvaluation.appliedClauseId,
  });

  // 3. Governance check for termination synthesis
  const synthesisCheck = governanceCheckBeforeAction({
    agentId: "termination_synthesis",
    actionClass: "recommendation",
    dataScopesUsed: ["policy_evaluation", "similar_cases", "case"],
    toolsUsed: ["readPolicyEvaluation", "readSimilarCases"],
    policyIdsUsed: ["pol-termination"],
    scope: { caseId: id, employeeId: c.employeeId },
  });
  if (!synthesisCheck.allowed) {
    governanceRecordAfterAction({
      agentId: "termination_synthesis",
      actionClass: "recommendation",
      riskLevel: "high",
      scope: { caseId: id, employeeId: c.employeeId },
      outcome: {},
      blastRadius: [id, c.employeeId],
      scopeAllowed: synthesisCheck.scopeEnforcerAllowed,
      actionAllowed: synthesisCheck.actionClassifierAllowed,
      blockReason: synthesisCheck.blockReason,
    });
    return NextResponse.json(
      { error: "Governance blocked termination synthesis", blockReason: synthesisCheck.blockReason },
      { status: 403 }
    );
  }

  // 4. Synthesize recommendation for HR (optional LLM or rule-based)
  const recommendation = await synthesizeRecommendation({
    case: c,
    policyEvaluation,
    similarCases,
    openai,
  });

  governanceRecordAfterAction({
    agentId: "termination_synthesis",
    actionClass: "recommendation",
    riskLevel: "high",
    scope: { caseId: id, employeeId: c.employeeId },
    outcome: { recommendation: recommendation.recommendation },
    decision: recommendation.recommendation,
    blastRadius: [id, c.employeeId],
    scopeAllowed: true,
    actionAllowed: true,
  });

  return NextResponse.json({
    recommendation: recommendation.recommendation,
    summary: recommendation.summary,
    evidence: policyEvaluation.evidence,
    policyViolations: policyEvaluation.policyViolations,
    mitigatingFactors: recommendation.mitigatingFactors,
    similarCases: similarCases.map((s) => ({
      caseId: s.caseId,
      outcome: s.terminationReason,
      similarity: s.similarity,
    })),
    policyEvaluation: {
      appliedPolicyId: policyEvaluation.appliedPolicyId,
      appliedClauseId: policyEvaluation.appliedClauseId,
      appliedClauseName: policyEvaluation.appliedClauseName,
      violated: policyEvaluation.violated,
      inferredCorrectly: policyEvaluation.inferredCorrectly,
      semanticLayerSummary: policyEvaluation.semanticLayerSummary ?? semanticLayer?.inferenceGuidance,
    },
    semanticLayerSummary: semanticLayer?.inferenceGuidance,
  });
}

async function synthesizeRecommendation(params: {
  case: { subject: string; initialFinding?: string };
  policyEvaluation: { violated: boolean; evidence: string[] };
  similarCases: { terminationReason: string }[];
  openai: OpenAI | null;
}): Promise<{
  recommendation: "recommend_termination" | "recommend_warning" | "insufficient_evidence";
  summary: string;
  mitigatingFactors: string[];
}> {
  const { policyEvaluation, similarCases, openai } = params;
  const defaultMitigating = [
    "Consider performance history and prior violations",
    "Employee statement and cooperation",
  ];

  if (!openai) {
    return {
      recommendation: policyEvaluation.violated ? "recommend_termination" : "insufficient_evidence",
      summary:
        policyEvaluation.violated
          ? "Policy evaluation found a violation. Similar past cases support termination. HR should review evidence and policy clause before final decision."
          : "Policy evaluation did not find a clear violation. Review case notes and evidence before proceeding.",
      mitigatingFactors: defaultMitigating,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You synthesize a brief HR recommendation from policy evaluation result and similar cases. Output valid JSON only: recommendation (recommend_termination | recommend_warning | insufficient_evidence), summary (2-3 sentences), mitigatingFactors (string array).",
        },
        {
          role: "user",
          content: `Violated: ${policyEvaluation.violated}. Evidence: ${JSON.stringify(policyEvaluation.evidence)}. Similar cases: ${similarCases.map((s) => s.terminationReason).join("; ")}.`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content");
    const parsed = JSON.parse(content) as {
      recommendation?: string;
      summary?: string;
      mitigatingFactors?: string[];
    };
    return {
      recommendation:
        parsed.recommendation === "recommend_warning"
          ? "recommend_warning"
          : parsed.recommendation === "insufficient_evidence"
            ? "insufficient_evidence"
            : "recommend_termination",
      summary: parsed.summary ?? "Review policy evaluation and similar cases.",
      mitigatingFactors: Array.isArray(parsed.mitigatingFactors) ? parsed.mitigatingFactors : defaultMitigating,
    };
  } catch (err) {
    console.error("Synthesize recommendation error:", err);
    return {
      recommendation: policyEvaluation.violated ? "recommend_termination" : "insufficient_evidence",
      summary: "Review policy evaluation and similar cases above.",
      mitigatingFactors: defaultMitigating,
    };
  }
}
