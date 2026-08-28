"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { downloadBlob, getAttendance, listEvents, toCsv } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsPage() {
  const events = useQuery({ queryKey: ["events"], queryFn: listEvents });

  const attendanceQueries = useQueries({
    queries: (events.data ?? []).map((e) => ({
      queryKey: ["attendance", e._id],
      queryFn: () => getAttendance(e._id),
    })),
  });

  const rows = useMemo(() => {
    return (events.data ?? []).map((e, i) => {
      const records = attendanceQueries[i]?.data ?? [];
      const present = records.filter((r) => r.status === "Present").length;
      const registered = e.registeredCount;
      return {
        id: e._id,
        name: e.title.length > 18 ? `${e.title.slice(0, 17)}\u2026` : e.title,
        title: e.title,
        capacity: e.capacity,
        registered,
        present,
        absent: records.length - present,
        fill: e.capacity ? Math.round((registered / e.capacity) * 100) : 0,
        turnout: registered ? Math.round((present / registered) * 100) : 0,
      };
    });
  }, [events.data, attendanceQueries]);

  const totals = rows.reduce(
    (acc, r) => ({
      capacity: acc.capacity + r.capacity,
      registered: acc.registered + r.registered,
      present: acc.present + r.present,
      absent: acc.absent + r.absent,
    }),
    { capacity: 0, registered: 0, present: 0, absent: 0 },
  );

  const pieData = [
    { name: "Present", value: totals.present },
    { name: "Absent", value: totals.absent },
    { name: "Not marked", value: Math.max(totals.registered - totals.present - totals.absent, 0) },
  ];
  const pieColors = ["var(--color-chart-1)", "var(--color-chart-4)", "var(--color-muted)"];

  const exportSummary = () => {
    try {
      const csv = toCsv(
        ["Event", "Capacity", "Registered", "Present", "Absent", "Fill %", "Turnout %"],
        rows.map((r) => [
          r.title,
          String(r.capacity),
          String(r.registered),
          String(r.present),
          String(r.absent),
          String(r.fill),
          String(r.turnout),
        ]),
      );
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "event-analytics.csv");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Capacity, registrations and turnout across every event.
          </p>
        </div>
        <Button variant="outline" onClick={exportSummary} disabled={rows.length === 0}>
          <Download className="size-4" /> Export summary
        </Button>
      </header>

      {events.isLoading && <Skeleton className="mt-8 h-72 w-full rounded-xl" />}

      {events.error && (
        <p className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {(events.error as Error).message}
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Events" value={rows.length} />
            <Stat label="Total capacity" value={totals.capacity} />
            <Stat label="Registrations" value={totals.registered} />
            <Stat
              label="Avg. turnout"
              value={`${
                totals.registered
                  ? Math.round((totals.present / totals.registered) * 100)
                  : 0
              }%`}
            />
          </div>

          <section className="mt-8 rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registrations vs capacity
            </h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="capacity" fill="var(--color-muted)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="registered" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="present" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Attendance split
              </h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Per event
              </h2>
              <ul className="mt-4 divide-y">
                {rows.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.title}</span>
                      <span className="text-muted-foreground">
                        {r.registered}/{r.capacity} &middot; {r.turnout}% turnout
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(r.fill, 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
