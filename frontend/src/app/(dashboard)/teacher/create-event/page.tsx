"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createEvent } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { eventSchema, fieldErrors } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherCreateEventPage() {
  const router = useRouter();
  const { isAdmin, isTeacher, loading } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    capacity: "30",
  });

  if (!loading && !isAdmin && !isTeacher) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only teachers and admins can create events.
        </p>
      </main>
    );
  }

  const mutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description?: string;
      date: string;
      location: string;
      capacity: number;
    }) => createEvent(payload),
    onSuccess: (event) => {
      toast.success("Event created");
      router.push(`/events/${event._id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent) {
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
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create event</CardTitle>
          <p className="text-sm text-muted-foreground">
            Fill in the details below to create a new campus event.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" noValidate onSubmit={onSubmit}>
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
                rows={4}
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
            <div className="flex gap-3">
              <Button type="submit" disabled={mutation.isPending} className="flex-1">
                {mutation.isPending ? "Creating…" : "Create event"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
