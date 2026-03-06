import type { GovernedAgentId, PolicyVersionRecord } from "@/data-layer/types";
import { policies } from "@/data-layer/mock-data";
import { getPolicyVersions, upsertPolicyVersion } from "@/services/governance-store";

const AFFECTED_BY_TERMINATION_POLICY: GovernedAgentId[] = [
  "semantic_layer",
  "policy_evaluation",
  "termination_synthesis",
];

/**
 * Policy Control Agent: single authoritative policy repository. Ensures policy updates
 * propagate to all affected agents in a coordinated, verifiable way (no policy drift).
 */
export function runPolicyControlAgent(): {
  updated: PolicyVersionRecord[];
  propagated: string[];
} {
  const updated: PolicyVersionRecord[] = [];
  const propagated: string[] = [];
  const now = new Date().toISOString();

  for (const policy of policies) {
    const existing = getPolicyVersions().find((p) => p.policyId === policy.id);
    const version = policy.version ?? "1.0";
    const changed = !existing || existing.version !== version;

    if (changed) {
      const affectedAgents =
        policy.id === "pol-termination"
          ? AFFECTED_BY_TERMINATION_POLICY
          : (["semantic_layer", "policy_evaluation"] as GovernedAgentId[]);
      const record: PolicyVersionRecord = {
        policyId: policy.id,
        version,
        updatedAt: now,
        affectedAgents,
        propagatedAt: now,
      };
      upsertPolicyVersion(record);
      updated.push(record);
      propagated.push(policy.id);
    }
  }

  return { updated, propagated };
}

export function getPolicyControlStatus(): PolicyVersionRecord[] {
  return getPolicyVersions();
}
