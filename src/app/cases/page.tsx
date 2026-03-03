"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import Link from "next/link";

interface CaseItem {
  id: string;
  employeeId: string;
  type: string;
  subject: string;
  status: string;
  createdAt: string;
  parentCaseId?: string;
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((data) => setCases(Array.isArray(data) ? data : []))
      .catch(() => setCases([]));
  }, []);

  const investigations = cases.filter((c) => c.type === "investigation");
  const terminations = cases.filter((c) => c.type === "termination");

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Cases</h1>
        <p className="text-[var(--muted)]">
          HR cases, investigations, and termination reviews.
        </p>

        <section>
          <h2 className="text-lg font-semibold mb-3">Investigations</h2>
          <div className="space-y-2">
            {investigations.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="block bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--accent)]"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm text-[var(--muted)]">{c.id}</span>
                    <p className="font-medium">{c.subject}</p>
                    <p className="text-sm text-[var(--muted)]">
                      Employee {c.employeeId} · {c.status}
                    </p>
                  </div>
                  <span className="text-sm text-[var(--muted)]">
                    {c.createdAt.slice(0, 10)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Termination reviews</h2>
          <div className="space-y-2">
            {terminations.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}/review`}
                className="block bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--accent)]"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm text-[var(--muted)]">{c.id}</span>
                    <p className="font-medium">{c.subject}</p>
                    <p className="text-sm text-[var(--muted)]">
                      Employee {c.employeeId} · {c.status}
                      {c.parentCaseId && ` · from ${c.parentCaseId}`}
                    </p>
                  </div>
                  <span className="text-sm text-[var(--muted)]">
                    {c.createdAt.slice(0, 10)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Other cases</h2>
          <div className="space-y-2">
            {cases
              .filter((c) => c.type !== "investigation" && c.type !== "termination")
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="block bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--accent)]"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm text-[var(--muted)]">{c.id}</span>
                      <p className="font-medium">{c.subject}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {c.type} · {c.status}
                      </p>
                    </div>
                    <span className="text-sm text-[var(--muted)]">
                      {c.createdAt.slice(0, 10)}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
