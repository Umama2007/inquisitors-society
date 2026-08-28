"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  cancelRegistration,
  createEvent,
  listEvents,
  registerStudent,
  type EventItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { eventSchema, fieldErrors, studentNameSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsPage() {
  const qc = useQueryClient();
  const { isAdmin, isTeacher } = useAuth();
  const canCreate = isAdmin || isTeacher;
  const { data, isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: listEvents,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse, register and manage campus events.
          </p>
        </div>
        {canCreate && <CreateEventDialog onCreated={invalidate} />}
      </header>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-medium text-destructive">Could not load events</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {(error as Error).message}
          </p>
        </div>
      )}

      {data && data.length === 0 && (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No events yet.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((event) => (
          <EventCard key={event._id} event={event} onChange={invalidate} />
        ))}
      </div>
    </main>
  );
}

function EventCard({ event, onChange }: { event: EventItem; onChange: () => void }) {
  const { user, isAdmin } = useAuth();
  const [name, setName] = useState(user?.role === "student" ? (user?.name ?? "") : "");
  const [nameError, setNameError] = useState<string | null>(null);
  const seatsLeft = event.capacity - event.registeredCount;

  const register = useMutation({
    mutationFn: (student: string) => registerStudent(event._id, student),
    onSuccess: (_d, student) => {
      toast.success(`${student} registered`, {
        description: "A confirmation email has been requested.",
      });
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: (_student: string) => cancelRegistration(event._id),
    onSuccess: () => {
      toast.success("Registration cancelled");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article
      className="flex flex-col rounded-xl border bg-card p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{event.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(event.date).toLocaleString()} &middot; {event.location}
          </p>
        </div>
        <Badge variant={seatsLeft > 0 ? "secondary" : "destructive"}>
          {seatsLeft > 0 ? `${seatsLeft} seats left` : "Full"}
        </Badge>
      </div>

      {event.description && (
        <p className="mt-3 text-sm text-muted-foreground">{event.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {event.registeredStudents.map((student, i) => (
          <button
            key={`${student}-${i}`}
            onClick={() => cancel.mutate(student)}
            disabled={!isAdmin && student !== user?.name}
            title="Cancel registration"
            className="rounded-full border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-60 disabled:hover:border-border disabled:hover:text-secondary-foreground"
          >
            {student} &times;
          </button>
        ))}
      </div>

      <form
        className="mt-4 space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = studentNameSchema.safeParse(name);
          if (!parsed.success) {
            setNameError(parsed.error.issues[0]?.message ?? "Invalid name");
            return;
          }
          setNameError(null);
          register.mutate(parsed.data);
        }}
      >
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student name"
            aria-label="Student name"
            aria-invalid={!!nameError}
            readOnly={!isAdmin}
          />
          <Button type="submit" disabled={register.isPending || seatsLeft <= 0}>
            Register
          </Button>
        </div>
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </form>

      <Link
        href={`/events/${event._id}`}
        className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Attendance &rarr;
      </Link>
    </article>
  );
}

function CreateEventDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    capacity: "30",
  });

  const mutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description?: string | undefined;
      date: string;
      location: string;
      capacity: number;
    }) => createEvent(payload),
    onSuccess: () => {
      toast.success("Event created");
      setOpen(false);
      setForm({ title: "", description: "", date: "", location: "", capacity: "30" });
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New event</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = eventSchema.safeParse({
              ...form,
              description: form.description || undefined,
              capacity: Number(form.capacity),
            });
            if (!parsed.success) {
              setErrors(fieldErrors(parsed.error));
              return;
            }
            setErrors({});
            mutation.mutate({
              ...parsed.data,
              date: new Date(parsed.data.date).toISOString(),
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              aria-invalid={!!errors["title"]}
            />
            {errors["title"] && (
              <p className="text-xs text-destructive">{errors["title"]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              aria-invalid={!!errors["description"]}
            />
            {errors["description"] && (
              <p className="text-xs text-destructive">{errors["description"]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date &amp; time</Label>
              <Input
                id="date"
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                aria-invalid={!!errors["date"]}
              />
              {errors["date"] && (
                <p className="text-xs text-destructive">{errors["date"]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                aria-invalid={!!errors["capacity"]}
              />
              {errors["capacity"] && (
                <p className="text-xs text-destructive">{errors["capacity"]}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              aria-invalid={!!errors["location"]}
            />
            {errors["location"] && (
              <p className="text-xs text-destructive">{errors["location"]}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
