import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://e-hentai.org";
export const API_URL = "https://api.e-hentai.org/api.php";

// E-Hentai double-encodes some titles: both the list pages and the official
// gdata API return the literal string &#039; in titles. Decode a second time.
export function decodeEntities(s: string): string {
  return s
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#0?34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCharCode(parseInt(n, 10));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => {
      try {
        return String.fromCharCode(parseInt(n, 16));
      } catch {
        return "";
      }
    });
}

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://e-hentai.org/",
};

// Each gallery is one <tr> in table.itg. The old selector listed ".itg tr,
// .gl1t, .gl2t, .itg .gl1c" — the same gallery matched as a row AND as its
// cells, so Popular returned 74 rows for 25 galleries. Iterate only rows
// that contain a .glink title div. The title must come from .glink itself:
// the row's first <a> is the thumbnail anchor (empty text), which is why
// titles used to come out as "Gallery".
function parseRows($: any): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();
  $(".itg tr").each((_, el) => {
    const $row = $(el);
    const glink = $row.find(".glink").first();
    if (glink.length === 0) return; // header/footer rows
    const title = decodeEntities(glink.text().trim());
    if (!title) return;
    const href = $row.find("a[href*='/g/']").first().attr("href");
    if (!href || seen.has(href)) return;
    seen.add(href);
    const img = $row.find("img").first();
    // Thumbnails are lazy-loaded: src is a 1px transparent placeholder gif and
    // the real address is in data-src. Prefer data-src and drop data: URIs,
    // otherwise the app shows an invisible thumbnail that never errors.
    const rawCover = img.attr("data-src") || img.attr("src") || "";
    const cover = rawCover.startsWith("data:") ? "" : rawCover;
    posts.push({
      title,
      link: href,
      image: cover,
      poster: cover,
      cover,
      provider: "ehentai",
    });
  });
  return posts;
}

async function fetchList(
  url: string,
  signal: AbortSignal | undefined,
  providerContext: ProviderContext,
): Promise<Post[]> {
  const res = await providerContext.axios.get(url, {
    headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
    signal,
    timeout: 15000,
  });
  const $ = providerContext.cheerio.load(res.data);
  return parseRows($);
}

function listUrl(filter: string, page: number): string {
  return filter.startsWith("/")
    ? `${BASE_URL}${filter}?page=${page - 1}`
    : `${BASE_URL}/${filter}&page=${page - 1}`;
}

export async function getPosts({
  page = 1,
  filter = "?f_cats=511",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    // "fsearch:mother|sister|brother" merges several f_search queries (used
    // for Incest: the site's search returns "No hits" for the word incest
    // itself, while mother/sister/brother searches return real results).
    if (filter.startsWith("fsearch:")) {
      const terms = filter.slice(8).split("|").map((s) => s.trim()).filter(Boolean);
      const seen = new Set<string>();
      const merged: Post[] = [];
      for (const term of terms) {
        const posts = await fetchList(
          `${BASE_URL}/?f_search=${encodeURIComponent(term)}&page=${page - 1}`,
          signal,
          providerContext,
        );
        for (const post of posts) {
          if (!seen.has(post.link)) {
            seen.add(post.link);
            merged.push(post);
          }
        }
        if (merged.length >= 50) break;
      }
      return merged.slice(0, 50);
    }
    return await fetchList(listUrl(filter, page), signal, providerContext);
  } catch {
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery?.trim()) return [];
  const url = `${BASE_URL}/?f_search=${encodeURIComponent(searchQuery.trim())}&page=${page - 1}`;
  try {
    return await fetchList(url, signal, providerContext);
  } catch {
    return [];
  }
}
