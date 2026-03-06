import type { GovernedAgentId } from "@/data-layer/types";
import { getScopePolicy } from "@/data-layer/governance-config";

export interface ScopeEnforcerInput {
  agentId: GovernedAgentId;
  /** Data scopes being accessed in this invocation (e.g. employee_snapshot, case). */
  dataScopesUsed: string[];
  /** Tools/APIs being invoked (e.g. readPolicy, getPolicyMetadata). */
  toolsUsed: string[];
  /** Policy IDs referenced, if any. */
  policyIdsUsed: string[];
}

export interface ScopeEnforcerResult {
  allowed: boolean;
  blockReason?: string;
  violations: string[];
}

/**
 * Scope Enforcer Agent: principle of least privilege. Ensures each agent only has access
 * to the tools and data it needs, limiting blast radius of failures or adversarial manipulation.
 */
export function runScopeEnforcerAgent(input: ScopeEnforcerInput): ScopeEnforcerResult {
  const policy = getScopePolicy(input.agentId);
  const violations: string[] = [];

  if (!policy) {
    return { allowed: false, blockReason: "No scope policy defined for agent.", violations: ["missing_policy"] };
  }

  for (const scope of input.dataScopesUsed) {
    if (!policy.allowedDataScopes.includes(scope)) {
      violations.push(`data_scope:${scope}`);
    }
  }
  for (const tool of input.toolsUsed) {
    if (!policy.allowedTools.includes(tool)) {
      violations.push(`tool:${tool}`);
    }
  }
  if (policy.allowedPolicyIds.length > 0) {
    for (const pid of input.policyIdsUsed) {
      if (!policy.allowedPolicyIds.includes(pid)) {
        violations.push(`policy:${pid}`);
      }
    }
  }

  const allowed = violations.length === 0;
  return {
    allowed,
    blockReason: allowed ? undefined : `Scope violation: ${violations.join(", ")}`,
    violations,
  };
}
