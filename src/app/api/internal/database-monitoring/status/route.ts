import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { getLastResult } from "@/services/db-monitoring-result-store";
import { listDbMonitoringCases } from "@/services/db-monitoring-cases-store";
import { getCurrentSchema, getAllViews, getAllPipelines } from "@/services/schema-store";
import { getRecentSamples, getDegradationThresholdMs, getLargeTableThreshold } from "@/services/indexing-metrics-store";
import { getIndexingThresholds } from "@/agents/database-monitoring-agent";
import type { TableId } from "@/data-layer/types";

export async function GET() {
  try {
    const user = getSessionUser();
    if (!canAccess(user, "employee_master", "read"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tableId: TableId = "erp_employees";
    const schema = getCurrentSchema(tableId);
    const views = getAllViews();
    const pipelines = getAllPipelines();
    const indexingSamples = getRecentSamples(tableId, 10);
    const thresholds = getIndexingThresholds();
    const lastResult = getLastResult();

    return NextResponse.json({
      tableId,
      schema: schema
        ? {
            version: schema.version,
            detectedAt: schema.detectedAt,
            columnCount: schema.columns.length,
            columns: schema.columns.map((c) => ({ name: c.name, type: c.type })),
          }
        : null,
      views: views.map((v) => ({
        id: v.id,
        name: v.name,
        tableId: v.tableId,
        referencedColumns: v.referencedColumns,
        lastUpdatedAt: v.lastUpdatedAt,
      })),
      pipelines: pipelines.map((p) => ({
        id: p.id,
        name: p.name,
        sourceTableId: p.sourceTableId,
        referencedColumns: p.referencedColumns,
        lastUpdatedAt: p.lastUpdatedAt,
      })),
      indexing: {
        recentSamples: indexingSamples,
        degradationThresholdMs: getDegradationThresholdMs(),
        largeTableThreshold: getLargeTableThreshold(),
      },
      thresholds,
      lastRun: lastResult
        ? {
            runId: lastResult.runId,
            runAt: lastResult.runAt,
            schemaChangeDetected: lastResult.schemaChangeDetected,
            schemaChanges: lastResult.schemaChanges,
            viewsUpdated: lastResult.viewsUpdated,
            pipelinesUpdated: lastResult.pipelinesUpdated,
            apiHealingNotified: lastResult.apiHealingNotified,
            pipelineAgentInvoked: lastResult.pipelineAgentInvoked,
            performanceDegraded: lastResult.performanceDegraded,
            performanceActions: lastResult.performanceActions,
          }
        : null,
      cases: listDbMonitoringCases(50),
    });
  } catch (e) {
    console.error("Database monitoring status error:", e);
    return NextResponse.json(
      { error: "Status failed", message: String(e) },
      { status: 500 }
    );
  }
}
