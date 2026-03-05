"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Layout } from "@/components/Layout";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  email: string;
  team: string;
  level: string;
  dateOfTermination?: string;
}

function EmployeesContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "";
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    let url = "/api/employees";
    if (view === "terminated") url += "?terminatedInMonths=1";
    fetch(url)
      .then((r) => r.json())
      .then(setEmployees)
      .catch(() => setEmployees([]));
    if (view === "present_today" || view === "low_leave")
      fetch(
        `/api/dashboard/hr-summary?view=${
          view === "present_today" ? "came_to_work_today" : "low_leave_balance"
        }`
      )
        .then((r) => r.json())
        .then(setEmployees)
        .catch(() => setEmployees([]));
  }, [view]);

  const tab = (v: string, label: string) => (
    <Link
      href={v ? `/employees?view=${v}` : "/employees"}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        view === v ? "bg-[var(--accent)] text-white" : "btn-secondary !py-1.5 !px-3"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Employees
        {view && (
          <span className="text-lg font-normal text-[var(--muted)] ml-2">
            — {view.replace(/_/g, " ")}
          </span>
        )}
      </h1>
      <div className="flex flex-wrap gap-2">
        {tab("", "All")}
        {tab("present_today", "Present today")}
        {tab("low_leave", "Low leave balance")}
        {tab("terminated", "Terminated (1 month)")}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Team</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Level</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text)]">{e.name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--muted)]">{e.email}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{e.team}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{e.level}</td>
                  <td className="px-4 py-3">
                    {e.dateOfTermination ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--danger)]/15 text-[var(--danger)]">Terminated</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)]">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/employees/${e.id}`} className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
                      View profile →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {employees.length === 0 && (
          <div className="p-10 text-center text-[var(--muted)] text-sm">
            No employees match this view.
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Layout>
      <Suspense fallback={<div className="text-[var(--muted)]">Loading...</div>}>
        <EmployeesContent />
      </Suspense>
    </Layout>
  );
}
