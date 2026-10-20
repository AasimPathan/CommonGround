import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type InitiativeStatus = Database["public"]["Enums"]["initiative_status"];
export type Initiative = Database["public"]["Tables"]["initiatives"]["Row"];
export type Evidence = Database["public"]["Tables"]["evidence"]["Row"];
export type Claim = Database["public"]["Tables"]["claims"]["Row"];
export type Participation = Database["public"]["Tables"]["participations"]["Row"];

export const CATEGORIES = [
  "Local Community",
  "Environmental",
  "Humanitarian",
  "Public Awareness",
  "Civic / Social Issue",
  "Other Reviewed Community Initiative",
] as const;

export const REVIEW_ITEMS = [
  "Complete",
  "Appropriate sources",
  "Evidence clearly identified",
  "Claims distinguishable",
  "Source dates included where available",
  "Suggested action clear",
  "Information understandable",
  "Unsupported or misleading statements avoided",
  "Appropriate for Community",
  "Correct status",
] as const;

export function labelRole(role: AppRole) {
  return ({ creator: "Creator", business: "Business", initiative_manager: "Initiative Manager", reviewer: "Reviewer" } as const)[role];
}

export function labelStatus(status: InitiativeStatus | "supported" | "completed") {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isHttpUrl(value: string) {
  if (value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
