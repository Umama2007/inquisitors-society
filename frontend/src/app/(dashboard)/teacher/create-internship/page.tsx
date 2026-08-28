"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createInternship } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { internshipSchema, fieldErrors } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherCreateInternshipPage() {
  const router = useRouter();
  const { isAdmin, isTeacher, loading } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    requirements: "",
    duration: "",
    deadline: "",
  });

  if (!loading && !isAdmin && !isTeacher) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only teachers and admins can create internships.
        </p>
      </main>
    );
  }

  const mutation = useMutation({
    mutationFn: (payload: {
      title: string;
      company: string;
      description?: string;
      requirements?: string;
      duration?: string;
      deadline: string;
    }) => createInternship(payload),
    onSuccess: (internship) => {
      toast.success("Internship posted");
      router.push(`/internships/${internship._id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent) {
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
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Post internship</CardTitle>
          <p className="text-sm text-muted-foreground">
            Fill in the details below to create a new internship listing.
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
                rows={4}
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
                rows={3}
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
            <div className="flex gap-3">
              <Button type="submit" disabled={mutation.isPending} className="flex-1">
                {mutation.isPending ? "Posting…" : "Post internship"}
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
