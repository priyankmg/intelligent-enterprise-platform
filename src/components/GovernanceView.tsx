"use client";

import { useEffect, useState } from "react";

interface GovernanceEventRow {
  id: string;
  agentId: string;
  timestamp: string;
  actionClass: string;
  riskLevel: string;
  decision?: string;
  scopeAllowed: boolean;
  actionAllowed: boolean;
  blockReason?: string;
}

interface GovernanceAnomalyRow {
  id: string;
  agentId: string;
  timestamp: string;
  type: string;
  description: string;
  severity: string;
  acknowledged: boolean;
}

interface GovernanceBiasRow {
  id: string;
  source: string;
  timestamp: string;
  description: string;
  severity: string;
  acknowledged: boolean;
}

interface ActionClassifierAgentRow {
  agentId: string;
  label: string;
  authorized: { read: boolean; write: boolean; delete: boolean };
  last7Days: { read: number; write: number; delete: number };
}

export function GovernanceView() {
  const [status, setStatus] = useState<{
    events: GovernanceEventRow[];
    anomalies: GovernanceAnomalyRow[];
    biasFindings: GovernanceBiasRow[];
    policyVersions: { policyId: string; version: string; updatedAt: string; propagatedAt?: string }[];
    actionClassifierSummary?: ActionClassifierAgentRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycleMessage, setCycleMessage] = useState("");
  const [cycleLoading, setCycleLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/internal/governance/status")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const runCycle = async () => {
    setCycleLoading(true);
    setCycleMessage("");
    try {
      const r = await fetch("/api/internal/governance/cycle", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      setCycleMessage(
        d.anomaly
          ? `Cycle ran: ${d.anomaly.anomaliesFound} anomalies, ${d.policy?.updated ?? 0} policy updates, ${d.bias?.findingsCreated ?? 0} bias findings.`
          : d.error || "Cycle completed."
      );
      load();
    } catch (e) {
      setCycleMessage(String(e));
    }
    setCycleLoading(false);
  };

  const formatTimeGov = (ts: string) => new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  if (loading || !status) {
    return (
      <div className="card p-6">
        <p className="text-[var(--muted)]">{loading ? "Loading…" : "Failed to load governance status."}</p>
      </div>
    );
  }

  const actionSummary = status.actionClassifierSummary ?? [];

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-2">Governance plane</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Action Classifier, Scope Enforcer, Anomaly Detection, Policy Control, and Bias Correction agents monitor the 5 AI agents and the Career Trajectory ML model. Run a cycle to refresh anomaly, policy, and bias checks.
        </p>
        <button onClick={runCycle} disabled={cycleLoading} className="btn-primary disabled:opacity-50">
          {cycleLoading ? "Running…" : "Run governance cycle"}
        </button>
        {cycleMessage && <p className="mt-2 text-sm text-[var(--muted)]">{cycleMessage}</p>}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-2">Action Classifier Agent</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Governed agents and the action types they are authorized to perform (read, write, delete). Last 7 days: transaction count per type. If an agent has delete operation it will require a human in the loop to approve.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-3 py-2 font-semibold text-[var(--text-secondary)]">Agent</th>
                <th className="px-3 py-2 font-semibold text-[var(--text-secondary)]">Authorized</th>
                <th className="px-3 py-2 font-semibold text-[var(--text-secondary)]">Last 7 days (transactions)</th>
              </tr>
            </thead>
            <tbody>
              {actionSummary.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-[var(--muted)]">
                    No agent summary. Ensure governance status returns actionClassifierSummary.
                  </td>
                </tr>
              )}
              {actionSummary.map((row) => (
                <tr key={row.agentId} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-3 font-medium text-[var(--text)]">{row.label}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">
                    <span className="inline-flex flex-wrap gap-2">
                      <span className={row.authorized.read ? "text-[var(--success)]" : "text-[var(--muted)]"}>
                        Read {row.authorized.read ? "✓" : "—"}
                      </span>
                      <span className={row.authorized.write ? "text-[var(--success)]" : "text-[var(--muted)]"}>
                        Write {row.authorized.write ? "✓" : "—"}
                      </span>
                      <span className={row.authorized.delete ? "text-[var(--success)]" : "text-[var(--muted)]"}>
                        Delete {row.authorized.delete ? "✓" : "—"}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">
                    <span className="inline-flex flex-wrap gap-4">
                      <span>Read: <strong className="text-[var(--text)]">{row.last7Days.read}</strong></span>
                      <span>Write: <strong className="text-[var(--text)]">{row.last7Days.write}</strong></span>
                      <span>Delete: <strong className="text-[var(--text)]">{row.last7Days.delete}</strong></span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-1">Recent governed events</h2>
        <p className="text-xs text-[var(--muted)] mb-3">Scope, outcome, decision, and blast radius for each agent/ML invocation.</p>
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {(status.events ?? []).length === 0 && <li className="text-[var(--muted)] text-sm py-2">No events yet. Use career trajectory, termination review, assistant, or healing to generate events.</li>}
          {(status.events ?? []).slice(0, 30).map((e) => (
            <li key={e.id} className="text-xs py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="font-mono text-[var(--muted)]">{e.agentId}</span>
              {" · "}
              <span>{e.actionClass}</span>
              {" · "}
              <span className="text-[var(--muted)]">{formatTimeGov(e.timestamp)}</span>
              {e.decision != null && <span> · {e.decision}</span>}
              {!e.actionAllowed || !e.scopeAllowed ? <span className="text-[var(--danger)]"> · Blocked</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-1">Anomalies</h2>
        <ul className="space-y-2">
          {(status.anomalies ?? []).length === 0 && <li className="text-[var(--muted)] text-sm py-2">No anomalies. Run a governance cycle to check.</li>}
          {(status.anomalies ?? []).slice(0, 10).map((a) => (
            <li key={a.id} className="rounded border border-[var(--border)] p-3 text-sm">
              <span className="font-mono text-[var(--muted)]">{a.agentId}</span> · <span className="font-medium">{a.type}</span> · {a.severity}
              <p className="mt-1 text-[var(--text-secondary)]">{a.description}</p>
              <span className="text-xs text-[var(--muted)]">{formatTimeGov(a.timestamp)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-1">Bias findings</h2>
        <ul className="space-y-2">
          {(status.biasFindings ?? []).length === 0 && <li className="text-[var(--muted)] text-sm py-2">No bias findings. Run a governance cycle to check.</li>}
          {(status.biasFindings ?? []).slice(0, 10).map((b) => (
            <li key={b.id} className="rounded border border-[var(--border)] p-3 text-sm">
              <span className="font-mono text-[var(--muted)]">{b.source}</span> · {b.severity}
              <p className="mt-1 text-[var(--text-secondary)]">{b.description}</p>
              <span className="text-xs text-[var(--muted)]">{formatTimeGov(b.timestamp)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-1">Policy versions</h2>
        <p className="text-xs text-[var(--muted)] mb-2">Policy Control Agent keeps policy versions and affected agents in sync.</p>
        <ul className="space-y-1">
          {(status.policyVersions ?? []).length === 0 && <li className="text-[var(--muted)] text-sm py-2">No policy version records yet. Run a governance cycle.</li>}
          {(status.policyVersions ?? []).map((p) => (
            <li key={p.policyId} className="text-sm">
              <span className="font-mono">{p.policyId}</span> v{p.version} · {formatTimeGov(p.updatedAt)}
              {p.propagatedAt != null && <span className="text-[var(--success)] text-xs ml-2">propagated</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
