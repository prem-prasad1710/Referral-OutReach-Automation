import { serverFetch } from "@/lib/server-fetch";

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet?: string;
  position?: number;
}

export interface SerperResponse {
  organic?: SerperOrganicResult[];
}

export async function serperSearch(
  query: string,
  num = 10,
): Promise<SerperOrganicResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SERPER_API_KEY is not set. Get a free key at https://serper.dev",
    );
  }

  const response = await serverFetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Serper search failed: ${text}`);
  }

  const data = (await response.json()) as SerperResponse;
  return data.organic ?? [];
}

export function parseLinkedInSearchResult(
  result: SerperOrganicResult,
  fallbackCompany: string,
): { name: string; designation: string; company: string; linkedinUrl: string } | null {
  if (!result.link.includes("linkedin.com/in/")) return null;

  const linkedinUrl = result.link.split("?")[0];

  // Title format: "Name - Title - Company | LinkedIn"
  const titleMatch = result.title.match(
    /^(.+?)\s[-–—]\s(.+?)\s[-–—]\s(.+?)\s\|\sLinkedIn/i,
  );
  if (titleMatch) {
    return {
      name: titleMatch[1].trim(),
      designation: titleMatch[2].trim(),
      company: titleMatch[3].trim(),
      linkedinUrl,
    };
  }

  // Fallback: "Name | LinkedIn" + snippet for title
  const nameOnly = result.title.replace(/\s\|\sLinkedIn.*$/i, "").trim();
  if (!nameOnly) return null;

  const designation =
    result.snippet?.split("·")[0]?.trim() ||
    result.snippet?.split(".")[0]?.trim() ||
    "Employee";

  return {
    name: nameOnly,
    designation,
    company: fallbackCompany,
    linkedinUrl,
  };
}
