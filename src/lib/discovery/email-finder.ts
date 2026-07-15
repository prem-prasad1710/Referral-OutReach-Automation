import { serverFetch } from "@/lib/server-fetch";
import { serperSearch } from "@/lib/discovery/serper";
import type { DiscoveredProfile } from "@/lib/discovery/constants";

interface HunterEmail {
  value: string;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, "").trim();
}

function nameTokens(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  return {
    first: (parts[0] ?? "").toLowerCase(),
    last: (parts[parts.length - 1] ?? "").toLowerCase(),
  };
}

function emailMatchesName(email: string, name: string): boolean {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const { first, last } = nameTokens(name);
  if (!first) return false;
  return (
    local.includes(first) &&
    (last.length < 2 || local.includes(last) || local.includes(last[0]))
  );
}

async function hunterDomainSearch(domain: string): Promise<HunterEmail[]> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("limit", "50");

  const response = await serverFetch(url.toString());
  if (!response.ok) return [];

  const data = (await response.json()) as {
    data?: { emails?: HunterEmail[] };
  };
  return data.data?.emails ?? [];
}

function patternEmails(name: string, domain: string): string[] {
  const { first, last } = nameTokens(name);
  if (!first || !last) return [];
  return [
    `${first}.${last}@${domain}`,
    `${first}${last}@${domain}`,
    `${first[0]}${last}@${domain}`,
    `${first}@${domain}`,
  ];
}

async function serperFindEmail(
  name: string,
  company: string,
  domain?: string,
): Promise<string | null> {
  const query = domain
    ? `"${name}" "${company}" @${domain} email`
    : `"${name}" "${company}" email contact`;
  try {
    const results = await serperSearch(query, 5);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    for (const r of results) {
      const text = `${r.title} ${r.snippet ?? ""}`;
      const matches = text.match(emailRegex) ?? [];
      for (const email of matches) {
        const lower = email.toLowerCase();
        if (!domain || lower.endsWith(`@${domain}`)) {
          if (emailMatchesName(lower, name)) return lower;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function enrichContactsWithEmails(
  profiles: DiscoveredProfile[],
  domain: string | null,
): Promise<DiscoveredProfile[]> {
  const hunterPool = domain ? await hunterDomainSearch(domain) : [];

  const enriched: DiscoveredProfile[] = [];

  for (const profile of profiles) {
    if (profile.email) {
      enriched.push(profile);
      continue;
    }

    let email: string | undefined;

    // 1. Hunter name match
    if (domain && hunterPool.length > 0) {
      const { first, last } = nameTokens(profile.name);
      const hunterHit = hunterPool.find((h) => {
        const hf = (h.first_name ?? "").toLowerCase();
        const hl = (h.last_name ?? "").toLowerCase();
        return hf === first && (last.length < 2 || hl === last || hl.startsWith(last));
      });
      if (hunterHit?.value) {
        email = hunterHit.value.toLowerCase();
        profile.source = "hunter";
      }
    }

    // 2. Serper email search
    if (!email) {
      const found = await serperFindEmail(profile.name, profile.company, domain ?? undefined);
      if (found) {
        email = found;
        profile.source = "serper_email";
      }
    }

    // 3. Common patterns (mark valid if domain known — best effort)
    if (!email && domain) {
      const patterns = patternEmails(profile.name, domain);
      email = patterns[0];
      profile.source = "pattern";
    }

    enriched.push({ ...profile, email });
  }

  return enriched;
}

export function dedupeProfiles(profiles: DiscoveredProfile[]): DiscoveredProfile[] {
  const seen = new Map<string, DiscoveredProfile>();

  for (const p of profiles) {
    const key = p.linkedinUrl
      ? p.linkedinUrl.toLowerCase()
      : `${normalizeName(p.name)}|${normalizeName(p.company)}`;
    if (!seen.has(key)) seen.set(key, p);
  }

  return Array.from(seen.values());
}
