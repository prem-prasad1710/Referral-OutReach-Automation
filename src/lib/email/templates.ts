import type { TemplateContext } from "@/types";

const PLACEHOLDER_REGEX = /\{\{\s*([\w.]+)\s*\}\}/g;

export function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function buildTemplateContext(contact: {
  name: string;
  email: string;
  company: string;
  designation: string;
  personalizedIntro?: string;
}): TemplateContext {
  return {
    name: getFirstName(contact.name),
    company: contact.company,
    designation: contact.designation,
    ai_intro: contact.personalizedIntro ?? "",
    email: contact.email,
  };
}

export function renderTemplate(
  template: string,
  context: TemplateContext,
): string {
  return template.replace(PLACEHOLDER_REGEX, (_match, key: string) => {
    if (key in context && context[key as keyof TemplateContext] != null) {
      return String(context[key as keyof TemplateContext]);
    }
    return "";
  });
}

export function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() ? `<p>${line}</p>` : "<br/>"))
    .join("");
}
