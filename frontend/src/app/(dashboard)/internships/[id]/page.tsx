"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteInternship,
  evaluateApplication,
  getInternship,
  listApplications,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function InternshipDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const id = params.id;

  const intQ = useQuery({
    queryKey: ["internships", id],
    queryFn: () => getInternship(id),
  });

  const appsQ = useQuery({
    queryKey: ["applications", id],
    queryFn: () => listApplications(id),
  });

  const del = useMutation({
    mutationFn: () => deleteInternship(id),
    onSuccess: () => {
      toast.success("Internship deleted");
      router.push("/internships");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (intQ.isLoading) return <Skeleton className="mx-auto mt-10 h-64 max-w-3xl rounded-xl" />;
  if (intQ.error)
    return (
      <p className="mx-auto mt-10 max-w-3xl text-destructive">
        {(intQ.error as Error).message}
      </p>
    );

  const internship = intQ.data;
  if (!internship) return null;

  const applications = appsQ.data ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{internship.title}</h1>
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
        <p className="mt-4 text-sm text-muted-foreground">{internship.description}</p>
      )}
      {internship.requirements && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Requirements:</span> {internship.requirements}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Deadline: {new Date(internship.deadline).toLocaleString()}
      </p>

      {isAdmin && (
        <div className="mt-4 flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Delete this internship?")) del.mutate();
            }}
            disabled={del.isPending}
          >
            Delete internship
          </Button>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">
          Applications ({applications.length})
        </h2>
        {appsQ.isLoading ? (
          <Skeleton className="mt-4 h-32 w-full rounded-xl" />
        ) : applications.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No applications yet.
          </p>
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Cover Note</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <ApplicationRow key={app.id} app={app} internshipId={id} />
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}

function ApplicationRow({
  app,
  internshipId,
}: {
  app: { id: string; studentName: string; coverNote: string; status: string; feedback: string };
  internshipId: string;
}) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [feedback, setFeedback] = useState(app.feedback || "");

  const evaluate = useMutation({
    mutationFn: (status: "Selected" | "Rejected") =>
      evaluateApplication(app.id, status, feedback),
    onSuccess: () => {
      toast.success(`Application ${app.id ? "updated" : "evaluated"}`);
      qc.invalidateQueries({ queryKey: ["applications", internshipId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <TableRow>
      <TableCell className="font-medium">{app.studentName}</TableCell>
      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
        {app.coverNote || "\u2014"}
      </TableCell>
      <TableCell>
        <Badge
          variant={
            app.status === "Selected"
              ? "secondary"
              : app.status === "Rejected"
                ? "destructive"
                : "outline"
          }
        >
          {app.status}
        </Badge>
      </TableCell>
      {isAdmin && (
        <TableCell>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Evaluate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Evaluate {app.studentName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Feedback</Label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Optional feedback"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => evaluate.mutate("Selected")}
                    disabled={evaluate.isPending}
                  >
                    Select
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => evaluate.mutate("Rejected")}
                    disabled={evaluate.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TableCell>
      )}
    </TableRow>
  );
}
