"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";

interface Policy {
  id: string;
  name: string;
  version: string;
  effectiveDate: string;
  body: string;
  category: string;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);

  useEffect(() => {
    fetch("/api/policies")
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => setPolicies(ok && Array.isArray(data) ? data : []))
      .catch(() => setPolicies([]));
  }, []);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Policy central</h1>
          <p className="text-[var(--muted)] mt-1">
            Company policies with version history. Different teams define and maintain their policies.
          </p>
        </div>
        <div className="space-y-4">
          {policies.map((p) => (
            <article key={p.id} className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-lg font-semibold text-[var(--text)]">{p.name}</h2>
                <span className="text-xs text-[var(--muted)]">
                  v{p.version} · {p.category} · effective {p.effectiveDate}
                </span>
              </div>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">{p.body}</p>
            </article>
          ))}
          {policies.length === 0 && (
            <p className="text-[var(--muted)] text-sm">No policies loaded or access denied.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
