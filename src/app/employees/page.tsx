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

  return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          Employees
          {view && (
            <span className="text-lg font-normal text-[var(--muted)] ml-2">
              — {view.replace(/_/g, " ")}
            </span>
          )}
        </h1>
        <div className="flex gap-2 mb-4">
          <Link
            href="/employees"
            className={`px-3 py-1 rounded ${!view ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)]"}`}
          >
            All
          </Link>
          <Link
            href="/employees?view=present_today"
            className={`px-3 py-1 rounded ${view === "present_today" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)]"}`}
          >
            Present today
          </Link>
          <Link
            href="/employees?view=low_leave"
            className={`px-3 py-1 rounded ${view === "low_leave" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)]"}`}
          >
            Low leave balance
          </Link>
          <Link
            href="/employees?view=terminated"
            className={`px-3 py-1 rounded ${view === "terminated" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)]"}`}
          >
            Terminated (1 month)
          </Link>
        </div>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Team</th>
                <th className="p-4">Level</th>
                <th className="p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--bg)]">
                  <td className="p-4 font-medium">{e.name}</td>
                  <td className="p-4 text-[var(--muted)]">{e.email}</td>
                  <td className="p-4">{e.team}</td>
                  <td className="p-4">{e.level}</td>
                  <td className="p-4">
                    {e.dateOfTermination ? (
                      <span className="text-[var(--danger)]">Terminated</span>
                    ) : (
                      <span className="text-[var(--success)]">Active</span>
                    )}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/employees/${e.id}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      View profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && (
            <div className="p-8 text-center text-[var(--muted)]">
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
