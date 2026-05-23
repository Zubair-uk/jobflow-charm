import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Secret",
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const HARDCODED_USER_ID = "7d21c6fb-09bf-47e0-b424-75838ac73a30";

let cachedOrgId: string | null = null;
async function getWebhookOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;
  const { data } = await supabaseAdmin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", HARDCODED_USER_ID)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  cachedOrgId = data?.organization_id ?? null;
  return cachedOrgId;
}

async function orgHasActiveAccess(orgId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("plan, trial_ends_at")
    .eq("id", orgId)
    .maybeSingle();
  if (!data) return false;
  if (data.plan && data.plan !== "free_trial") return true;
  return !!data.trial_ends_at && new Date(data.trial_ends_at).getTime() > Date.now();
}

// --- Extraction helpers -------------------------------------------------

function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const SIGN_OFF_RE =
  /\b(kind regards|best regards|warm regards|many thanks|kind thanks|regards|thanks|thank you|cheers|sincerely|yours sincerely|yours faithfully|all the best|best wishes|best)\b[,.!:\s]*/i;

function looksLikeName(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 60) return false;
  if (/[@\d]/.test(t)) return false;
  if (/^(sent from|from:|to:|subject:|date:|on .* wrote:)/i.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length < 1 || words.length > 4) return false;
  return words.every((w) => /^[A-Z][a-zA-Z'’\-]{1,}\.?$/.test(w));
}

function extractNameFromSignature(text: string): string | null {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(SIGN_OFF_RE);
    if (!m) continue;
    // Check rest of same line after sign-off
    const tail = line.slice((m.index ?? 0) + m[0].length).trim();
    if (tail && looksLikeName(tail)) return tail;
    // Otherwise scan subsequent lines
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const cand = lines[j].trim();
      if (!cand) continue;
      if (looksLikeName(cand)) return cand;
      // stop if we hit obvious non-name content
      if (/[@]|^\+?\d/.test(cand)) break;
    }
  }
  return null;
}

const UK_PHONE_RE =
  /(?:(?:\+44\s?|0044\s?|0)(?:7\d{3}|\d{2,4})[\s-]?\d{3,4}[\s-]?\d{3,4})/g;

function extractUkPhone(text: string): string | null {
  if (!text) return null;
  const matches = text.match(UK_PHONE_RE);
  if (!matches) return null;
  // Pick the first match whose digits add up to a plausible UK length (10-12)
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, "");
    const normalized = digits.startsWith("44")
      ? digits.length >= 11 && digits.length <= 13
      : digits.length >= 10 && digits.length <= 11;
    if (normalized) return raw.trim();
  }
  return null;
}

// Accept a loose payload so we can map common aliases from n8n / external sources.
const str = (max: number) => z.string().trim().max(max).optional().nullable();
const LeadSchema = z
  .object({
    full_name: str(200),
    name: str(200),
    contact_name: str(200),

    email: str(255),
    contact_email: str(255),
    sender_email: str(255),

    phone: str(40),
    contact_phone: str(40),
    phone_number: str(40),

    property_interest: str(500),
    property: str(500),

    lead_source: str(100),
    source: str(100),

    message: str(5000),
    notes: str(5000),

    status: str(50),
    ai_reply: str(5000),
    created_at: z.string().datetime().optional(),
  })
  .passthrough();

export const Route = createFileRoute("/api/public/leads-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        // TEMP: webhook auth disabled while wiring up n8n. Re-enable before going live.

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const parsed = LeadSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "Validation failed", issues: parsed.error.flatten() }, 400);
        }

        const d = parsed.data;
        const pick = (...vals: Array<string | null | undefined>) =>
          vals.find((v) => typeof v === "string" && v.trim().length > 0) ?? null;

        const fullName = pick(d.full_name, d.name, d.contact_name) ?? "Unknown";
        const email = pick(d.email, d.contact_email, d.sender_email);
        const phone = pick(d.phone, d.contact_phone, d.phone_number);
        const propertyInterest = pick(d.property_interest, d.property);
        const leadSource = pick(d.lead_source, d.source);
        const message = pick(d.message, d.notes);

        // --- Enrich from message body ---
        const cleanedMessage = message ? stripHtml(message) : "";
        const extractedName = extractNameFromSignature(cleanedMessage);
        const extractedPhone = extractUkPhone(cleanedMessage);

        console.log("[leads-webhook] extraction", {
          extracted_name: extractedName,
          extracted_phone: extractedPhone,
          incoming_full_name: fullName,
          incoming_phone: phone,
        });

        const isPlaceholderName = (n: string | null) => {
          if (!n) return true;
          const v = n.trim().toLowerCase();
          return (
            v === "" ||
            v === "unknown" ||
            v === "estate lead" ||
            v === "test estate lead" ||
            v === "lead"
          );
        };

        const finalName =
          extractedName && (isPlaceholderName(fullName) || fullName === "Unknown")
            ? extractedName
            : fullName;
        const finalPhone = phone && phone.trim() ? phone : extractedPhone;

        const orgId = await getWebhookOrgId();
        if (!orgId) {
          return json({ error: "No organization found for webhook user" }, 500);
        }
        if (!(await orgHasActiveAccess(orgId))) {
          return json(
            { error: "Trial expired. Upgrade to resume webhook processing.", code: "trial_expired" },
            402,
          );
        }

        // --- Match property by interest text ---
        let matchedPropertyId: string | null = null;
        const searchHay = [propertyInterest, cleanedMessage].filter(Boolean).join(" ").toLowerCase();
        if (searchHay) {
          const { data: props } = await supabaseAdmin
            .from("properties")
            .select("id, title, address, postcode, city")
            .eq("organization_id", orgId);
          if (props && props.length) {
            const stripSpace = (s: string) => s.replace(/\s+/g, "").toLowerCase();
            const hayNoSpace = stripSpace(searchHay);
            const match = props.find((p) => {
              const candidates = [p.postcode, p.title, p.address, p.city].filter(Boolean) as string[];
              return candidates.some((c) => {
                const cl = c.toLowerCase().trim();
                if (cl.length < 3) return false;
                if (searchHay.includes(cl)) return true;
                const cns = stripSpace(c);
                return cns.length >= 4 && hayNoSpace.includes(cns);
              });
            });
            matchedPropertyId = match?.id ?? null;
            if (matchedPropertyId) {
              console.log("[leads-webhook] property matched", { property_id: matchedPropertyId });
            }
          }
        }

        const insert = {
          user_id: HARDCODED_USER_ID,
          organization_id: orgId,
          full_name: finalName,
          name: finalName,
          email,
          phone: finalPhone,
          property_interest: propertyInterest,
          property: propertyInterest,
          property_id: matchedPropertyId,
          lead_source: leadSource,
          message: cleanedMessage || message,
          notes: cleanedMessage || message,
          status: d.status ?? "New",
          ai_reply: d.ai_reply ?? null,
          ...(d.created_at ? { created_at: d.created_at } : {}),
        };

        const { data, error } = await supabaseAdmin
          .from("leads")
          .insert(insert)
          .select("id, created_at")
          .single();

        if (error) {
          return json({ error: error.message }, 500);
        }

        return json({ success: true, auth_disabled: true }, 201);
      },
    },
  },
});