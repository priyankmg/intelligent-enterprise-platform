import { Layout } from "@/components/Layout";
import { GovernanceView } from "@/components/GovernanceView";

export default function GovernancePage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Governance Agents</h1>
          <p className="text-[var(--muted)] mt-1 max-w-2xl">
            Action Classifier, Scope Enforcer, Anomaly Detection, Policy Control, and Bias Correction. Events, anomalies, bias findings, and policy versions.
          </p>
        </div>
        <GovernanceView />
      </div>
    </Layout>
  );
}
