"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteEvent,
  getAttendance,
  getEvent,
  markAttendance,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const id = params.id;

  const eventQ = useQuery({
    queryKey: ["events", id],
    queryFn: () => getEvent(id),
  });

  const attQ = useQuery({
    queryKey: ["attendance", id],
    queryFn: () => getAttendance(id),
  });

  const mark = useMutation({
    mutationFn: (payload: { studentName: string; status: "Present" | "Absent"; userId?: string }) =>
      markAttendance(id, payload.studentName, payload.status, payload.userId),
    onSuccess: () => {
      toast.success("Attendance updated");
      qc.invalidateQueries({ queryKey: ["attendance", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteEvent(id),
    onSuccess: () => {
      toast.success("Event deleted");
      router.push("/events");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (eventQ.isLoading) return <Skeleton className="mx-auto mt-10 h-64 max-w-3xl rounded-xl" />;
  if (eventQ.error)
    return (
      <p className="mx-auto mt-10 max-w-3xl text-destructive">
        {(eventQ.error as Error).message}
      </p>
    );

  const event = eventQ.data;
  if (!event) return null;

  const attendance = attQ.data ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(event.date).toLocaleString()} &middot; {event.location}
          </p>
        </div>
        <Badge variant={event.capacity - event.registeredCount > 0 ? "secondary" : "destructive"}>
          {event.registeredCount}/{event.capacity}
        </Badge>
      </div>

      {event.description && (
        <p className="mt-4 text-sm text-muted-foreground">{event.description}</p>
      )}

      {isAdmin && (
        <div className="mt-4 flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Delete this event?")) del.mutate();
            }}
            disabled={del.isPending}
          >
            Delete event
          </Button>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Attendance</h2>
        {attQ.isLoading ? (
          <Skeleton className="mt-4 h-32 w-full rounded-xl" />
        ) : attendance.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No attendance records yet.
          </p>
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "Present" ? "secondary" : "destructive"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={r.status === "Present" ? "default" : "outline"}
                          onClick={() =>
                            mark.mutate({
                              studentName: r.studentName,
                              status: "Present",
                            })
                          }
                          disabled={mark.isPending}
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant={r.status === "Absent" ? "default" : "outline"}
                          onClick={() =>
                            mark.mutate({
                              studentName: r.studentName,
                              status: "Absent",
                            })
                          }
                          disabled={mark.isPending}
                        >
                          Absent
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}
