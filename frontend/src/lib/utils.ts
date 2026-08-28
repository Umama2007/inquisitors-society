import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Role } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function dashboardRoute(role: Role | string): string {
  switch (role) {
    case "admin":
      return "/analytics";
    case "teacher":
      return "/teacher/create-event";
    case "student":
    default:
      return "/events";
  }
}
