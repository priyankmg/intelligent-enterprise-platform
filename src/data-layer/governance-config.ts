import type { ActionClassPolicy, AgentScopePolicy, GovernedAgentId, ActionRiskLevel } from "./types";

/**
 * Action Classifier: risk profile and approval threshold per action class.
 * Enforced at protocol level before any agent action executes.
 */
export const actionClassPolicies: ActionClassPolicy[] = [
  { actionClass: "read_data", riskLevel: "low", approvalThreshold: "high", autoApproveBelow: true },
  { actionClass: "write_record", riskLevel: "medium", approvalThreshold: "high", autoApproveBelow: true },
  { actionClass: "delete_record", riskLevel: "high", approvalThreshold: "high", autoApproveBelow: false },
  { actionClass: "invoke_tool", riskLevel: "medium", approvalThreshold: "high", autoApproveBelow: true },
  { actionClass: "trigger_workflow", riskLevel: "high", approvalThreshold: "high", autoApproveBelow: false },
  { actionClass: "send_notification", riskLevel: "high", approvalThreshold: "critical", autoApproveBelow: true },
  { actionClass: "recommendation", riskLevel: "medium", approvalThreshold: "high", autoApproveBelow: true },
];

const riskOrder: Record<ActionRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export function isRiskBelowOrEqual(a: ActionRiskLevel, b: ActionRiskLevel): boolean {
  return riskOrder[a] <= riskOrder[b];
}

/**
 * Scope Enforcer: least-privilege scope per agent. Each agent only has access to listed data/tools.
 */
export const agentScopePolicies: AgentScopePolicy[] = [
  {
    agentId: "semantic_layer",
    allowedDataScopes: ["policy_metadata", "policy_definitions"],
    allowedTools: ["getPolicyMetadata"],
    allowedPolicyIds: ["pol-termination", "pol-1", "pol-2"],
  },
  {
    agentId: "policy_evaluation",
    allowedDataScopes: ["policy_metadata", "policy_definitions", "employee_snapshot", "case"],
    allowedTools: ["getPolicyMetadata", "readPolicy", "readSnapshot", "readCase"],
    allowedPolicyIds: ["pol-termination"],
  },
  {
    agentId: "termination_synthesis",
    allowedDataScopes: ["policy_evaluation", "similar_cases", "case"],
    allowedTools: ["readPolicyEvaluation", "readSimilarCases"],
    allowedPolicyIds: ["pol-termination"],
  },
  {
    agentId: "ai_assistant",
    allowedDataScopes: ["employee_count", "leave_balance", "attendance", "terminated_list", "failures", "tickets"],
    allowedTools: ["queryDashboard", "simulateHealing", "simulateDatabaseMonitoring"],
    allowedPolicyIds: [],
  },
  {
    agentId: "self_healing",
    allowedDataScopes: ["failures", "contracts", "api_calls"],
    allowedTools: ["readFailure", "updateContract", "retryCall", "createTicket"],
    allowedPolicyIds: [],
  },
  {
    agentId: "career_trajectory",
    allowedDataScopes: ["employee_snapshot", "performance", "leave", "cases", "training", "career_reference_data"],
    allowedTools: ["buildCareerSnapshot", "kNNPredict"],
    allowedPolicyIds: [],
  },
];

export function getScopePolicy(agentId: GovernedAgentId): AgentScopePolicy | undefined {
  return agentScopePolicies.find((p) => p.agentId === agentId);
}

export function getActionPolicy(actionClass: string): ActionClassPolicy | undefined {
  return actionClassPolicies.find((p) => p.actionClass === actionClass);
}

/** Per-agent authorized action types (read / write / delete) for Action Classifier display. */
export const agentAuthorizedActions: Record<
  GovernedAgentId,
  { read: boolean; write: boolean; delete: boolean }
> = {
  semantic_layer: { read: true, write: false, delete: false },
  policy_evaluation: { read: true, write: false, delete: false },
  termination_synthesis: { read: true, write: false, delete: false },
  ai_assistant: { read: true, write: false, delete: false },
  self_healing: { read: true, write: true, delete: false },
  career_trajectory: { read: true, write: false, delete: false },
};

export const governedAgentLabels: Record<GovernedAgentId, string> = {
  semantic_layer: "Semantic Layer Agent",
  policy_evaluation: "Policy Evaluation Agent",
  termination_synthesis: "Termination Synthesis Agent",
  ai_assistant: "AI Assistant",
  self_healing: "Self-healing Agent",
  career_trajectory: "Career Trajectory",
};
