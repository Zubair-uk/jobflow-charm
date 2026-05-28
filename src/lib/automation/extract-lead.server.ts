// Shared lead-extraction helpers. Server-only so we can call them from
// the native ingest pipeline (and any future ingest source) without
// duplicating logic.

export function stripHtml(input: string): string {
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

export function extractNameFromSignature(text: string): string | null {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(SIGN_OFF_RE);
    if (!m) continue;
    const tail = line.slice((m.index ?? 0) + m[0].length).trim();
    if (tail && looksLikeName(tail)) return tail;
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const cand = lines[j].trim();
      if (!cand) continue;
      if (looksLikeName(cand)) return cand;
      if (/[@]|^\+?\d/.test(cand)) break;
    }
  }
  return null;
}

const UK_PHONE_RE =
  /(?:(?:\+44\s?|0044\s?|0)(?:7\d{3}|\d{2,4})[\s-]?\d{3,4}[\s-]?\d{3,4})/g;

export function extractUkPhone(text: string): string | null {
  if (!text) return null;
  const matches = text.match(UK_PHONE_RE);
  if (!matches) return null;
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, "");
    const normalized = digits.startsWith("44")
      ? digits.length >= 11 && digits.length <= 13
      : digits.length >= 10 && digits.length <= 11;
    if (normalized) return raw.trim();
  }
  return null;
}

export function isPlaceholderName(n: string | null | undefined): boolean {
  if (!n) return true;
  const v = n.trim().toLowerCase();
  return (
    v === "" ||
    v === "unknown" ||
    v === "estate lead" ||
    v === "test estate lead" ||
    v === "lead"
  );
}