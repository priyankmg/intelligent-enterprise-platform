"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import Link from "next/link";

interface Task {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  late: boolean;
}

interface SessionUser {
  name: string;
  email: string;
  roles: string[];
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hrViews, setHrViews] = useState<{
    presentToday?: { id: string; name: string }[];
    lowLeave?: { id: string; name: string }[];
    terminated?: { id: string; name: string }[];
  }>({});

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(setUser);
    fetch("/api/dashboard/tasks")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []));
    fetch("/api/dashboard/hr-summary?view=came_to_work_today")
      .then((r) => r.json())
      .then((list) => setHrViews((v) => ({ ...v, presentToday: list })))
      .catch(() => {});
    fetch("/api/dashboard/hr-summary?view=low_leave_balance")
      .then((r) => r.json())
      .then((list) => setHrViews((v) => ({ ...v, lowLeave: list })))
      .catch(() => {});
    fetch("/api/dashboard/hr-summary?view=terminated_last_month")
      .then((r) => r.json())
      .then((list) => setHrViews((v) => ({ ...v, terminated: list })))
      .catch(() => {});
  }, []);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          {user && (
            <div className="text-sm text-[var(--muted)] bg-[var(--surface)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
              {user.name} · <span className="text-[var(--text-secondary)]">{user.roles.join(", ")}</span>
            </div>
          )}
        </div>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">My tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">No open tasks.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3 first:pt-0">
                  <span className="font-medium text-[var(--text)]">{t.title}</span>
                  <span className="text-sm text-[var(--muted)]">
                    {t.type} · {t.status}
                    {t.late && (
                      <span className="ml-2 text-[var(--warning)] font-medium">Late</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(hrViews.presentToday?.length !== undefined ||
          hrViews.lowLeave?.length !== undefined ||
          hrViews.terminated?.length !== undefined) && (
          <section className="grid gap-4 sm:grid-cols-3">
            <Link href="/employees?view=present_today" className="card p-6 block hover:border-[var(--accent)]/50">
              <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Present today</h3>
              <p className="text-3xl font-bold text-[var(--accent)]">
                {hrViews.presentToday?.length ?? 0}
              </p>
              <span className="text-sm text-[var(--accent)] mt-2 inline-block font-medium">View list →</span>
            </Link>
            <Link href="/employees?view=low_leave" className="card p-6 block hover:border-[var(--warning)]/50">
              <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Low leave balance</h3>
              <p className="text-3xl font-bold text-[var(--warning)]">
                {hrViews.lowLeave?.length ?? 0}
              </p>
              <span className="text-sm text-[var(--accent)] mt-2 inline-block font-medium">View list →</span>
            </Link>
            <Link href="/employees?view=terminated" className="card p-6 block hover:border-[var(--danger)]/50">
              <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Terminated (last month)</h3>
              <p className="text-3xl font-bold text-[var(--danger)]">
                {hrViews.terminated?.length ?? 0}
              </p>
              <span className="text-sm text-[var(--accent)] mt-2 inline-block font-medium">View list →</span>
            </Link>
          </section>
        )}

        <section className="card p-6">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Quick actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/employees" className="btn-primary inline-block">
              Browse employees
            </Link>
            <Link href="/cases" className="btn-primary inline-block">
              Cases & investigations
            </Link>
            <Link href="/profile" className="btn-secondary inline-block">
              My profile
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
