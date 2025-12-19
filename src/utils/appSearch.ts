import type { InstalledApp } from './types';

export interface SearchIndexEntry<T> {
  item: T;
  name: string;
  haystack: string;
}

function normalize(s: string): string {
  // Lowercase + strip diacritics for tolerant search.
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreText(haystack: string, name: string, query: string): number {
  if (!query) return 0;

  // Exact-ish matches first.
  if (name === query) return 1000;
  if (name.startsWith(query)) return 700;
  if (name.includes(query)) return 500;
  if (haystack.includes(query)) return 250;

  // Fuzzy subsequence score on the name, then on the full haystack.
  const fuzzy = (text: string, pat: string): number => {
    let ti = 0;
    let consecutive = 0;
    let score = 0;
    for (let pi = 0; pi < pat.length; pi++) {
      const pc = pat[pi]!;
      let found = false;
      while (ti < text.length) {
        const tc = text[ti]!;
        if (tc === pc) {
          found = true;
          consecutive++;
          score += 5 + consecutive * 2;
          ti++;
          break;
        }
        consecutive = 0;
        ti++;
      }
      if (!found) return 0;
    }
    // Prefer earlier matches.
    return Math.max(0, score - ti);
  };

  return Math.max(fuzzy(name, query), fuzzy(haystack, query) * 0.5);
}

export function buildSearchIndex(apps: InstalledApp[]): SearchIndexEntry<InstalledApp>[] {
  return apps.map(app => {
    const name = normalize(app.name || '');
    const parts = [
      app.name,
      app.genericName,
      app.comment,
      ...(app.categories || []),
      ...((app.keywords as string[] | undefined) || []),
      app.exec,
    ].filter(Boolean) as string[];

    return {
      item: app,
      name,
      haystack: normalize(parts.join(' ')),
    };
  });
}

export function searchIndex<T>(
  index: SearchIndexEntry<T>[],
  queryRaw: string,
  limit = 30,
): T[] {
  const query = normalize(queryRaw || '');
  if (!query) return [];

  return index
    .map(e => ({ e, score: scoreText(e.haystack, e.name, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.e.item);
}

