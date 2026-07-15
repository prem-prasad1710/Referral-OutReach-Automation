import {
  DISCOVERY_ROLE_QUERIES,
  type DiscoverRequest,
  type DiscoverResult,
  type DiscoveryRoleId,
  type DiscoveredProfile,
} from "@/lib/discovery/constants";
import { upsertDiscoveredContacts } from "@/lib/discovery/upsert";
import { serperSearch, parseLinkedInSearchResult } from "@/lib/discovery/serper";
import {
  extractContactsWithGroq,
  inferCompanyDomain,
} from "@/lib/discovery/extract-contacts";
import {
  dedupeProfiles,
  enrichContactsWithEmails,
} from "@/lib/discovery/email-finder";

export async function autoDiscoverContacts(
  request: DiscoverRequest,
): Promise<DiscoverResult> {
  const company = request.company.trim();
  if (!company) throw new Error("Company name is required");

  const roleIds = request.roles?.length
    ? request.roles
    : (DISCOVERY_ROLE_QUERIES.map((r) => r.id) as DiscoveryRoleId[]);

  const maxPerRole = Math.min(request.maxPerRole ?? 8, 15);
  const selectedRoles = DISCOVERY_ROLE_QUERIES.filter((r) =>
    roleIds.includes(r.id),
  );

  const allResults: DiscoveredProfile[] = [];

  for (const role of selectedRoles) {
    const query = `site:linkedin.com/in "${company}" ${role.query}`;
    const organic = await serperSearch(query, maxPerRole);

    for (const item of organic) {
      const parsed = parseLinkedInSearchResult(item, company);
      if (parsed) {
        allResults.push({ ...parsed, source: "serper" });
      }
    }

    // Groq enrichment for any results Groq can structure better
    const groqExtracted = await extractContactsWithGroq(organic, company);
    allResults.push(...groqExtracted);
  }

  let profiles = dedupeProfiles(allResults);

  const domain = await inferCompanyDomain(company, request.companyDomain);
  profiles = await enrichContactsWithEmails(profiles, domain);

  const withEmail = profiles.filter((p) => p.email);
  const skippedNoEmail = profiles.length - withEmail.length;

  const { created, updated, duplicates } = await upsertDiscoveredContacts(
    withEmail.map((p) => ({
      name: p.name,
      email: p.email!,
      company: p.company,
      designation: p.designation,
      linkedinUrl: p.linkedinUrl || undefined,
    })),
  );

  return {
    found: profiles,
    imported: created,
    updated,
    skippedNoEmail,
    duplicates,
  };
}
