import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required" })
  .email({ message: "Enter a valid email address" })
  .max(255, { message: "Email must be under 255 characters" });

export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be under 72 characters" })
  .regex(/[a-zA-Z]/, { message: "Password must contain a letter" })
  .regex(/[0-9]/, { message: "Password must contain a number" });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
    role: z.enum(["admin", "student", "teacher"]).default("student"),
  })
  .refine((v: { password: string; confirm: string }) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export const studentNameSchema = z
  .string()
  .trim()
  .min(2, "Student name must be at least 2 characters")
  .max(80, "Student name must be under 80 characters");

export const eventSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().trim().max(1000).optional(),
  date: z
    .string()
    .min(1, "Date and time are required")
    .refine((v: string) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  location: z.string().trim().min(2, "Location is required").max(160),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(10000),
});

export const internshipSchema = z.object({
  title: z.string().trim().min(3).max(120),
  company: z.string().trim().min(2, "Company is required").max(120),
  description: z.string().trim().max(2000).optional(),
  requirements: z.string().trim().max(1000).optional(),
  duration: z.string().trim().max(60).optional(),
  deadline: z
    .string()
    .min(1, "Deadline is required")
    .refine((v: string) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
