import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  extractNameFromSignature,
  extractUkPhone,
  isPlaceholderName,
  stripHtml,
} from "./extract-lead.server";
import { matchPropertyForOrg } from "./match-property.server";

export type LeadSource = "gmail" | "outlook" | "website" | "manual" | "api";

export interface IncomingLead {
  organizationId: string;
  ownerUserId: string;
  source: LeadSource;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  propertyInterest?: string | null;
  message?: string | null;
  subject?: string | null;
  status?: string | null;
  aiReply?: string | null;
  receivedAt?: string | null;
}

export interface IngestResult {
  id: string;
  created_at: string;
  full_name: string;
  phone: string | null;
  property_id: string | null;
}

export async function ingestLead(input: IncomingLead): Promise<IngestResult> {
  const cleanedMessage = input.message ? stripHtml(input.message) : "";
  const extractedName = extractNameFromSignature(cleanedMessage);
  const extractedPhone = extractUkPhone(cleanedMessage);

  const incomingName = input.fullName?.trim() || "Unknown";
  const finalName =
    extractedName && (isPlaceholderName(incomingName) || incomingName === "Unknown")
      ? extractedName
      : incomingName;

  const incomingPhone = input.phone?.trim() || null;
  const finalPhone = incomingPhone || extractedPhone;

  console.log("[ingestLead]", {
    source: input.source,
    organization_id: input.organizationId,
    extracted_name: extractedName,
    extracted_phone: extractedPhone,
    incoming_full_name: input.fullName ?? null,
    incoming_phone: incomingPhone,
  });

  const searchHay = [input.propertyInterest, cleanedMessage]
    .filter(Boolean)
    .join(" ");
  const matchedPropertyId = await matchPropertyForOrg(
    input.organizationId,
    searchHay,
  );

  const insert = {
    user_id: input.ownerUserId,
    organization_id: input.organizationId,
    full_name: finalName,
    name: finalName,
    email: input.email ?? null,
    phone: finalPhone,
    property_interest: input.propertyInterest ?? null,
    property: input.propertyInterest ?? null,
    property_id: matchedPropertyId,
    lead_source: input.source,
    message: cleanedMessage || input.message || null,
    notes: cleanedMessage || input.message || null,
    status: input.status ?? "New",
    ai_reply: input.aiReply ?? null,
    ...(input.receivedAt ? { created_at: input.receivedAt } : {}),
  };

  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert(insert)
    .select("id, created_at")
    .single();

  if (error) throw new Error(error.message);

  // Record activity timeline events for this lead. Best-effort: never block
  // the ingest pipeline if event logging fails.
  try {
    const events: Array<{
      organization_id: string;
      lead_id: string;
      event_type: string;
      message: string;
      payload: Record<string, unknown>;
    }> = [
      {
        organization_id: input.organizationId,
        lead_id: data.id,
        event_type: "lead_received",
        message: `Lead received from ${input.source}`,
        payload: { source: input.source, email: input.email ?? null },
      },
      {
        organization_id: input.organizationId,
        lead_id: data.id,
        event_type: "ai_extraction_completed",
        message: "AI extraction completed",
        payload: {
          extracted_name: extractedName,
          extracted_phone: extractedPhone,
          matched_property_id: matchedPropertyId,
        },
      },
    ];
    if (input.aiReply) {
      events.push({
        organization_id: input.organizationId,
        lead_id: data.id,
        event_type: "ai_reply_generated",
        message: "AI reply generated",
        payload: { length: input.aiReply.length },
      });
    }
    await supabaseAdmin.from("lead_events").insert(events);
  } catch (e) {
    console.warn("[ingestLead] event logging failed", e);
  }

  return {
    id: data.id,
    created_at: data.created_at,
    full_name: finalName,
    phone: finalPhone,
    property_id: matchedPropertyId,
  };
}

// Resolve which (organization_id, user_id) a webhook should write under,
// given an organization. Falls back to the org owner when no specific
// caller user exists (e.g. inbound webhooks).
export async function getOrgWebhookOwner(orgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("owner_id")
    .eq("id", orgId)
    .maybeSingle();
  return data?.owner_id ?? null;
}

export async function orgHasActiveAccess(orgId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("plan, trial_ends_at")
    .eq("id", orgId)
    .maybeSingle();
  if (!data) return false;
  if (data.plan && data.plan !== "free_trial") return true;
  return !!data.trial_ends_at && new Date(data.trial_ends_at).getTime() > Date.now();
}