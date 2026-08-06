import { clsx, type ClassValue } from "clsx";

/** Tiny className combiner — keeps components from importing clsx directly. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Human-readable, sortable report numbers: GRD-2026-000123 */
export function generateReportNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `GRD-${year}-${String(sequence).padStart(6, "0")}`;
}

export function formatDateTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Clamp a number into [min, max] — used constantly by the Risk Engine. */
export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}
