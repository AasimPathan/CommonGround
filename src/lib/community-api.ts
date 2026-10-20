import { supabase } from "@/integrations/supabase/client";
import { REVIEW_ITEMS, type AppRole, type Claim, type Evidence, type Initiative, type Participation } from "@/lib/community";

export async function getMyIdentity() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You are not signed in.");
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
  ]);
  return { user: auth.user, profile, roles: (roles ?? []).map((row) => row.role as AppRole) };
}

export async function listInitiatives(status?: Initiative["status"]) {
  let query = supabase.from("initiatives").select("*").order("published_at", { ascending: false, nullsFirst: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getInitiative(id: string) {
  const [initiativeResult, evidenceResult, claimsResult, participationResult] = await Promise.all([
    supabase.from("initiatives").select("*").eq("id", id).single(),
    supabase.from("evidence").select("*").eq("initiative_id", id).order("position"),
    supabase.from("claims").select("*").eq("initiative_id", id).order("position"),
    supabase.from("participations").select("*").eq("initiative_id", id).maybeSingle(),
  ]);
  if (initiativeResult.error) throw initiativeResult.error;
  return { initiative: initiativeResult.data, evidence: evidenceResult.data ?? [], claims: claimsResult.data ?? [], participation: participationResult.data };
}

export async function supportInitiative(initiativeId: string, creatorId: string) {
  const { error } = await supabase.from("participations").insert({ initiative_id: initiativeId, creator_id: creatorId });
  if (error) throw error;
}

export async function submitContent(participation: Participation, url: string) {
  const { error } = await supabase.from("participations").update({ content_url: url, status: "completed", completed_at: new Date().toISOString() }).eq("id", participation.id);
  if (error) throw error;
}

export async function listHistory() {
  const { data, error } = await supabase.from("participations").select("*, initiatives(*)").order("supported_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveInitiative(input: { id?: string; title: string; category: string; location: string; description: string; why_it_matters?: string; suggested_action?: string; created_by: string; evidence: Array<Pick<Evidence, "description" | "source_name" | "link" | "reference">>; claims: Array<Pick<Claim, "statement" | "attributed_to" | "source_name" | "link_reference">> }) {
  const payload = { title: input.title, category: input.category, location: input.location, description: input.description, why_it_matters: input.why_it_matters || null, suggested_action: input.suggested_action || null, created_by: input.created_by, status: "draft" as const };
  const result = input.id
    ? await supabase.from("initiatives").update(payload).eq("id", input.id).select().single()
    : await supabase.from("initiatives").insert(payload).select().single();
  if (result.error) throw result.error;
  const id = result.data.id;
  await Promise.all([supabase.from("evidence").delete().eq("initiative_id", id), supabase.from("claims").delete().eq("initiative_id", id)]);
  if (input.evidence.length) {
    const { error } = await supabase.from("evidence").insert(input.evidence.map((row, position) => ({ ...row, initiative_id: id, position })));
    if (error) throw error;
  }
  if (input.claims.length) {
    const { error } = await supabase.from("claims").insert(input.claims.map((row, position) => ({ ...row, initiative_id: id, position })));
    if (error) throw error;
  }
  return id;
}

export async function submitForReview(id: string) {
  const { error } = await supabase.from("initiatives").update({ status: "under_review" }).eq("id", id);
  if (error) throw error;
}

export async function listReviews(status?: Initiative["status"]) { return listInitiatives(status); }
export async function reviewInitiative(id: string, decision: "changes_required"|"approved", comment: string, checklist: boolean[]) {
  const items = checklist.map((passed,index)=>({item_number:index+1,label:REVIEW_ITEMS[index],passed}));
  const {error}=await supabase.rpc("review_initiative",{_initiative_id:id,_decision:decision,_comment:comment,_checklist:items});if(error)throw error;
}
export async function closeInitiative(id:string){const {error}=await supabase.rpc("close_initiative",{_initiative_id:id});if(error)throw error;}
