import type { PolicyMetadata } from "@/data-layer/types";
import { getPolicyMetadata } from "@/data-layer/policy-metadata";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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

  if (!openai) {
    return {
      policyId: metadata.policyId,
      policyName: metadata.policyName,
      metadata,
      inferenceGuidance: `Use definitions to interpret case and snapshot. Apply clauses in order: ${metadata.clauses.map((c) => c.id).join(", ")}.`,
      definitionsSummary,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a policy semantic layer. Given policy metadata (definitions and clauses), produce a short inference guidance so another agent can correctly infer whether an employee violated the policy. Output valid JSON only.",
        },
        {
          role: "user",
          content: `Policy: ${metadata.policyName}\nDefinitions:\n${definitionsSummary}\n\nClauses:\n${clausesSummary}\n\nProduce a JSON object with: inferenceGuidance (2-3 sentences for correct inference), definitionsSummary (brief).`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { inferenceGuidance?: string; definitionsSummary?: string };
    return {
      policyId: metadata.policyId,
      policyName: metadata.policyName,
      metadata,
      inferenceGuidance: parsed.inferenceGuidance ?? "Use metadata definitions and clause howToInferFromSnapshot.",
      definitionsSummary: parsed.definitionsSummary ?? definitionsSummary,
    };
  } catch (err) {
    console.error("SemanticLayerAgent error:", err);
    return {
      policyId: metadata.policyId,
      policyName: metadata.policyName,
      metadata,
      inferenceGuidance: "Use definitions and clause howToInferFromSnapshot to infer violations.",
      definitionsSummary,
    };
  }
}
