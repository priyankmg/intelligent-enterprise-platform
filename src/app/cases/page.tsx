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

  const caseCard = (
    c: CaseItem,
    href: string,
    subtitle: React.ReactNode = null
  ) => (
    <Link
      key={c.id}
      href={href}
      className="card block p-4 hover:border-[var(--accent)]/50 transition-colors"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <span className="text-xs font-mono text-[var(--muted)]">{c.id}</span>
          <p className="font-medium text-[var(--text)] mt-0.5">{c.subject}</p>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {subtitle ?? (
              <>
                Employee {c.employeeId} · {c.status}
                {c.parentCaseId && ` · from ${c.parentCaseId}`}
              </>
            )}
          </p>
        </div>
        <span className="text-sm text-[var(--muted)] shrink-0">{c.createdAt.slice(0, 10)}</span>
      </div>
    </Link>
  );

  const otherCases = cases.filter((c) => c.type !== "investigation" && c.type !== "termination");

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
          <p className="text-[var(--muted)] mt-1">
            HR cases, investigations, and termination reviews.
          </p>
        </div>

        <section>
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-3">Investigations</h2>
          <div className="space-y-2">
            {investigations.length === 0 && <p className="text-sm text-[var(--muted)]">No investigations.</p>}
            {investigations.map((c) => caseCard(c, `/cases/${c.id}`))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-3">Termination reviews</h2>
          <div className="space-y-2">
            {terminations.length === 0 && <p className="text-sm text-[var(--muted)]">No termination reviews.</p>}
            {terminations.map((c) => caseCard(c, `/cases/${c.id}/review`))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-3">Other cases</h2>
          <div className="space-y-2">
            {otherCases.length === 0 && <p className="text-sm text-[var(--muted)]">No other cases.</p>}
            {otherCases.map((c) => caseCard(c, `/cases/${c.id}`, `${c.type} · ${c.status}`))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
