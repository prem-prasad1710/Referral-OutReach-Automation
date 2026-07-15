export const DISCOVERY_ROLE_QUERIES = [
  { id: "recruiter", label: "Recruiters & Talent Acquisition", query: "recruiter OR \"talent acquisition\" OR \"technical recruiter\"" },
  { id: "hr", label: "HR & People Ops", query: "\"human resources\" OR HR OR \"people operations\" OR \"HR manager\"" },
  { id: "engineering_manager", label: "Engineering Managers", query: "\"engineering manager\" OR \"hiring manager\" OR \"director of engineering\"" },
  { id: "engineer", label: "Software Engineers", query: "\"software engineer\" OR \"senior software engineer\" OR \"staff engineer\"" },
  { id: "leadership", label: "Tech Leadership", query: "CTO OR \"VP engineering\" OR \"head of engineering\"" },
] as const;

export type DiscoveryRoleId = (typeof DISCOVERY_ROLE_QUERIES)[number]["id"];

export interface DiscoveredProfile {
  name: string;
  designation: string;
  company: string;
  linkedinUrl: string;
  email?: string;
  source: "serper" | "hunter" | "pattern" | "serper_email" | "paste";
}

export interface DiscoverRequest {
  company: string;
  companyDomain?: string;
  roles?: DiscoveryRoleId[];
  maxPerRole?: number;
}

export interface DiscoverResult {
  found: DiscoveredProfile[];
  imported: number;
  updated: number;
  skippedNoEmail: number;
  duplicates: number;
}
