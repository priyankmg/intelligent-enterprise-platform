import type {
  GovernedAgentId,
  ActionClass,
  ActionRiskLevel,
  GovernanceEvent,
} from "@/data-layer/types";
import { runActionClassifierAgent } from "@/agents/governance/action-classifier-agent";
import { runScopeEnforcerAgent } from "@/agents/governance/scope-enforcer-agent";
import { runAnomalyDetectionAgent } from "@/agents/governance/anomaly-detection-agent";
import { runPolicyControlAgent } from "@/agents/governance/policy-control-agent";
import { runBiasCorrectionAgent } from "@/agents/governance/bias-correction-agent";
import { appendGovernanceEvent } from "./governance-store";

export interface GovernanceCheckInput {
  agentId: GovernedAgentId;
  actionClass: ActionClass;
  dataScopesUsed: string[];
  toolsUsed: string[];
  policyIdsUsed: string[];
  scope: Record<string, unknown>;
}

export interface GovernanceCheckResult {
  allowed: boolean;
  blockReason?: string;
  actionClassifierAllowed: boolean;
  scopeEnforcerAllowed: boolean;
}

/**
 * Protocol-level check before any governed agent runs. Cannot be bypassed.
 * Returns whether the action is allowed; if not, caller must not execute the agent.
 */
export function governanceCheckBeforeAction(input: GovernanceCheckInput): GovernanceCheckResult {
  const actionResult = runActionClassifierAgent({
    agentId: input.agentId,
    actionClass: input.actionClass,
    scope: input.scope,
  });
  const scopeResult = runScopeEnforcerAgent({
    agentId: input.agentId,
    dataScopesUsed: input.dataScopesUsed,
    toolsUsed: input.toolsUsed,
    policyIdsUsed: input.policyIdsUsed,
  });

  const allowed = actionResult.allowed && scopeResult.allowed;
  const blockReason = !actionResult.allowed
    ? actionResult.blockReason
    : !scopeResult.allowed
      ? scopeResult.blockReason
      : undefined;

  return {
    allowed,
    blockReason,
    actionClassifierAllowed: actionResult.allowed,
    scopeEnforcerAllowed: scopeResult.allowed,
  };
}

/**
 * Record outcome after a governed agent has run. Call only when the agent was allowed and executed.
 */
export function governanceRecordAfterAction(params: {
  agentId: GovernedAgentId;
  actionClass: ActionClass;
  riskLevel: ActionRiskLevel;
  scope: Record<string, unknown>;
  outcome: Record<string, unknown>;
  decision?: string;
  blastRadius: string[];
  scopeAllowed: boolean;
  actionAllowed: boolean;
  blockReason?: string;
}): GovernanceEvent {
  return appendGovernanceEvent({
    ...params,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Run all background governance monitors. Call periodically (e.g. every 5 min) while server is running.
 */
export function runGovernanceBackgroundCycle(): {
  anomaly: { anomaliesFound: number; agentsChecked: number };
  policy: { updated: number; propagated: string[] };
  bias: { findingsCreated: number };
} {
  const anomaly = runAnomalyDetectionAgent();
  const policy = runPolicyControlAgent();
  const bias = runBiasCorrectionAgent();
  return {
    anomaly: { anomaliesFound: anomaly.anomaliesFound, agentsChecked: anomaly.agentsChecked },
    policy: { updated: policy.updated.length, propagated: policy.propagated },
    bias: { findingsCreated: bias.findingsCreated },
  };
}
