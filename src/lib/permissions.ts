import type { AppRole, Initiative } from "./community";
type Viewer={id:string;roles:AppRole[]};
export const canEditDraft=(viewer:Viewer,initiative:Initiative)=>viewer.roles.includes("initiative_manager")&&initiative.created_by===viewer.id&&(["draft","changes_required"] as string[]).includes(initiative.status);
export const canApprove=(viewer:Viewer,initiative:Initiative)=>viewer.roles.includes("reviewer")&&initiative.status==="under_review"&&initiative.created_by!==viewer.id;
export const canRequestChanges=canApprove;
export const canClose=(viewer:Viewer,initiative:Initiative)=>initiative.status==="active"&&(viewer.roles.includes("reviewer")||viewer.roles.includes("initiative_manager"));
