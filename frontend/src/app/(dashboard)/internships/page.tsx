"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  applyToInternship,
  closeInternship,
  createInternship,
  listInternships,
  type InternshipItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { internshipSchema, fieldErrors, studentNameSchema } from "@/lib/validation";
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

export default function InternshipsPage() {
  const qc = useQueryClient();
  const { isAdmin, isTeacher } = useAuth();
  const canCreate = isAdmin || isTeacher;
  const { data, isLoading, error } = useQuery({
    queryKey: ["internships"],
    queryFn: listInternships,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["internships"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Internships</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse open internships and track your applications.
          </p>
        </div>
        {canCreate && <CreateInternshipDialog onCreated={invalidate} />}
      </header>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-medium text-destructive">Could not load internships</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {(error as Error).message}
          </p>
        </div>
      )}

      {data && data.length === 0 && (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No internships posted yet.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((internship) => (
          <InternshipCard key={internship._id} internship={internship} onChange={invalidate} />
        ))}
      </div>
    </main>
  );
}

function InternshipCard({
  internship,
  onChange,
}: {
  internship: InternshipItem;
  onChange: () => void;
}) {
  const { user, isAdmin } = useAuth();
  const [name, setName] = useState(user?.role === "student" ? (user?.name ?? "") : "");
  const [coverNote, setCoverNote] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const deadlinePassed = new Date(internship.deadline) < new Date();

  const apply = useMutation({
    mutationFn: (payload: { student: string; note: string }) =>
      applyToInternship(internship._id, payload.student, payload.note),
    onSuccess: () => {
      toast.success("Application submitted");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const close = useMutation({
    mutationFn: () => closeInternship(internship._id),
    onSuccess: () => {
      toast.success("Internship closed to new applications");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusVariant =
    internship.myStatus === "Selected"
      ? "secondary"
      : internship.myStatus === "Rejected"
        ? "destructive"
        : "outline";

  return (
    <article
      className="flex flex-col rounded-xl border bg-card p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{internship.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {internship.company}
            {internship.duration ? ` \u00b7 ${internship.duration}` : ""}
          </p>
        </div>
        <Badge variant={internship.isOpen ? "secondary" : "destructive"}>
          {internship.isOpen ? "Open" : "Closed"}
        </Badge>
      </div>

      {internship.description && (
        <p className="mt-3 text-sm text-muted-foreground">{internship.description}</p>
      )}
      {internship.requirements && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Requirements:</span> {internship.requirements}
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Deadline: {new Date(internship.deadline).toLocaleString()}
      </p>

      {internship.myStatus && (
        <Badge variant={statusVariant} className="mt-3 w-fit">
          Your application: {internship.myStatus}
        </Badge>
      )}

      {!isAdmin && !internship.myStatus && (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = studentNameSchema.safeParse(name);
            if (!parsed.success) {
              setNameError(parsed.error.issues[0]?.message ?? "Invalid name");
              return;
            }
            setNameError(null);
            apply.mutate({ student: parsed.data, note: coverNote });
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            aria-invalid={!!nameError}
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          <Textarea
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            placeholder="Cover note (optional)"
            rows={2}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={apply.isPending || !internship.isOpen || deadlinePassed}
          >
            {!internship.isOpen || deadlinePassed ? "Applications closed" : "Apply"}
          </Button>
        </form>
      )}

      {isAdmin && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link
            href={`/internships/${internship._id}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {internship.applicationCount} application
            {internship.applicationCount === 1 ? "" : "s"} &rarr;
          </Link>
          {internship.isOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => close.mutate()}
              disabled={close.isPending}
            >
              Close applications
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function CreateInternshipDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    requirements: "",
    duration: "",
    deadline: "",
  });

  const mutation = useMutation({
    mutationFn: (payload: {
      title: string;
      company: string;
      description?: string;
      requirements?: string;
      duration?: string;
      deadline: string;
    }) => createInternship(payload),
    onSuccess: () => {
      toast.success("Internship posted");
      setOpen(false);
      setForm({
        title: "",
        company: "",
        description: "",
        requirements: "",
        duration: "",
        deadline: "",
      });
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Post internship</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post internship</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = internshipSchema.safeParse({
              ...form,
              description: form.description || undefined,
              requirements: form.requirements || undefined,
              duration: form.duration || undefined,
            });
            if (!parsed.success) {
              setErrors(fieldErrors(parsed.error));
              return;
            }
            setErrors({});
            mutation.mutate({
              ...parsed.data,
              deadline: new Date(parsed.data.deadline).toISOString(),
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
            {errors["title"] && <p className="text-xs text-destructive">{errors["title"]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              aria-invalid={!!errors["company"]}
            />
            {errors["company"] && (
              <p className="text-xs text-destructive">{errors["company"]}</p>
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
          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              aria-invalid={!!errors["requirements"]}
            />
            {errors["requirements"] && (
              <p className="text-xs text-destructive">{errors["requirements"]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                placeholder="e.g. 8 weeks"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                aria-invalid={!!errors["duration"]}
              />
              {errors["duration"] && (
                <p className="text-xs text-destructive">{errors["duration"]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                aria-invalid={!!errors["deadline"]}
              />
              {errors["deadline"] && (
                <p className="text-xs text-destructive">{errors["deadline"]}</p>
              )}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Posting…" : "Post internship"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
