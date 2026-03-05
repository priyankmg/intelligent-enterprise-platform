"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Layout } from "@/components/Layout";

type TabId = "healing" | "database" | "pipeline";

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
  source?: "failure" | "schema_change";
}

interface DbCase {
  id: string;
  runId: string;
  runAt: string;
  tableId: string;
  schemaChangeDetected: boolean;
  viewsUpdated?: string[];
  pipelinesUpdated?: string[];
  apiHealingNotified?: boolean;
  pipelineAgentInvoked?: boolean;
  performanceDegraded?: boolean;
  performanceActions?: string[];
}

interface PipelineCase {
  id: string;
  timestamp: string;
  tableId: string;
  updatedPipelineIds: string[];
  message: string;
  triggeredBy: string;
}

function TechAgentsContent() {
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<TabId>(() => (searchParams.get("tab") as TabId) || "healing");
  const setTab = (t: TabId) => {
    setTabState(t);
    const u = new URLSearchParams(searchParams.toString());
    u.set("tab", t);
    window.history.replaceState(null, "", `${window.location.pathname}?${u.toString()}`);
  };
  useEffect(() => {
    const t = searchParams.get("tab") as TabId;
    if (t && ["healing", "database", "pipeline"].includes(t)) setTabState(t);
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tech agents</h1>
        <p className="text-[var(--muted)] mt-1 max-w-2xl">
          API healing, database monitoring, and pipeline healing. Cases are persisted and remain after refresh.
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {(
          [
            { id: "healing" as TabId, label: "API healing" },
            { id: "database" as TabId, label: "Database monitoring" },
            { id: "pipeline" as TabId, label: "Pipeline healing" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === id ? "bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)] border-b-0 -mb-px" : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "healing" && <ApiHealingTab />}
      {tab === "database" && <DatabaseMonitoringTab />}
      {tab === "pipeline" && <PipelineHealingTab />}
    </div>
  );
}

export default function TechAgentsPage() {
  return (
    <Layout>
      <Suspense fallback={<div className="text-[var(--muted)] p-4">Loading…</div>}>
        <TechAgentsContent />
      </Suspense>
    </Layout>
  );
}

function ApiHealingTab() {
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

  const triggerSimulate = async () => {
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
      if (data?.error) setMessage(data.error + (data.message ? ` — ${data.message}` : ""));
      else if (data.failureId) setMessage(data.message || `Case created. Healed: ${data.healed}.`);
      else setMessage(data.message || "No failure triggered.");
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

  const formatTime = (ts: string) => new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Simulate failure & run healing</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Monitors API calls between the middle layer and systems of record. When DB monitoring invokes API healing (schema change), a new case appears here too.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={simulateSystem}
            onChange={(e) => setSimulateSystem(e.target.value as SystemName)}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text)]"
          >
            <option value="erp">ERP (employees)</option>
            <option value="leave">Leave</option>
            <option value="policy">Policy</option>
          </select>
          <button onClick={triggerSimulate} disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? "Triggering…" : "Simulate failure & trigger healing"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-1">API healing cases</h2>
        <p className="text-sm text-[var(--muted)] mb-4">Includes failure-based cases and schema-driven contract updates. Cases are persisted.</p>
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
                  {c.source === "schema_change" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">Schema</span>
                  )}
                  <span className="flex-1 font-medium text-[var(--text)]">{c.title}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${c.status === "healed" ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--warning)]/15 text-[var(--warning)]"}`}>
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
                        <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Steps taken</h4>
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{c.stepsTaken}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Outcome</h4>
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{c.outcome}</p>
                      </div>
                      {c.canRunHealing && (
                        <button onClick={(e) => { e.stopPropagation(); runHealing(c.caseId); }} disabled={loading} className="btn-secondary text-sm !py-1.5 disabled:opacity-50">
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
  );
}

function DatabaseMonitoringTab() {
  const [status, setStatus] = useState<{
    tableId: string;
    schema: { version: string; columnCount: number; columns: { name: string; type: string }[] } | null;
    views: { id: string; name: string; referencedColumns: string[] }[];
    pipelines: { id: string; name: string; referencedColumns: string[] }[];
    indexing: { recentSamples: { rowCount: number; durationMs: number }[]; degradationThresholdMs: number; largeTableThreshold: number };
    lastRun: Record<string, unknown> | null;
    cases: DbCase[];
  } | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [simulateSchemaChange, setSimulateSchemaChange] = useState(false);
  const [injectPerf, setInjectPerf] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  const loadStatus = () => {
    fetch("/api/internal/database-monitoring/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const runAgent = async () => {
    setRunLoading(true);
    setMessage("");
    try {
      const r = await fetch("/api/internal/database-monitoring/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: "erp_employees",
          simulateSchemaChange,
          injectIndexingSample: injectPerf ? { rowCount: 1_000_000, durationMs: 5000 } : undefined,
        }),
        cache: "no-store",
      });
      const data = await r.json().catch(() => ({}));
      if (data?.error) setMessage(data.error + (data.message ? ` — ${data.message}` : ""));
      else setMessage(data.schemaChangeDetected ? "Schema change handled. Check API healing and Pipeline tabs for new cases." : data.performanceDegraded ? "Performance degraded. See actions below." : "Run complete.");
      loadStatus();
    } catch (e) {
      setMessage(String(e));
    }
    setRunLoading(false);
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Run monitoring</h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={simulateSchemaChange} onChange={(e) => setSimulateSchemaChange(e.target.checked)} />
            Simulate schema change (team → department)
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={injectPerf} onChange={(e) => setInjectPerf(e.target.checked)} />
            Simulate degraded indexing (1M rows, 5s)
          </label>
          <button onClick={runAgent} disabled={runLoading} className="btn-primary disabled:opacity-50">
            {runLoading ? "Running…" : "Run database monitoring"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-1">Database monitoring cases</h2>
        <p className="text-sm text-[var(--muted)] mb-4">Each run is recorded and retained. When API healing or pipeline agent is invoked, cases appear in those tabs too.</p>
        <ul className="space-y-2">
          {(!status?.cases || status.cases.length === 0) && <li className="text-[var(--muted)] text-sm py-4">No runs yet.</li>}
          {status?.cases?.map((c) => {
            const isExpanded = expandedCaseId === c.id;
            return (
              <li key={c.id} className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
                <button
                  type="button"
                  onClick={() => setExpandedCaseId(isExpanded ? null : c.id)}
                  className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <span className="font-mono text-xs text-[var(--muted)]">{c.id}</span>
                  <span className="text-xs text-[var(--muted)]">{formatTime(c.runAt)}</span>
                  <span className="flex-1 font-medium text-[var(--text)]">
                    {c.schemaChangeDetected ? "Schema change" : c.performanceDegraded ? "Performance degraded" : "Run"}
                  </span>
                  {c.apiHealingNotified && <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">API healing</span>}
                  {c.pipelineAgentInvoked && <span className="text-xs px-2 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)]">Pipeline</span>}
                  <span className="text-[var(--muted)] text-xs">{isExpanded ? "▼" : "▶"}</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-[var(--border)] bg-[var(--bg)]/40 text-sm space-y-2 mt-2">
                    <p>Table: {c.tableId}. Schema change: {c.schemaChangeDetected ? "Yes" : "No"}. Views updated: {c.viewsUpdated?.join(", ") || "—"}. Pipelines: {c.pipelinesUpdated?.join(", ") || "—"}.</p>
                    <p>API healing notified: {c.apiHealingNotified ? "Yes" : "No"}. Pipeline agent invoked: {c.pipelineAgentInvoked ? "Yes" : "No"}.</p>
                    {c.performanceActions && c.performanceActions.length > 0 && (
                      <ul className="list-disc list-inside text-[var(--text-secondary)]">{c.performanceActions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {status && (
        <>
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Current schema (erp_employees)</h2>
            <p className="text-sm text-[var(--muted)] mb-2">{status.schema ? `Version ${status.schema.version} · ${status.schema.columnCount} columns` : null}</p>
            <ul className="flex flex-wrap gap-2">
              {status.schema?.columns.map((c) => (
                <li key={c.name} className="text-xs px-2 py-1 rounded bg-[var(--surface-hover)] text-[var(--text-secondary)]">{c.name}: {c.type}</li>
              ))}
            </ul>
          </section>
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Indexing</h2>
            <p className="text-sm text-[var(--muted)]">Degradation when duration ≥ {status.indexing.degradationThresholdMs}ms and row count ≥ {status.indexing.largeTableThreshold.toLocaleString()}.</p>
          </section>
        </>
      )}
    </div>
  );
}

function PipelineHealingTab() {
  const [cases, setCases] = useState<PipelineCase[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/internal/pipeline/cases")
      .then((r) => r.json())
      .then((d) => setCases(Array.isArray(d) ? d : []))
      .catch(() => setCases([]));
  }, []);

  const formatTime = (ts: string) => new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Pipeline healing</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          When database monitoring detects a schema change, it invokes the pipeline agent via the tech-stack MCP. Updated reporting pipelines are recorded here. Cases are persisted.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-1">Pipeline cases</h2>
        <ul className="space-y-2">
          {cases.length === 0 && <li className="text-[var(--muted)] text-sm py-4">No pipeline runs yet. Run database monitoring with “Simulate schema change” to trigger the pipeline agent.</li>}
          {cases.map((c) => {
            const isExpanded = expandedId === c.id;
            return (
              <li key={c.id} className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <span className="font-mono text-xs text-[var(--muted)]">{c.id}</span>
                  <span className="text-xs text-[var(--muted)]">{formatTime(c.timestamp)}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)]">{c.triggeredBy}</span>
                  <span className="flex-1 font-medium text-[var(--text)]">Table: {c.tableId}</span>
                  <span className="text-[var(--muted)] text-xs">{isExpanded ? "▼" : "▶"}</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-[var(--border)] bg-[var(--bg)]/40">
                    <p className="text-sm text-[var(--text-secondary)] mt-2">{c.message}</p>
                    <p className="text-sm text-[var(--muted)] mt-1">Pipelines updated: {c.updatedPipelineIds.length ? c.updatedPipelineIds.join(", ") : "—"}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
