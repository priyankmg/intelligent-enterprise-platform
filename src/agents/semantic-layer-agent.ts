import type { PolicyMetadata } from "@/data-layer/types";
import { getPolicyMetadata } from "@/data-layer/policy-metadata";
import Anthropic from "@anthropic-ai/sdk";
import { governanceCheckBeforeAction, governanceRecordAfterAction } from "@/services/governance-orchestrator";

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

export interface SemanticLayerOutput {
  policyId: string;
  policyName: string;
  metadata: PolicyMetadata;
  inferenceGuidance: string;
  definitionsSummary: string;
}

/**
 * Semantic Layer Agent: looks up metadata about policies so the Policy Evaluation
 * Agent can infer policies correctly. Returns definitions, clause semantics, and
 * how-to-infer guidance.
 */
export async function runSemanticLayerAgent(
  policyId: string
): Promise<SemanticLayerOutput | null> {
  const check = governanceCheckBeforeAction({
    agentId: "semantic_layer",
    actionClass: "read_data",
    dataScopesUsed: ["policy_metadata", "policy_definitions"],
    toolsUsed: ["getPolicyMetadata"],
    policyIdsUsed: [policyId],
    scope: { policyId },
  });
  if (!check.allowed) return null;

  const metadata = getPolicyMetadata(policyId);
  if (!metadata) return null;

  const definitionsSummary = Object.entries(metadata.definitions)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const clausesSummary = metadata.clauses
    .map(
      (c) =>
        `[${c.id}] ${c.name}: ${c.description}. Severity: ${c.severityLevel}. How to infer: ${c.howToInferFromSnapshot}`
    )
    .join("\n");

  if (!anthropic) {
    const out = {
      policyId: metadata.policyId,
      policyName: metadata.policyName,
      metadata,
      inferenceGuidance: `Use definitions to interpret case and snapshot. Apply clauses in order: ${metadata.clauses.map((c) => c.id).join(", ")}.`,
      definitionsSummary,
    };
    governanceRecordAfterAction({
      agentId: "semantic_layer",
      actionClass: "read_data",
      riskLevel: "low",
      scope: { policyId },
      outcome: { policyName: out.policyName, clauseCount: metadata.clauses.length },
      blastRadius: [policyId],
      scopeAllowed: true,
      actionAllowed: true,
    });
    return out;
  }

  try {
    const response = await anthropic!.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system:
        "You are a policy semantic layer. Given policy metadata (definitions and clauses), produce a short inference guidance so another agent can correctly infer whether an employee violated the policy. Return only valid JSON, no markdown or explanation.",
      messages: [
        {
          role: "user",
          content: `Policy: ${metadata.policyName}\nDefinitions:\n${definitionsSummary}\n\nClauses:\n${clausesSummary}\n\nProduce a JSON object with: inferenceGuidance (2-3 sentences for correct inference), definitionsSummary (brief).`,
        },
      ],
    });
    const content = response.content[0].type === "text" ? response.content[0].text : null;
    if (!content) return null;
    const parsed = JSON.parse(content) as { inferenceGuidance?: string; definitionsSummary?: string };
    const out = {
      policyId: metadata.policyId,
      policyName: metadata.policyName,
      metadata,
      inferenceGuidance: parsed.inferenceGuidance ?? "Use metadata definitions and clause howToInferFromSnapshot.",
      definitionsSummary: parsed.definitionsSummary ?? definitionsSummary,
    };
    governanceRecordAfterAction({
      agentId: "semantic_layer",
      actionClass: "read_data",
      riskLevel: "low",
      scope: { policyId },
      outcome: { policyName: out.policyName, clauseCount: metadata.clauses.length },
      blastRadius: [policyId],
      scopeAllowed: true,
      actionAllowed: true,
    });
    return out;
  } catch (err) {
    console.error("SemanticLayerAgent error:", err);
    governanceRecordAfterAction({
      agentId: "semantic_layer",
      actionClass: "read_data",
      riskLevel: "low",
      scope: { policyId },
      outcome: { error: String(err) },
      blastRadius: [policyId],
      scopeAllowed: true,
      actionAllowed: true,
    });
    return {
      policyId: metadata.policyId,
      policyName: metadata.policyName,
      metadata,
      inferenceGuidance: "Use definitions and clause howToInferFromSnapshot to infer violations.",
      definitionsSummary,
    };
  }
}
