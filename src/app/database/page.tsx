"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";

interface SchemaChange {
  type: string;
  columnName: string;
  newColumnName?: string;
  newType?: string;
}

interface LastRun {
  runId: string;
  runAt: string;
  schemaChangeDetected: boolean;
  schemaChanges?: SchemaChange[];
  viewsUpdated?: string[];
  pipelinesUpdated?: string[];
  apiHealingNotified?: boolean;
  pipelineAgentInvoked?: boolean;
  performanceDegraded?: boolean;
  performanceActions?: string[];
}

interface Status {
  tableId: string;
  schema: { version: string; columnCount: number; columns: { name: string; type: string }[] } | null;
  views: { id: string; name: string; referencedColumns: string[]; lastUpdatedAt: string }[];
  pipelines: { id: string; name: string; referencedColumns: string[]; lastUpdatedAt: string }[];
  indexing: {
    recentSamples: { rowCount: number; durationMs: number; sampledAt: string }[];
    degradationThresholdMs: number;
    largeTableThreshold: number;
  };
  lastRun: LastRun | null;
}

export default function DatabaseMonitoringPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [simulateSchemaChange, setSimulateSchemaChange] = useState(false);
  const [injectPerf, setInjectPerf] = useState(false);

  const loadStatus = () => {
    fetch("/api/internal/database-monitoring/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const runAgent = async (opts: { simulateSchemaChange?: boolean; injectIndexingSample?: { rowCount: number; durationMs: number } }) => {
    setRunLoading(true);
    setMessage("");
    try {
      const r = await fetch("/api/internal/database-monitoring/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: "erp_employees",
          simulateSchemaChange: opts.simulateSchemaChange ?? false,
          injectIndexingSample: opts.injectIndexingSample,
        }),
        cache: "no-store",
      });
      const data = await r.json().catch(() => ({}));
      if (data?.error) {
        setMessage(data.error + (data.message ? ` — ${data.message}` : ""));
      } else {
        setMessage(
          data.schemaChangeDetected
            ? `Schema change detected. Views updated: ${(data.viewsUpdated ?? []).join(", ") || "—"}. Pipelines: ${(data.pipelinesUpdated ?? []).join(", ") || "—"}. API healing notified: ${data.apiHealingNotified}. Pipeline agent invoked: ${data.pipelineAgentInvoked}.`
            : data.performanceDegraded
              ? `Performance degraded. Actions: ${(data.performanceActions ?? []).join(" ")}`
              : "Run complete. No schema change or degradation detected."
        );
      }
      loadStatus();
    } catch (e) {
      setMessage(String(e));
    }
    setRunLoading(false);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Database Monitoring Agent</h1>
          <p className="text-[var(--muted)] mt-1 max-w-2xl">
            Monitors ERP datatable schemas for changes. When schema changes (new/renamed/removed column or type/rules change), it updates impacted views and pipeline queries, notifies the API healing agent via the tech-stack MCP to update data contracts, and invokes the pipeline agent for reporting pipelines. Also monitors indexing performance and suggests caching or priority indexing when latency degrades.
          </p>
        </div>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Run monitoring</h2>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={simulateSchemaChange}
                onChange={(e) => setSimulateSchemaChange(e.target.checked)}
              />
              Simulate schema change (team → department)
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={injectPerf}
                onChange={(e) => setInjectPerf(e.target.checked)}
              />
              Simulate degraded indexing (1M rows, 5s)
            </label>
            <button
              onClick={() =>
                runAgent({
                  simulateSchemaChange,
                  injectIndexingSample: injectPerf ? { rowCount: 1_000_000, durationMs: 5000 } : undefined,
                })
              }
              disabled={runLoading}
              className="btn-primary disabled:opacity-50"
            >
              {runLoading ? "Running…" : "Run database monitoring"}
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>}
        </section>

        {status?.lastRun && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Last run</h2>
            <dl className="grid gap-2 sm:grid-cols-2 text-sm">
              <dt className="text-[var(--muted)]">Run ID</dt>
              <dd className="font-mono">{status.lastRun.runId}</dd>
              <dt className="text-[var(--muted)]">Time</dt>
              <dd>{new Date(status.lastRun.runAt).toLocaleString()}</dd>
              <dt className="text-[var(--muted)]">Schema change detected</dt>
              <dd>{status.lastRun.schemaChangeDetected ? "Yes" : "No"}</dd>
              {status.lastRun.schemaChanges && status.lastRun.schemaChanges.length > 0 && (
                <>
                  <dt className="text-[var(--muted)]">Changes</dt>
                  <dd className="text-[var(--text-secondary)]">
                    {status.lastRun.schemaChanges.map((c) =>
                      c.type === "column_renamed" && c.newColumnName
                        ? `${c.columnName} → ${c.newColumnName}`
                        : `${c.type}: ${c.columnName}`
                    ).join("; ")}
                  </dd>
                </>
              )}
              {status.lastRun.viewsUpdated && status.lastRun.viewsUpdated.length > 0 && (
                <>
                  <dt className="text-[var(--muted)]">Views updated</dt>
                  <dd>{status.lastRun.viewsUpdated.join(", ")}</dd>
                </>
              )}
              {status.lastRun.pipelinesUpdated && status.lastRun.pipelinesUpdated.length > 0 && (
                <>
                  <dt className="text-[var(--muted)]">Pipelines updated</dt>
                  <dd>{status.lastRun.pipelinesUpdated.join(", ")}</dd>
                </>
              )}
              <dt className="text-[var(--muted)]">API healing notified</dt>
              <dd>{status.lastRun.apiHealingNotified ? "Yes" : "No"}</dd>
              <dt className="text-[var(--muted)]">Pipeline agent invoked</dt>
              <dd>{status.lastRun.pipelineAgentInvoked ? "Yes" : "No"}</dd>
              <dt className="text-[var(--muted)]">Performance degraded</dt>
              <dd>{status.lastRun.performanceDegraded ? "Yes" : "No"}</dd>
            </dl>
            {status.lastRun.performanceActions && status.lastRun.performanceActions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Performance actions</h3>
                <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1">
                  {status.lastRun.performanceActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {status && (
          <>
            <section className="card p-6">
              <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Current schema (erp_employees)</h2>
              {status.schema ? (
                <p className="text-sm text-[var(--muted)] mb-2">
                  Version {status.schema.version} · {status.schema.columnCount} columns
                </p>
              ) : null}
              <ul className="flex flex-wrap gap-2">
                {status.schema?.columns.map((c) => (
                  <li key={c.name} className="text-xs px-2 py-1 rounded bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                    {c.name}: {c.type}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-6">
              <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Views & pipelines</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Views</h3>
                  <ul className="space-y-2 text-sm">
                    {status.views.map((v) => (
                      <li key={v.id}>
                        <span className="font-medium text-[var(--text)]">{v.name}</span>
                        <span className="text-[var(--muted)] ml-2">({v.referencedColumns.join(", ")})</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Pipelines</h3>
                  <ul className="space-y-2 text-sm">
                    {status.pipelines.map((p) => (
                      <li key={p.id}>
                        <span className="font-medium text-[var(--text)]">{p.name}</span>
                        <span className="text-[var(--muted)] ml-2">({p.referencedColumns.join(", ")})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Indexing thresholds</h2>
              <p className="text-sm text-[var(--muted)]">
                Degradation when duration ≥ {status.indexing.degradationThresholdMs}ms and row count ≥ {status.indexing.largeTableThreshold.toLocaleString()}.
              </p>
              {status.indexing.recentSamples.length > 0 && (
                <p className="text-sm text-[var(--text-secondary)] mt-2">
                  Recent samples: {status.indexing.recentSamples.map((s) => `${s.rowCount.toLocaleString()} rows, ${s.durationMs}ms`).join("; ")}
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
