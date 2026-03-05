"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";

type SystemName = "erp" | "leave" | "policy";

interface HealingCase {
  caseId: string;
  timestamp: string;
  title: string;
  status: "healed" | "requires_attention";
  issueDescription: string;
  stepsTaken: string;
  outcome: string;
  systemName: string;
  kind: string;
  endpoint: string;
  ticketId?: string;
  canRunHealing: boolean;
}

export default function HealingPage() {
  const [cases, setCases] = useState<HealingCase[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [simulateSystem, setSimulateSystem] = useState<SystemName>("erp");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadCases = () => {
    fetch("/api/internal/healing/cases")
      .then((r) => r.json())
      .then((d) => setCases(Array.isArray(d) ? d : []))
      .catch(() => setCases([]));
  };

  useEffect(() => {
    loadCases();
  }, []);

  const triggerSimulateAndHeal = async () => {
    setLoading(true);
    setMessage("");
    try {
      const r = await fetch("/api/internal/healing/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: simulateSystem }),
        cache: "no-store",
      });
      const data = await r.json().catch(() => ({}));
      if (data?.error) {
        setMessage(data.error + (data.message ? ` — ${data.message}` : ""));
      } else if (data.failureId) {
        setMessage(data.message || `Case created. Healed: ${data.healed}.`);
      } else {
        setMessage(data.message || "No failure triggered. Try again.");
      }
      loadCases();
    } catch (e) {
      setMessage(String(e));
    }
    setLoading(false);
  };

  const runHealing = async (caseId: string) => {
    setLoading(true);
    try {
      const r = await fetch("/api/internal/healing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ failureId: caseId }),
      });
      const d = await r.json();
      setMessage(d.healed ? `Healed: ${caseId}` : `Healing ran for ${caseId}.`);
      loadCases();
    } catch (e) {
      setMessage(String(e));
    }
    setLoading(false);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Self-Healing Agent</h1>
          <p className="text-[var(--muted)] mt-1 max-w-2xl">
            Monitors API calls between the middle layer and systems of record (ERP, Leave, Policy). When a request fails due to payload/contract change, the agent analyzes the failure, updates the data contract, retries (2–3 attempts), and creates a ticket for engineering (if not healed) or FYI (if healed).
          </p>
        </div>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Simulate failure & run healing</h2>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={simulateSystem}
              onChange={(e) => setSimulateSystem(e.target.value as SystemName)}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="erp">ERP (employees)</option>
              <option value="leave">Leave</option>
              <option value="policy">Policy</option>
            </select>
            <button
              onClick={triggerSimulateAndHeal}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "Triggering…" : "Simulate failure & trigger healing"}
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>}
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-1">Healing cases</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Click a case to expand and see issue description, steps taken by the agent, and outcome.
          </p>
          <ul className="space-y-2">
            {cases.length === 0 && <li className="text-[var(--muted)] text-sm py-4">No cases yet.</li>}
            {cases.map((c) => {
              const isExpanded = expandedId === c.caseId;
              return (
                <li key={c.caseId} className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : c.caseId)}
                    className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <span className="font-mono text-xs text-[var(--muted)]">{c.caseId}</span>
                    <span className="text-xs text-[var(--muted)]">{formatTime(c.timestamp)}</span>
                    <span className="flex-1 font-medium text-[var(--text)]">{c.title}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        c.status === "healed" ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--warning)]/15 text-[var(--warning)]"
                      }`}
                    >
                      {c.status === "healed" ? "Healed" : "Requires attention"}
                    </span>
                    <span className="text-[var(--muted)] text-xs">{isExpanded ? "▼" : "▶"}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-[var(--border)] bg-[var(--bg)]/40">
                      <div className="grid gap-4 mt-3">
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Issue description</h4>
                          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{c.issueDescription}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Steps taken by agent</h4>
                          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{c.stepsTaken}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Outcome</h4>
                          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{c.outcome}</p>
                        </div>
                        {c.canRunHealing && (
                          <button
                            onClick={(e) => { e.stopPropagation(); runHealing(c.caseId); }}
                            disabled={loading}
                            className="btn-secondary text-sm !py-1.5 disabled:opacity-50"
                          >
                            Run healing
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Layout>
  );
}
