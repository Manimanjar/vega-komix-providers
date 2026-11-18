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

// Rating & chapter count (user, 2026-11-18): the list's star sprite
// (.ir background-position) is not a reliable rating decoder, so the
// exact rating comes from the official gdata API, which takes up to 25
// galleries in ONE batch call. Best-effort: a failed call leaves posts
// without a rating instead of breaking the list. Every E-Hentai gallery
// is a single gallery = 1 chapter.
async function attachRatings(
  posts: Post[],
  providerContext: ProviderContext,
): Promise<void> {
  if (posts.length === 0) return;
  const gidlist: [number, string][] = [];
  const byGid = new Map<number, Post>();
  for (const post of posts) {
    const m = post.link.match(/\/g\/(\d+)\/([a-f0-9]+)/i);
    if (!m) continue;
    const gid = parseInt(m[1], 10);
    if (byGid.has(gid)) continue;
    gidlist.push([gid, m[2]]);
    byGid.set(gid, post);
    // Single gallery = 1 chapter (set here so it applies to every post
    // that has a parseable gallery link).
    post.chapterCount = 1;
  }
  // Any post without a parseable gallery link is still a single gallery.
  for (const post of posts) {
    if (post.chapterCount == null) post.chapterCount = 1;
  }
  if (gidlist.length === 0) return;
  try {
    const apiRes = await providerContext.axios.post(
      API_URL,
      { method: "gdata", gidlist, namespace: 1 },
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          Accept: "application/json, */*",
        },
        timeout: 15000,
      },
    );
    const gmetadata = apiRes.data?.gmetadata;
    if (!Array.isArray(gmetadata)) return;
    for (const g of gmetadata) {
      const post = byGid.get(g.gid);
      if (!post) continue;
      const rating = typeof g.rating === "number" ? g.rating : parseFloat(g.rating);
      if (Number.isFinite(rating) && rating > 0) {
        post.rating = Math.round(rating * 10) / 10;
      }
    }
  } catch {
    // Rating is enrichment only; a failed gdata call must not break
    // the list.
  }
}

// --- Cursor pagination -----------------------------------------------------
// E-Hentai IGNORES ?page=N entirely (proved live 2026-11-18: /popular?page=0,
// ?page=1 and ?page=2 all returned the same first gallery). The site
// paginates with a `next=<gid>` cursor taken from the page's "Next >" link;
// a page with no "Next" link is the last page (e.g. /popular is a single
// page of ~73 galleries). Cursors are cached in kvStore — the sandbox
// re-evaluates modules, so module-level state does not survive — keyed by
// list + page number, so scrolling to page N fetches exactly that page.

function withCursor(baseUrl: string, cursor: string): string {
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}next=${cursor}`;
}

function extractNextCursor($: any): string | null {
  let next: string | null = null;
  $("a").each((_, el) => {
    if (next) return;
    const href = $(el).attr("href") || "";
    const m = href.match(/[?&]next=(\d+)/);
    if (m) next = m[1];
  });
  return next;
}

function cursorKey(listKey: string, page: number): string {
  return `ehCursor:${listKey}:${page}`;
}

async function getCursor(kvStore: any, listKey: string, page: number): Promise<string | null> {
  try {
    const v = await kvStore.get(cursorKey(listKey, page));
    return typeof v === "string" && v ? v : null;
  } catch {
    return null;
  }
}

async function setCursor(kvStore: any, listKey: string, page: number, cursor: string): Promise<void> {
  try {
    await kvStore.set(cursorKey(listKey, page), cursor);
  } catch {
    // Cache is best-effort; a failed write just means the next scroll
    // walks forward again.
  }
}

async function fetchListPage(
  url: string,
  signal: AbortSignal | undefined,
  providerContext: ProviderContext,
): Promise<{ posts: Post[]; nextCursor: string | null }> {
  const res = await providerContext.axios.get(url, {
    headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
    signal,
    timeout: 15000,
  });
  const $ = providerContext.cheerio.load(res.data);
  const posts = parseRows($);
  await attachRatings(posts, providerContext);
  return { posts, nextCursor: extractNextCursor($) };
}

// Fetch exactly app-page `page` of one list (identified by `listKey`, fetched
// from `baseUrl`). Page 1 needs no cursor; later pages use the cached cursor
// for that page. On a cache miss (fresh install, cleared storage, or a jump
// to a page never visited) walk forward from page 1 following "Next" links
// and caching each cursor, until the requested page — or return [] if the
// list runs out first, so the app stops scrolling instead of repeating
// page 1 forever.
async function fetchCursorPage(
  listKey: string,
  baseUrl: string,
  page: number,
  signal: AbortSignal | undefined,
  providerContext: ProviderContext,
): Promise<Post[]> {
  const kvStore = providerContext.kvStore;
  if (page <= 1) {
    const { posts, nextCursor } = await fetchListPage(baseUrl, signal, providerContext);
    if (nextCursor) await setCursor(kvStore, listKey, 2, nextCursor);
    return posts;
  }
  const cached = await getCursor(kvStore, listKey, page);
  if (cached) {
    const { posts, nextCursor } = await fetchListPage(withCursor(baseUrl, cached), signal, providerContext);
    if (nextCursor) await setCursor(kvStore, listKey, page + 1, nextCursor);
    return posts;
  }
  let currentPage = 1;
  let currentUrl = baseUrl;
  let guard = 0;
  while (currentPage <= page && guard < 50) {
    guard++;
    const { posts, nextCursor } = await fetchListPage(currentUrl, signal, providerContext);
    if (currentPage === page) return posts;
    if (!nextCursor) return []; // list ended before the requested page
    await setCursor(kvStore, listKey, currentPage + 1, nextCursor);
    currentUrl = withCursor(baseUrl, nextCursor);
    currentPage++;
  }
  return [];
}

function listBaseUrl(filter: string): string {
  return filter.startsWith("/")
    ? `${BASE_URL}${filter}`
    : `${BASE_URL}/${filter}`;
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
        const posts = await fetchCursorPage(
          `s:${encodeURIComponent(term)}`,
          `${BASE_URL}/?f_search=${encodeURIComponent(term)}`,
          page,
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
    return await fetchCursorPage(
      `f:${encodeURIComponent(filter)}`,
      listBaseUrl(filter),
      page,
      signal,
      providerContext,
    );
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
  try {
    return await fetchCursorPage(
      `s:${encodeURIComponent(searchQuery.trim())}`,
      `${BASE_URL}/?f_search=${encodeURIComponent(searchQuery.trim())}`,
      page,
      signal,
      providerContext,
    );
  } catch {
    return [];
  }
}
