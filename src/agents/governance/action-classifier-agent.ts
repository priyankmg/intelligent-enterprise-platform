import type { ActionClass, ActionRiskLevel, GovernedAgentId } from "@/data-layer/types";
import { actionClassPolicies, getActionPolicy, isRiskBelowOrEqual } from "@/data-layer/governance-config";

export interface ActionClassifierInput {
  agentId: GovernedAgentId;
  actionClass: ActionClass;
  scope: Record<string, unknown>;
}

export interface ActionClassifierResult {
  allowed: boolean;
  riskLevel: ActionRiskLevel;
  blockReason?: string;
}

/**
 * Action Classifier Agent: classifies every agent action by risk and enforces approval threshold.
 * Every action is inspected before execution; cannot be bypassed by a misbehaving agent.
 */
export function runActionClassifierAgent(input: ActionClassifierInput): ActionClassifierResult {
  const policy = getActionPolicy(input.actionClass);
  const riskLevel: ActionRiskLevel = policy?.riskLevel ?? "medium";
  const threshold = policy?.approvalThreshold ?? "high";
  const autoApproveBelow = policy?.autoApproveBelow ?? true;

  const allowed = autoApproveBelow
    ? isRiskBelowOrEqual(riskLevel, threshold)
    : riskLevel === "low" || riskLevel === "medium";

  const blockReason = allowed
    ? undefined
    : `Action class "${input.actionClass}" has risk ${riskLevel} which exceeds approval threshold ${threshold}.`;

  return {
    allowed,
    riskLevel,
    blockReason,
  };
}

export function getActionClassPolicies() {
  return [...actionClassPolicies];
}
