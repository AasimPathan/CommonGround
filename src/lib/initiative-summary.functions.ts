import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const summarizeInitiative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { initiativeId: string }) => z.object({ initiativeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "business")) throw new Error("AI Assistance is available to business accounts only.");
    // RLS limits this to initiatives the business is allowed to view.
    const [ini, ev, cl] = await Promise.all([
      supabase.from("initiatives").select("title, category, location, description, why_it_matters, suggested_action, status").eq("id", data.initiativeId).maybeSingle(),
      supabase.from("evidence").select("description, source_name, source_date").eq("initiative_id", data.initiativeId).order("position"),
      supabase.from("claims").select("statement, attributed_to, source_name").eq("initiative_id", data.initiativeId).order("position"),
    ]);
    if (!ini.data || !["active", "closed"].includes(ini.data.status)) throw new Error("This initiative is not available.");
    const { status: _s, ...initiative } = ini.data;
    const { summarizeInitiativeData } = await import("./initiative-summary.server");
    return summarizeInitiativeData({ ...initiative, evidence: ev.data ?? [], claims: cl.data ?? [] });
  });
