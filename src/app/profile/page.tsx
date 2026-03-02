"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import Link from "next/link";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  roles: string[];
}

export default function MyProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [employee, setEmployee] = useState<unknown>(null);
  const [leave, setLeave] = useState<unknown>(null);
  const [cases, setCases] = useState<{ id: string; subject: string; status: string }[]>([]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((u) => {
        setUser(u);
        if (u?.employeeId) {
          return Promise.all([
            fetch(`/api/employees/${u.employeeId}`).then((r) => r.json()),
            fetch(`/api/employees/${u.employeeId}/leave`).then((r) => r.json()),
            fetch(`/api/employees/${u.employeeId}/cases`).then((r) => r.json()),
          ]).then(([emp, lv, cas]) => {
            setEmployee(emp);
            setLeave(lv);
            setCases(Array.isArray(cas) ? (cas as { id: string; subject: string; status: string }[]) : []);
          });
        }
      })
      .catch(() => setUser(null));
  }, []);

  if (!user) {
    return (
      <Layout>
        <div className="text-[var(--muted)]">Loading...</div>
      </Layout>
    );
  }

  const emp = employee as { name: string; team: string; level: string } | null;
  const leaveData = leave as { balances?: { type: string; balance: number; unit: string }[]; records?: unknown[] } | null;

  return (
    <Layout>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="text-[var(--muted)]">
          View your data across systems.{" "}
          <Link href="/employees" className="text-[var(--accent)] hover:underline">
            Contact HR or support
          </Link>{" "}
          for help or to track open cases.
        </p>

        <section className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            <dt className="text-[var(--muted)]">Name</dt>
            <dd>{emp?.name ?? user.name}</dd>
            <dt className="text-[var(--muted)]">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-[var(--muted)]">Team</dt>
            <dd>{emp?.team ?? "—"}</dd>
            <dt className="text-[var(--muted)]">Level</dt>
            <dd>{emp?.level ?? "—"}</dd>
          </dl>
        </section>

        {leaveData?.balances && leaveData.balances.length > 0 && (
          <section className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold mb-4">My leave balance</h2>
            <ul className="space-y-2">
              {leaveData.balances.map((b) => (
                <li key={b.type}>
                  {b.type}: {b.balance} {b.unit}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold mb-4">My cases / requests</h2>
          {cases.length === 0 ? (
            <p className="text-[var(--muted)]">No open cases.</p>
          ) : (
            <ul className="space-y-2">
              {cases.map((c) => (
                <li key={c.id} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span>{c.subject}</span>
                  <span className="text-[var(--muted)]">{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex gap-4">
          <Link
            href={`/employees/${user.employeeId}`}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:opacity-90"
          >
            View full profile (all systems)
          </Link>
        </div>
      </div>
    </Layout>
  );
}
