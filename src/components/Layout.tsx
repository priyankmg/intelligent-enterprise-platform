"use client";

import Link from "next/link";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-[var(--accent)]">
            Intelligent Enterprise Platform
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="text-[var(--muted)] hover:text-[var(--text)]">
              Dashboard
            </Link>
            <Link href="/employees" className="text-[var(--muted)] hover:text-[var(--text)]">
              Employees
            </Link>
            <Link href="/policies" className="text-[var(--muted)] hover:text-[var(--text)]">
              Policies
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
