"use client";

import Link from "next/link";
import { BarChart3, Bell, FileDown, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: ShieldCheck,
    title: "Protected access",
    body: "Token-based login with separate admin, student and teacher roles across every page.",
  },
  {
    icon: FileDown,
    title: "Attendance export",
    body: "Download attendance sheets and analytics summaries as CSV in one click.",
  },
  {
    icon: BarChart3,
    title: "Event analytics",
    body: "Fill rate, turnout and per-event breakdowns with live charts.",
  },
  {
    icon: Bell,
    title: "Notifications",
    body: "In-app alerts for registrations and reminders, plus confirmation emails.",
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <main>
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Campus operations
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Run every campus event &amp; internship from one secure dashboard
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Registrations, capacity limits, internship applications, attendance marking,
          exports and analytics — wired straight to your Express API.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isAuthenticated ? (
            <Button size="lg" asChild>
              <Link href="/events">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button size="lg" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-2">
        {features.map((f) => (
          <article
            key={f.title}
            className="rounded-xl border bg-card p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <f.icon className="size-6 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
