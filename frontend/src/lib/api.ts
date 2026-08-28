const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed (${res.status})`);
  }

  return res.json();
}

export type Role = "admin" | "student" | "teacher";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

export interface EventItem {
  _id: string;
  title: string;
  description?: string;
  date: string;
  location: string;
  capacity: number;
  registeredCount: number;
  registeredStudents: string[];
  isRegistered: boolean;
  createdBy?: string;
}

export interface AttendanceItem {
  _id: string;
  eventId: string;
  studentName: string;
  status: "Present" | "Absent";
  markedAt: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface InternshipItem {
  _id: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  duration: string;
  deadline: string;
  isOpen: boolean;
  applicationCount: number;
  myStatus: ApplicationStatus | null;
  createdBy?: string;
}

export type ApplicationStatus = "Applied" | "Reviewed" | "Selected" | "Rejected";

export interface ApplicationItem {
  id: string;
  userId: string;
  studentName: string;
  coverNote: string;
  status: ApplicationStatus;
  feedback: string;
}

/* ---------------- Auth ---------------- */
export async function apiLogin(email: string, password: string) {
  return apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(input: {
  name: string;
  email: string;
  password: string;
  confirm: string;
  role: Role;
}) {
  return apiFetch<{ token: string; user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiMe() {
  return apiFetch<AuthUser>("/auth/me");
}

/* ---------------- Events ---------------- */
export async function listEvents() {
  return apiFetch<EventItem[]>("/events");
}

export async function getEvent(id: string) {
  return apiFetch<EventItem & { registrations?: any[]; attendance?: AttendanceItem[] }>(
    `/events/${id}`,
  );
}

export async function createEvent(body: {
  title: string;
  description?: string;
  date: string;
  location: string;
  capacity: number;
}) {
  return apiFetch<EventItem>("/events", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteEvent(id: string) {
  return apiFetch<{ success: boolean }>(`/events/${id}`, { method: "DELETE" });
}

export async function registerStudent(id: string, studentName: string) {
  return apiFetch<{ success: boolean }>(`/events/${id}/register`, {
    method: "POST",
    body: JSON.stringify({ studentName }),
  });
}

export async function cancelRegistration(id: string) {
  return apiFetch<{ success: boolean }>(`/events/${id}/register`, { method: "DELETE" });
}

export async function getAttendance(id: string) {
  return apiFetch<AttendanceItem[]>(`/events/${id}/attendance`);
}

export async function markAttendance(
  id: string,
  studentName: string,
  status: "Present" | "Absent",
  userId?: string | null,
) {
  return apiFetch<{ success: boolean }>(`/events/${id}/attendance`, {
    method: "POST",
    body: JSON.stringify({ studentName, status, userId }),
  });
}

/* ---------------- Internships ---------------- */
export async function listInternships() {
  return apiFetch<InternshipItem[]>("/internships");
}

export async function getInternship(id: string) {
  return apiFetch<InternshipItem & { applications?: ApplicationItem[] }>(
    `/internships/${id}`,
  );
}

export async function createInternship(body: {
  title: string;
  company: string;
  description?: string;
  requirements?: string;
  duration?: string;
  deadline: string;
}) {
  return apiFetch<InternshipItem>("/internships", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function closeInternship(id: string) {
  return apiFetch<InternshipItem>(`/internships/${id}`, {
    method: "PUT",
    body: JSON.stringify({ is_open: false }),
  });
}

export async function deleteInternship(id: string) {
  return apiFetch<{ success: boolean }>(`/internships/${id}`, { method: "DELETE" });
}

export async function applyToInternship(
  id: string,
  studentName: string,
  coverNote?: string,
) {
  return apiFetch<{ success: boolean }>(`/internships/${id}/apply`, {
    method: "POST",
    body: JSON.stringify({ studentName, coverNote: coverNote ?? "" }),
  });
}

export async function listApplications(internshipId: string) {
  return apiFetch<ApplicationItem[]>(`/internships/${internshipId}/applications`);
}

export async function evaluateApplication(
  id: string,
  status: "Selected" | "Rejected",
  feedback?: string,
) {
  return apiFetch<{ success: boolean }>(`/internships/applications/${id}/evaluate`, {
    method: "PUT",
    body: JSON.stringify({ status, feedback: feedback ?? "" }),
  });
}

/* ---------------- Notifications ---------------- */
export async function listNotifications() {
  return apiFetch<NotificationItem[]>("/notifications");
}

export async function markAllNotificationsRead() {
  return apiFetch<{ success: boolean }>("/notifications/read-all", { method: "PUT" });
}

/* ---------------- Analytics ---------------- */
export async function getDashboardStats() {
  return apiFetch<Record<string, unknown>>("/analytics/dashboard");
}

export async function getEventAnalytics() {
  return apiFetch<any[]>("/analytics/events");
}

export async function getInternshipAnalytics() {
  return apiFetch<any[]>("/analytics/internships");
}

/* ---------------- Chatbot ---------------- */
export async function sendChatMessage(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
) {
  return apiFetch<{ reply: string }>("/chatbot", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

/* ---------------- Export helpers ---------------- */
export function toCsv(headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
