import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(255, "Email must be under 255 characters");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be under 72 characters")
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

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

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().trim().max(1000).optional().default(""),
  date: z
    .string()
    .min(1, "Date and time are required")
    .refine((v: string) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  location: z.string().trim().min(2, "Location is required").max(160),
  capacity: z
    .coerce.number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(10000),
});

export const updateEventSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  date: z.string().refine((v: string) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
  location: z.string().trim().min(2).max(160).optional(),
  capacity: z.coerce.number().int().min(1).max(10000).optional(),
});

export const studentNameSchema = z
  .string()
  .trim()
  .min(2, "Student name must be at least 2 characters")
  .max(80, "Student name must be under 80 characters");

export const registerStudentSchema = z.object({
  studentName: studentNameSchema,
});

export const markAttendanceSchema = z.object({
  studentName: studentNameSchema,
  status: z.enum(["Present", "Absent"]),
  userId: z.string().uuid().optional().nullable(),
});

export const createInternshipSchema = z.object({
  title: z.string().trim().min(3).max(120),
  company: z.string().trim().min(2, "Company is required").max(120),
  description: z.string().trim().max(2000).optional().default(""),
  requirements: z.string().trim().max(1000).optional().default(""),
  duration: z.string().trim().max(60).optional().default(""),
  deadline: z
    .string()
    .min(1, "Deadline is required")
    .refine((v: string) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export const updateInternshipSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  company: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  requirements: z.string().trim().max(1000).optional(),
  duration: z.string().trim().max(60).optional(),
  deadline: z.string().refine((v: string) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
  is_open: z.boolean().optional(),
});

export const applyInternshipSchema = z.object({
  studentName: studentNameSchema,
  coverNote: z.string().trim().max(2000).optional().default(""),
});

export const evaluateApplicationSchema = z.object({
  status: z.enum(["Selected", "Rejected"]),
  feedback: z.string().trim().max(1000).optional().default(""),
});

export const chatbotSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional()
    .default([]),
});
