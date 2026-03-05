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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My profile</h1>
          <p className="text-[var(--muted)] mt-1">
            View your data across systems.{" "}
            <Link href="/employees" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
              Contact HR or support
            </Link>{" "}
            for help or to track open cases.
          </p>
        </div>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Profile</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <dt className="text-sm text-[var(--muted)]">Name</dt>
            <dd className="text-[var(--text)]">{emp?.name ?? user.name}</dd>
            <dt className="text-sm text-[var(--muted)]">Email</dt>
            <dd className="text-[var(--text)]">{user.email}</dd>
            <dt className="text-sm text-[var(--muted)]">Team</dt>
            <dd className="text-[var(--text-secondary)]">{emp?.team ?? "—"}</dd>
            <dt className="text-sm text-[var(--muted)]">Level</dt>
            <dd className="text-[var(--text-secondary)]">{emp?.level ?? "—"}</dd>
          </dl>
        </section>

        {leaveData?.balances && leaveData.balances.length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">My leave balance</h2>
            <ul className="space-y-2">
              {leaveData.balances.map((b) => (
                <li key={b.type} className="text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text)]">{b.type}</span>: {b.balance} {b.unit}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-6">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">My cases / requests</h2>
          {cases.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">No open cases.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {cases.map((c) => (
                <li key={c.id} className="flex justify-between py-3 first:pt-0">
                  <span className="text-[var(--text)]">{c.subject}</span>
                  <span className="text-sm text-[var(--muted)]">{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div>
          <Link href={`/employees/${user.employeeId}`} className="btn-primary inline-block">
            View full profile (all systems)
          </Link>
        </div>
      </div>
    </Layout>
  );
}
