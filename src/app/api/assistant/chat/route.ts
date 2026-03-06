import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { employees, attendanceToday, leaveBalances } from "@/data-layer/mock-data";
import { setSimulateFailure, callErp, callLeave, callPolicy } from "@/data-layer/system-gateway";
import { runSelfHealingAgent } from "@/agents/self-healing-agent";
import { governanceCheckBeforeAction, governanceRecordAfterAction } from "@/services/governance-orchestrator";
import { runDatabaseMonitoringAgent } from "@/agents/database-monitoring-agent";
import { recordDbMonitoringCase } from "@/services/db-monitoring-cases-store";
import { setLastResult } from "@/services/db-monitoring-result-store";
import { getCurrentSchema } from "@/services/schema-store";
import type { SystemName, TableColumnDef } from "@/data-layer/types";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

type Intent =
  | "get_employee_count"
  | "get_low_leave_count"
  | "get_present_today_count"
  | "get_terminated_count"
  | "simulate_healing"
  | "simulate_database_monitoring"
  | "general";

function getEmployeeCount(): number {
  return employees.length;
}

function getLowLeaveBalanceCount(): number {
  let count = 0;
  for (const emp of employees) {
    const balances = leaveBalances[emp.id];
    if (!balances) continue;
    const total = balances.reduce((s, b) => s + b.balance, 0);
    if (total < 24) count++;
  }
  return count;
}

function getPresentTodayCount(): number {
  const ids = new Set(attendanceToday.map((a) => a.employeeId));
  return ids.size;
}

function getTerminatedLastMonthCount(): number {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 1);
  return employees.filter(
    (e) => e.dateOfTermination && new Date(e.dateOfTermination) >= cutoff
  ).length;
}

async function runHealingSimulate(system: SystemName): Promise<{ message: string; healed?: boolean }> {
  setSimulateFailure(system);
  if (system === "erp") {
    const result = callErp("/employees", {});
    if (!result.ok) {
      const healing = await runSelfHealingAgent(result.failureId);
      if (healing && "blocked" in healing && healing.blocked)
        return { message: "Governance blocked self-healing agent: " + healing.blockReason };
      return {
        message: healing && !("blocked" in healing) && healing.healed
          ? "API healing simulation ran: ERP failure was detected and healed. Contract updated and retry succeeded."
          : "API healing simulation ran: ERP failure was detected; case created and may require attention.",
        healed: healing && !("blocked" in healing) ? healing.healed : undefined,
      };
    }
    return { message: "Simulated ERP call succeeded this time; no failure was triggered." };
  }
  if (system === "leave") {
    const result = callLeave("/employees/emp-1/leave", { employeeId: "emp-1" });
    if (!result.ok) {
      const healing = await runSelfHealingAgent(result.failureId);
      if (healing && "blocked" in healing && healing.blocked)
        return { message: "Governance blocked self-healing agent: " + healing.blockReason };
      return {
        message: healing && !("blocked" in healing) && healing.healed ? "API healing simulation ran: Leave API failure was detected and healed." : "API healing simulation ran: Leave API failure detected; case created.",
        healed: healing && !("blocked" in healing) ? healing.healed : undefined,
      };
    }
    return { message: "Simulated Leave call succeeded; no failure triggered." };
  }
  const result = callPolicy("/policies");
  if (!result.ok) {
    const healing = await runSelfHealingAgent(result.failureId);
    if (healing && "blocked" in healing && healing.blocked)
      return { message: "Governance blocked self-healing agent: " + healing.blockReason };
    return {
      message: healing && !("blocked" in healing) && healing.healed ? "API healing simulation ran: Policy API failure was detected and healed." : "API healing simulation ran: Policy API failure detected; case created.",
      healed: healing && !("blocked" in healing) ? healing.healed : undefined,
    };
  }
  return { message: "Simulated Policy call succeeded; no failure triggered." };
}

async function runDbMonitoringSimulate(schemaChange: boolean): Promise<string> {
  const erpSchemaProvider = schemaChange
    ? (tableId: string): TableColumnDef[] => {
        const current = getCurrentSchema(tableId as "erp_employees");
        if (!current || tableId !== "erp_employees") return current?.columns ?? [];
        return current.columns.map((c) =>
          c.name === "team" ? { ...c, name: "department", valueRules: "renamed from team" } : { ...c }
        );
      }
    : undefined;
  const result = await runDatabaseMonitoringAgent({
    tableId: "erp_employees",
    erpSchemaProvider,
  });
  setLastResult(result);
  recordDbMonitoringCase(result, "erp_employees");
  if (result.schemaChangeDetected)
    return "Database monitoring ran. Schema change detected (e.g. team -> department). Views and pipelines were updated; API healing and pipeline agent were notified. Check Tech agents for new cases.";
  if (result.performanceDegraded)
    return "Database monitoring ran. Indexing performance degradation was detected. Suggested actions: enable caching for popular metadata, prioritize indexing, consider partitioning.";
  return "Database monitoring ran. No schema change or performance degradation detected.";
}

function detectIntentWithKeywords(message: string): { intent: Intent; system?: SystemName; schemaChange?: boolean } {
  const lower = message.toLowerCase().trim();
  if (/\bhow many\b.*\bemployee|number of employee|total employee|employee count|employees in (the )?database\b/i.test(lower) || /\bhow many\b.*\b(in the )?database\b/i.test(lower) && /employee/i.test(lower))
    return { intent: "get_employee_count" };
  if (/\blow\b.*\b(leave|attendance)\s*balance|\b(leave|attendance)\s*balance.*\blow\b|employees?\s+with\s+low\s+leave|low\s+leave\s+balance\s+count/i.test(lower))
    return { intent: "get_low_leave_count" };
  if (/\bpresent\s+today|\bcame\s+to\s+work\s+today|how many\s+(are\s+)?(in\s+)?(the\s+)?office\s+today|attendance\s+today/i.test(lower))
    return { intent: "get_present_today_count" };
  if (/\bterminated\b.*\b(last\s+month|recent)|terminated\s+count|employees?\s+terminated/i.test(lower))
    return { intent: "get_terminated_count" };
  if (/\bsimulate\b.*\b(healing|api\s+heal)|trigger\s+healing|run\s+healing|api\s+healing\s+simulation/i.test(lower)) {
    let system: SystemName = "erp";
    if (/\bleave\b/i.test(lower)) system = "leave";
    else if (/\bpolicy\b/i.test(lower)) system = "policy";
    return { intent: "simulate_healing", system };
  }
  if (/\bsimulate\b.*\b(database|db)\s*monitoring|\b(database|db)\s*monitoring\s+simulation|run\s+database\s+monitoring/i.test(lower))
    return { intent: "simulate_database_monitoring", schemaChange: /\bschema\s+change\b/i.test(lower) };
  return { intent: "general" };
}

async function detectIntentWithLLM(message: string): Promise<{ intent: Intent; system?: SystemName; schemaChange?: boolean }> {
  if (!anthropic) return detectIntentWithKeywords(message);
  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: `You are an intent classifier for an HR platform assistant. Reply with a single JSON object only, no markdown. Keys: intent (one of: get_employee_count, get_low_leave_count, get_present_today_count, get_terminated_count, simulate_healing, simulate_database_monitoring, general), system (only if intent is simulate_healing: one of erp, leave, policy), schemaChange (only if intent is simulate_database_monitoring: boolean).`,
      messages: [
        { role: "user", content: message },
      ],
    });
    const text = res.content[0].type === "text" ? res.content[0].text : null;
    if (!text) return detectIntentWithKeywords(message);
    const parsed = JSON.parse(text) as { intent?: string; system?: string; schemaChange?: boolean };
    const intent = (parsed.intent ?? "general") as Intent;
    const system = parsed.system as SystemName | undefined;
    const schemaChange = !!parsed.schemaChange;
    return { intent, system: system && ["erp", "leave", "policy"].includes(system) ? system : undefined, schemaChange };
  } catch {
    return detectIntentWithKeywords(message);
  }
}

export async function POST(request: Request) {
  try {
    const user = getSessionUser();
    if (!canAccess(user, "employee_master", "read"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message)
      return NextResponse.json({ error: "message is required", reply: "Please send a message." }, { status: 400 });

    const { intent, system, schemaChange } = await detectIntentWithLLM(message);

    const dataScopesUsed =
      intent === "get_employee_count" || intent === "get_terminated_count"
        ? ["employee_count"]
        : intent === "get_low_leave_count"
          ? ["leave_balance"]
          : intent === "get_present_today_count"
            ? ["attendance"]
            : intent === "simulate_healing"
              ? ["failures", "tickets"]
              : intent === "simulate_database_monitoring"
                ? ["failures", "tickets"]
                : [];
    const toolsUsed =
      intent === "simulate_healing" ? ["simulateHealing"] : intent === "simulate_database_monitoring" ? ["simulateDatabaseMonitoring"] : ["queryDashboard"];
    const check = governanceCheckBeforeAction({
      agentId: "ai_assistant",
      actionClass: intent === "simulate_healing" ? "trigger_workflow" : "read_data",
      dataScopesUsed: dataScopesUsed.length ? dataScopesUsed : ["employee_count", "leave_balance", "attendance", "terminated_list", "failures", "tickets"],
      toolsUsed,
      policyIdsUsed: [],
      scope: { intent, messageLength: message.length },
    });
    if (!check.allowed) {
      governanceRecordAfterAction({
        agentId: "ai_assistant",
        actionClass: "read_data",
        riskLevel: "low",
        scope: { intent },
        outcome: {},
        blastRadius: ["session"],
        scopeAllowed: check.scopeEnforcerAllowed,
        actionAllowed: check.actionClassifierAllowed,
        blockReason: check.blockReason,
      });
      return NextResponse.json({
        reply: "This action was not allowed by governance. " + (check.blockReason ?? ""),
      });
    }

    const bold = (x: number | string) => "**" + String(x) + "**";
    let reply: string;

    if (intent === "get_employee_count") {
      const count = getEmployeeCount();
      reply = "There are " + bold(count) + " employees in the database.";
    } else if (intent === "get_low_leave_count") {
      const count = getLowLeaveBalanceCount();
      reply = bold(count) + " employees have a low leave balance (under 24 hours total). You can view the list in Employees > Low leave balance.";
    } else if (intent === "get_present_today_count") {
      const count = getPresentTodayCount();
      reply = bold(count) + " employees are marked as present today.";
    } else if (intent === "get_terminated_count") {
      const count = getTerminatedLastMonthCount();
      reply = bold(count) + " employees were terminated in the last month.";
    } else if (intent === "simulate_healing") {
      const sys = system ?? "erp";
      const out = await runHealingSimulate(sys);
      reply = out.message + " Check **Tech agents > API healing** for the case.";
    } else if (intent === "simulate_database_monitoring") {
      reply = await runDbMonitoringSimulate(schemaChange ?? false);
    } else {
      if (anthropic) {
        try {
          const res = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 512,
            system: "You are a helpful HR platform assistant. The platform has: employee data, leave balances, attendance, termination cases, API healing (ERP/Leave/Policy), and database monitoring. You can tell users they can ask: how many employees, how many have low leave balance, present today, terminated last month, or to simulate API healing or database monitoring. Keep replies concise.",
            messages: [
              { role: "user", content: message },
            ],
          });
          reply = (res.content[0].type === "text" ? res.content[0].text : null) ?? "I didn't understand. You can ask how many employees are in the database, how many have low leave balance, or ask to simulate API healing or database monitoring.";
        } catch {
          reply = "You can ask: **How many employees are in the database?** | **How many employees have a low leave balance?** | **How many are present today?** | **Simulate API healing** (ERP, Leave, or Policy) | **Simulate database monitoring** (optionally with schema change).";
        }
      } else {
        reply = "You can ask: **How many employees are in the database?** | **How many employees have a low leave balance?** | **How many are present today?** | **Simulate API healing** (ERP, Leave, or Policy) | **Simulate database monitoring** (optionally with schema change).";
      }
    }

    governanceRecordAfterAction({
      agentId: "ai_assistant",
      actionClass: intent === "simulate_healing" ? "trigger_workflow" : "read_data",
      riskLevel: "low",
      scope: { intent, messageLength: message.length },
      outcome: { replyLength: reply.length, intent },
      decision: intent,
      blastRadius: ["session"],
      scopeAllowed: true,
      actionAllowed: true,
    });
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("Assistant chat error:", e);
    return NextResponse.json(
      { error: "Chat failed", reply: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
