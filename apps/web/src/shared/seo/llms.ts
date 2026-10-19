export type LlmsLink = { title: string; url: string; description?: string | undefined };
export type LlmsSection = { heading: string; links: readonly LlmsLink[] };

export type LlmsInput = {
  name: string;
  summary: string;
  /** Plain facts under the summary, one bullet each (location, topics, crawler policy). */
  facts: readonly string[];
  sections: readonly LlmsSection[];
};

const line = ({ title, url, description }: LlmsLink): string =>
  `- [${title}](${url})${description ? `: ${description}` : ''}`;

/**
 * The `/llms.txt` file (https://llmstxt.org): a Markdown map of the site for language models, with
 * the owner as the title, a summary, and links with one sentence each. Sections with no links are dropped.
 */
export function buildLlmsTxt(input: LlmsInput): string {
  const parts = [`# ${input.name}`, `> ${input.summary}`];
  if (input.facts.length > 0) parts.push(input.facts.map((fact) => `- ${fact}`).join('\n'));
  for (const section of input.sections) {
    if (section.links.length === 0) continue;
    parts.push(`## ${section.heading}\n\n${section.links.map(line).join('\n')}`);
  }
  return `${parts.join('\n\n')}\n`;
}
