/** The slice of a note the translation logic reads; content entries and test notes both satisfy it. */
export type TranslationNote = {
  slug: string;
  data: { lang: string; translationOf?: string | undefined };
};

/**
 * The translation group of a note: a language to slug map of every note linked to it through
 * `translationOf`, itself included. A link counts whichever side declares it, so one side is
 * enough, and three or more languages work. Throws, naming the notes, when the data is wrong (a
 * missing target, a note translating itself, a translation in the same language, or two notes of
 * one language in the same group): a broken link must fail the build, not be ignored silently.
 */
export function translationsOf(
  notes: readonly TranslationNote[],
  slug: string,
): Record<string, string> {
  const bySlug = new Map(notes.map((note) => [note.slug, note]));
  if (!bySlug.has(slug)) throw new Error(`Note "${slug}" does not exist.`);

  const neighbors = new Map<string, Set<string>>();
  const problems = new Map<string, string>();
  const connect = (a: string, b: string): void => {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const) {
      const set = neighbors.get(from) ?? new Set<string>();
      set.add(to);
      neighbors.set(from, set);
    }
  };

  for (const note of notes) {
    const target = note.data.translationOf;
    if (!target) continue;
    const other = bySlug.get(target);
    if (target === note.slug) {
      problems.set(note.slug, `Note "${note.slug}" says it translates itself.`);
    } else if (!other) {
      problems.set(
        note.slug,
        `Note "${note.slug}" says it translates "${target}", which does not exist (is it an unpublished draft? Publish both notes together or remove translationOf).`,
      );
    } else {
      connect(note.slug, target);
      if (other.data.lang === note.data.lang) {
        problems.set(
          note.slug,
          `Notes "${note.slug}" and "${target}" are in the same language (${note.data.lang}); a translation must be in another language.`,
        );
      }
    }
  }

  const group = new Set([slug]);
  const queue = [slug];
  for (const current of queue) {
    for (const next of neighbors.get(current) ?? []) {
      if (!group.has(next)) {
        group.add(next);
        queue.push(next);
      }
    }
  }

  for (const member of group) {
    const problem = problems.get(member);
    if (problem) throw new Error(problem);
  }

  const byLang = new Map<string, string[]>();
  for (const member of group) {
    const lang = bySlug.get(member)?.data.lang ?? '';
    byLang.set(lang, [...(byLang.get(lang) ?? []), member]);
  }
  for (const [lang, members] of byLang) {
    if (members.length > 1) {
      throw new Error(
        `Translations of "${slug}" are ambiguous: ${members.map((m) => `"${m}"`).join(' and ')} are both in ${lang}.`,
      );
    }
  }
  return Object.fromEntries([...byLang].map(([lang, members]) => [lang, members[0] ?? '']));
}

/**
 * The `hreflang` alternates of a translation group (default language first, then the rest by
 * code, then `x-default` pointing at the default-language note). Empty when there is no translation.
 */
export function translationAlternates(
  group: Record<string, string>,
  defaultLocale: string,
  pathFor: (lang: string, slug: string) => string,
): { hreflang: string; path: string }[] {
  const languages = Object.keys(group);
  if (languages.length < 2) return [];
  const ordered = [
    ...languages.filter((lang) => lang === defaultLocale),
    ...languages.filter((lang) => lang !== defaultLocale).sort(),
  ];
  const entries = ordered.map((lang) => ({
    hreflang: lang,
    path: pathFor(lang, group[lang] ?? ''),
  }));
  const defaultSlug = group[defaultLocale];
  return defaultSlug
    ? [...entries, { hreflang: 'x-default', path: pathFor(defaultLocale, defaultSlug) }]
    : entries;
}
