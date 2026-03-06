import type { ApiFailure, HealingTicket, SystemName } from "@/data-layer/types";
import { getFailure, updateFailure } from "@/services/failure-store";
import { createTicket } from "@/services/ticket-store";
import { getContract, updateContract, setContractResponseSchema, setContractRequestSchema } from "@/data-layer/contracts";
import { callErp, callLeave, callPolicy } from "@/data-layer/system-gateway";
import { governanceCheckBeforeAction, governanceRecordAfterAction } from "@/services/governance-orchestrator";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const MAX_ATTEMPTS = 3;

export interface HealingResult {
  failureId: string;
  healed: boolean;
  attempts: number;
  ticketId: string;
  ticketType: "engineering" | "fyi";
  identification?: string;
  fixesTried?: string;
  resolutionNote?: string;
}

/**
 * Self-Healing Agent: analyzes API failure, identifies payload/contract change,
 * updates data contract and retries (up to MAX_ATTEMPTS). Creates ticket for
 * engineering (if not healed) or FYI (if healed).
 */
export type SelfHealingGovernanceBlocked = { blocked: true; blockReason: string };

export async function runSelfHealingAgent(failureId: string): Promise<HealingResult | SelfHealingGovernanceBlocked | null> {
  const failure = getFailure(failureId);
  if (!failure) return null;

  const check = governanceCheckBeforeAction({
    agentId: "self_healing",
    actionClass: "invoke_tool",
    dataScopesUsed: ["failures", "contracts", "api_calls"],
    toolsUsed: ["readFailure", "updateContract", "retryCall", "createTicket"],
    policyIdsUsed: [],
    scope: { failureId },
  });
  if (!check.allowed) {
    governanceRecordAfterAction({
      agentId: "self_healing",
      actionClass: "invoke_tool",
      riskLevel: "medium",
      scope: { failureId },
      outcome: {},
      blastRadius: [failureId],
      scopeAllowed: check.scopeEnforcerAllowed,
      actionAllowed: check.actionClassifierAllowed,
      blockReason: check.blockReason,
    });
    return { blocked: true, blockReason: check.blockReason ?? "Governance blocked" };
  }

  const analysis = await analyzeFailure(failure);
  const attempts = failure.attempts || 0;
  let healed = false;
  const fixesTried: string[] = [];

  for (let attempt = attempts; attempt < MAX_ATTEMPTS && !healed; attempt++) {
    const fix = await proposeContractFix(failure, analysis);
    if (!fix) break;
    fixesTried.push(fix.description);
    applyFix(failure.systemName, fix);
    updateFailure(failureId, { attempts: attempt + 1 });

    const retryOk = await retryCall(failure);
    if (retryOk) {
      healed = true;
      updateFailure(failureId, { healed: true });
      break;
    }
  }

  const ticket = createHealingTicket(failure, {
    healed,
    identification: analysis.summary,
    fixesTried: fixesTried.join("; "),
    resolutionNote: healed
      ? `Agent fixed by: ${fixesTried.join("; ")}. Contract updated and retry succeeded.`
      : `Agent tried ${fixesTried.length} fix(es) without success. Engineering should review failure response and contract.`,
  });
  updateFailure(failureId, { ticketId: ticket.id });

  const result: HealingResult = {
    failureId,
    healed,
    attempts: failure.attempts + 1,
    ticketId: ticket.id,
    ticketType: ticket.type,
    identification: analysis.summary,
    fixesTried: fixesTried.join("; "),
    resolutionNote: ticket.resolutionNote,
  };
  governanceRecordAfterAction({
    agentId: "self_healing",
    actionClass: "invoke_tool",
    riskLevel: "medium",
    scope: { failureId },
    outcome: { healed: result.healed, ticketId: result.ticketId },
    decision: result.healed ? "healed" : "ticket_created",
    blastRadius: [failureId, result.ticketId],
    scopeAllowed: true,
    actionAllowed: true,
  });
  return result;
}

async function analyzeFailure(failure: ApiFailure): Promise<{ summary: string; suggestedResponseSchema?: unknown; suggestedRequestSchema?: unknown }> {
  const contract = getContract(failure.systemName);
  const payload = {
    kind: failure.kind,
    errorMessage: failure.errorMessage,
    responseBody: failure.responseBody,
    requestPayload: failure.requestPayload,
    expectedResponseSchema: contract.responseSchema,
    expectedRequestSchema: contract.requestSchema,
  };

  if (!anthropic) {
    return mockAnalyze(failure);
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system:
        "You analyze API integration failures. Identify what changed in the payload: new/renamed/removed fields, or what the system now expects. Return only valid JSON, no markdown or explanation. Output JSON: summary (2-3 sentences), suggestedResponseSchema (if response_contract_changed: JSON Schema that matches the new response), suggestedRequestSchema (if request_rejected: schema for request that system expects).",
      messages: [
        { role: "user", content: JSON.stringify(payload, null, 2) },
      ],
    });
    const content = response.content[0].type === "text" ? response.content[0].text : null;
    if (!content) return mockAnalyze(failure);
    return JSON.parse(content) as { summary: string; suggestedResponseSchema?: unknown; suggestedRequestSchema?: unknown };
  } catch (err) {
    console.error("SelfHealing analyze error:", err);
    return mockAnalyze(failure);
  }
}

function mockAnalyze(failure: ApiFailure): { summary: string; suggestedResponseSchema?: unknown; suggestedRequestSchema?: unknown } {
  if (failure.kind === "response_contract_changed") {
    if (failure.systemName === "erp") {
      return {
        summary: "ERP response now uses employeeId/fullName/hireDate/department instead of id/name/dateOfHire/team.",
        suggestedResponseSchema: {
          type: "object",
          properties: {
            employeeId: { type: "string" },
            fullName: { type: "string" },
            emailAddress: { type: "string" },
            hireDate: { type: "string" },
            department: { type: "string" },
            level: { type: "string" },
            location: { type: "string" },
          },
          required: ["employeeId", "fullName", "emailAddress", "hireDate", "department", "level"],
        },
      };
    }
    if (failure.systemName === "policy") {
      return {
        summary: "Policy response now uses 'content' instead of 'body' for policy text.",
        suggestedResponseSchema: { type: "object", properties: { content: { type: "string" } }, responseAllowAdditional: true },
      };
    }
  }
  if (failure.kind === "request_rejected" && failure.systemName === "leave") {
    return {
      summary: "Leave API v2 expects 'empId' instead of 'employeeId' in request.",
      suggestedRequestSchema: { type: "object", properties: { empId: { type: "string" } }, required: ["empId"] },
    };
  }
  return { summary: failure.errorMessage };
}

interface ContractFix {
  description: string;
  responseSchema?: Record<string, unknown>;
  requestSchema?: Record<string, unknown>;
  version?: string;
}

async function proposeContractFix(
  failure: ApiFailure,
  analysis: { suggestedResponseSchema?: unknown; suggestedRequestSchema?: unknown }
): Promise<ContractFix | null> {
  if (failure.kind === "response_contract_changed" && analysis.suggestedResponseSchema) {
    return {
      description: `Update response schema for ${failure.systemName} to match new system contract`,
      responseSchema: analysis.suggestedResponseSchema as Record<string, unknown>,
      version: `${getContract(failure.systemName).version}-healed`,
    };
  }
  if (failure.kind === "request_rejected" && analysis.suggestedRequestSchema) {
    return {
      description: `Update request schema for ${failure.systemName} (e.g. empId instead of employeeId)`,
      requestSchema: analysis.suggestedRequestSchema as Record<string, unknown>,
      version: `${getContract(failure.systemName).version}-healed`,
    };
  }
  return null;
}

function applyFix(systemName: SystemName, fix: ContractFix): void {
  if (fix.responseSchema) setContractResponseSchema(systemName, fix.responseSchema, fix.version);
  if (fix.requestSchema) setContractRequestSchema(systemName, fix.requestSchema, fix.version);
  if (fix.version && !fix.responseSchema && !fix.requestSchema) updateContract(systemName, { version: fix.version });
}

async function retryCall(failure: ApiFailure): Promise<boolean> {
  if (failure.systemName === "erp") {
    const r = callErp(failure.endpoint);
    return r.ok;
  }
  if (failure.systemName === "leave") {
    const params = (failure.requestPayload as { employeeId?: string }) ?? {};
    const r = callLeave(failure.endpoint, params);
    return r.ok;
  }
  if (failure.systemName === "policy") {
    const r = callPolicy(failure.endpoint);
    return r.ok;
  }
  return false;
}

function createHealingTicket(
  failure: ApiFailure,
  opts: { healed: boolean; identification?: string; fixesTried?: string; resolutionNote?: string }
): HealingTicket {
  const type = opts.healed ? "fyi" : "engineering";
  const title = opts.healed
    ? `[FYI] Self-Healing fixed: ${failure.systemName} API at ${failure.endpoint}`
    : `[Action] Self-Healing could not fix: ${failure.systemName} API at ${failure.endpoint}`;
  const body = [
    `Failure ID: ${failure.id}`,
    `Time: ${failure.timestamp}`,
    `System: ${failure.systemName} | Endpoint: ${failure.endpoint} | Kind: ${failure.kind}`,
    `Error: ${failure.errorMessage}`,
    opts.identification && `Agent identification: ${opts.identification}`,
    opts.fixesTried && `What the agent tried: ${opts.fixesTried}`,
    opts.resolutionNote && `Resolution note: ${opts.resolutionNote}`,
  ]
    .filter(Boolean)
    .join("\n");

  return createTicket({
    type,
    systemName: failure.systemName,
    failureId: failure.id,
    title,
    body,
    agentIdentification: opts.identification,
    agentAttempts: opts.fixesTried,
    resolutionNote: opts.resolutionNote,
  });
}
