import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { runDatabaseMonitoringAgent } from "@/agents/database-monitoring-agent";
import { setLastResult } from "@/services/db-monitoring-result-store";
import { recordDbMonitoringCase } from "@/services/db-monitoring-cases-store";
import type { TableId, TableColumnDef } from "@/data-layer/types";
import { getCurrentSchema } from "@/services/schema-store";

/**
 * Run the Database Monitoring Agent.
 * Body (optional):
 * - tableId: "erp_employees" | "erp_leave" | "erp_policies"
 * - simulateSchemaChange: if true, inject a schema change (e.g. add column "department" as alias for "team") to trigger view/pipeline/API healing flow
 * - injectIndexingSample: { rowCount, durationMs } to simulate large table / degraded indexing and get performance actions
 */
export async function POST(request: Request) {
  try {
    const user = getSessionUser();
    if (!canAccess(user, "employee_master", "read"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const tableId = (body.tableId ?? "erp_employees") as TableId;
    const simulateSchemaChange = !!body.simulateSchemaChange;
    const injectIndexingSample = body.injectIndexingSample as
      | { rowCount: number; durationMs: number }
      | undefined;

    let erpSchemaProvider: ((t: TableId) => TableColumnDef[]) | undefined;
    if (simulateSchemaChange && tableId === "erp_employees") {
      const current = getCurrentSchema("erp_employees");
      const baseColumns = current?.columns ?? [];
      erpSchemaProvider = (t: TableId) => {
        if (t !== "erp_employees") return baseColumns;
        return [
          ...baseColumns.map((c) =>
            c.name === "team"
              ? { ...c, name: "department", valueRules: "renamed from team" }
              : { ...c }
          ),
        ];
      };
    }

    const result = await runDatabaseMonitoringAgent({
      tableId,
      erpSchemaProvider,
      injectIndexingSample,
    });
    setLastResult(result);
    recordDbMonitoringCase(result, tableId);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Database monitoring run error:", e);
    return NextResponse.json(
      { error: "Database monitoring failed", message: String(e) },
      { status: 500 }
    );
  }
}
