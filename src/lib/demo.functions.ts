import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const DEMO_ACCOUNTS = {
  creator: { email: "demo.creator@commonground.app", password: "DemoCreator!2026", name: "Demo Creator" },
  business: { email: "demo.business@commonground.app", password: "DemoBusiness!2026", name: "Demo Business" },
} as const;

// Ensures the shared demo account exists (confirmed, correct role). Credentials are intentionally public.
export const ensureDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ role: z.enum(["creator", "business"]) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const acct = DEMO_ACCOUNTS[data.role];
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    let user = list?.users.find((u) => u.email === acct.email);
    if (!user) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: acct.email, password: acct.password, email_confirm: true,
        user_metadata: { display_name: acct.name, role: data.role },
      });
      if (error) throw new Error(error.message);
      user = created.user;
    }
    if (data.role === "business") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id).neq("role", "business");
      await supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role: "business" }, { onConflict: "user_id,role" });
    }
    return { ok: true };
  });

