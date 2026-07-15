import { getGroqClient, getGroqModel } from "@/lib/ai/groq";
import type { SerperOrganicResult } from "@/lib/discovery/serper";
import type { DiscoveredProfile } from "@/lib/discovery/constants";

function normalizeLinkedInUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!u.hostname.includes("linkedin.com")) return url;
    return `${u.origin}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export async function extractContactsWithGroq(
  results: SerperOrganicResult[],
  company: string,
): Promise<DiscoveredProfile[]> {
  const groq = getGroqClient();
  if (!groq || results.length === 0) return [];

  const payload = results.map((r) => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet ?? "",
  }));

  const response = await groq.chat.completions.create({
    model: getGroqModel(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract LinkedIn professionals as JSON. Return {"contacts":[{"name","designation","company","linkedinUrl"}]}. Only people at or related to "${company}". Skip company pages. Names must be real people.`,
      },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as {
      contacts?: Array<{
        name?: string;
        designation?: string;
        company?: string;
        linkedinUrl?: string;
      }>;
    };

    return (parsed.contacts ?? [])
      .filter((c) => c.name && c.linkedinUrl)
      .map((c) => ({
        name: c.name!.trim(),
        designation: (c.designation ?? "Employee").trim(),
        company: (c.company ?? company).trim(),
        linkedinUrl: normalizeLinkedInUrl(c.linkedinUrl!),
        source: "serper" as const,
      }));
  } catch {
    return [];
  }
}

export async function parseLinkedInPasteWithGroq(
  text: string,
  company: string,
): Promise<DiscoveredProfile[]> {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error("GROQ_API_KEY is required for smart paste parsing");
  }

  const response = await groq.chat.completions.create({
    model: getGroqModel(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Parse LinkedIn search results, profile lists, or copied page text into contacts JSON.
Return {"contacts":[{"name","designation","company","linkedinUrl","email"}]}.
company default: "${company}". email only if explicitly present. linkedinUrl required when available.
Extract every person you can find.`,
      },
      { role: "user", content: text.slice(0, 12000) },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) return [];

  const parsed = JSON.parse(raw) as {
    contacts?: Array<{
      name?: string;
      designation?: string;
      company?: string;
      linkedinUrl?: string;
      email?: string;
    }>;
  };

  return (parsed.contacts ?? [])
    .filter((c) => c.name)
    .map((c) => ({
      name: c.name!.trim(),
      designation: (c.designation ?? "Employee").trim(),
      company: (c.company ?? company).trim(),
      linkedinUrl: c.linkedinUrl ? normalizeLinkedInUrl(c.linkedinUrl) : "",
      email: c.email?.trim().toLowerCase(),
      source: "paste" as const,
    }));
}

export async function inferCompanyDomain(
  company: string,
  website?: string,
): Promise<string | null> {
  if (website?.trim()) {
    try {
      const host = new URL(
        website.startsWith("http") ? website : `https://${website}`,
      ).hostname;
      return host.replace(/^www\./, "");
    } catch {
      return website.replace(/^www\./, "").split("/")[0] || null;
    }
  }

  const groq = getGroqClient();
  if (!groq) return null;

  const response = await groq.chat.completions.create({
    model: getGroqModel(),
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Return JSON {"domain":"company.com"} for the official corporate email domain. Only the domain, no www.',
      },
      { role: "user", content: `Company: ${company}` },
    ],
  });

  try {
    const parsed = JSON.parse(
      response.choices[0]?.message?.content ?? "{}",
    ) as { domain?: string };
    return parsed.domain?.toLowerCase().replace(/^www\./, "") ?? null;
  } catch {
    return null;
  }
}
