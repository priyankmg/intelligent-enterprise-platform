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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Policy central</h1>
        <p className="text-[var(--muted)]">
          Company policies with version history. Different teams define and maintain their policies.
        </p>
        <div className="space-y-4">
          {policies.map((p) => (
            <article
              key={p.id}
              className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <span className="text-sm text-[var(--muted)]">
                  v{p.version} · {p.category} · effective {p.effectiveDate}
                </span>
              </div>
              <p className="text-[var(--muted)] whitespace-pre-wrap">{p.body}</p>
            </article>
          ))}
          {policies.length === 0 && (
            <p className="text-[var(--muted)]">No policies loaded or access denied.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
