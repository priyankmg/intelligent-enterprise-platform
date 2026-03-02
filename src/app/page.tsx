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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {user && (
            <div className="text-sm text-[var(--muted)]">
              {user.name} · {user.roles.join(", ")}
            </div>
          )}
        </div>

        <section className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold mb-4">My tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-[var(--muted)]">No open tasks.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                >
                  <span className="font-medium">{t.title}</span>
                  <span className="text-sm text-[var(--muted)]">
                    {t.type} · {t.status}
                    {t.late && (
                      <span className="ml-2 text-[var(--warning)]">Late</span>
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
          <section className="grid gap-6 md:grid-cols-3">
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h3 className="font-semibold mb-2">Present today</h3>
              <p className="text-2xl text-[var(--accent)]">
                {hrViews.presentToday?.length ?? 0}
              </p>
              <Link
                href="/employees?view=present_today"
                className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block"
              >
                View list
              </Link>
            </div>
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h3 className="font-semibold mb-2">Low leave balance</h3>
              <p className="text-2xl text-[var(--warning)]">
                {hrViews.lowLeave?.length ?? 0}
              </p>
              <Link
                href="/employees?view=low_leave"
                className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block"
              >
                View list
              </Link>
            </div>
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h3 className="font-semibold mb-2">Terminated (last month)</h3>
              <p className="text-2xl text-[var(--danger)]">
                {hrViews.terminated?.length ?? 0}
              </p>
              <Link
                href="/employees?view=terminated"
                className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block"
              >
                View list
              </Link>
            </div>
          </section>
        )}

        <section className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold mb-2">Quick actions</h2>
          <div className="flex gap-4">
            <Link
              href="/employees"
              className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:opacity-90"
            >
              Browse employees
            </Link>
            <Link
              href="/profile"
              className="px-4 py-2 rounded border border-[var(--border)] hover:bg-[var(--surface)]"
            >
              My profile
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
