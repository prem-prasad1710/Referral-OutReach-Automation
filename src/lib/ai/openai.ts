import OpenAI from "openai";
import { getFirstName } from "@/lib/email/templates";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

const FALLBACK_VARIANTS = [
  "Your experience as {{designation}} at {{company}} caught my attention.",
  "I was impressed by your journey as {{designation}} at {{company}}.",
  "Your background at {{company}} as {{designation}} stood out to me.",
  "I noticed your work as {{designation}} at {{company}} and wanted to connect.",
];

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: GROQ_BASE_URL,
    });
  }
  return client;
}

export interface PersonalizedIntroInput {
  name: string;
  email: string;
  company: string;
  designation: string;
  index?: number;
}

function buildFallbackIntro(input: PersonalizedIntroInput): string {
  const variant =
    FALLBACK_VARIANTS[(input.index ?? 0) % FALLBACK_VARIANTS.length];
  return variant
    .replace(/\{\{designation\}\}/g, input.designation)
    .replace(/\{\{company\}\}/g, input.company);
}

export async function generatePersonalizedIntro(
  input: PersonalizedIntroInput,
): Promise<string> {
  const firstName = getFirstName(input.name);
  const groq = getClient();

  if (!groq) {
    return buildFallbackIntro(input);
  }

  const prompt = [
    "Write exactly one professional sentence (max 30 words) for a job referral email intro.",
    `Recipient: ${firstName}, ${input.designation} at ${input.company}.`,
    "Reference their designation and company naturally.",
    "Do not include greeting or sign-off. Plain text only.",
    `Variation seed: ${input.index ?? 0}`,
  ].join(" ");

  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
      temperature: 0.85,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "You write unique, professional referral outreach sentences. Each output must differ in wording. No placeholders.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (text) return text;
  } catch {
    // fall through to template fallback
  }

  return buildFallbackIntro(input);
}

export async function generatePersonalizedIntros(
  contacts: PersonalizedIntroInput[],
): Promise<{ contactId: string; intro: string }[]> {
  const results: { contactId: string; intro: string }[] = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const intro = await generatePersonalizedIntro({ ...contact, index: i });
    results.push({ contactId: contact.email, intro });
  }

  return results;
}
