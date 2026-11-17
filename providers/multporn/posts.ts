import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://multporn.net";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://multporn.net/",
};

// Listings come in two layouts: /new and search use masonry .views-row cards,
// while /comics, /games and /hentai_manga use a <table class="views-view-grid">
// grid whose cells hold a <strong><a> title and an <a><img> cover. Parse both.
//
// Two traps found live (2026-11-18):
// - Search results mix real comics with artist pages (/user_content/, /authors_comics/),
//   category pages (/category*, /category_gay/, /category_hentai/), tag pages (/user_tags/)
//   and games (/games/) — those rows have no cover and no readable pages, so they
//   show up in the app as blank thumbnails that error on open. Only /comics/ and
//   /hentai_manga/ links are real comics; everything else is skipped in push().
// - /comics and /hentai_manga themselves are A-Z series indexes: every cell links
//   to a series page, not a comic, so tapping any of them returned 0 pages.
//   fetchIndexComics() opens each series page and lists the real comics inside.
function parseCards($: any): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();
  const push = (title: string, href: string, cover: string) => {
    if (!href || seen.has(href)) return;
    // Real comics live only under /comics/ and /hentai_manga/. Artist, category,
    // tag, game and /mp… links are listing pages, not comics — skip them.
    if (!/^\/(comics|hentai_manga)\//.test(href)) return;
    const fullLink = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    seen.add(fullLink);
    let img = cover;
    if (img.startsWith("//")) img = "https:" + img;
    else if (img.startsWith("/")) img = `${BASE_URL}${img}`;
    posts.push({
      title: title || "Untitled",
      link: fullLink,
      image: img,
      poster: img,
      cover: img,
      provider: "multporn",
    });
  };

  $(".view-content .views-row, .masonry-item").each((_, el) => {
    const $el = $(el);
    const a = $el.find(".views-field-title a").first().length > 0
      ? $el.find(".views-field-title a").first()
      : $el.find("a").first();
    const href = a.attr("href") || "";
    const title = $el.find(".views-field-title a").first().text().trim() || a.text().trim();
    const img = $el.find("img").first();
    push(title, href, img.attr("src") || img.attr("data-src") || "");
  });

  $("table.views-view-grid td").each((_, el) => {
    const $el = $(el);
    const a = $el.find("strong a").first().length > 0
      ? $el.find("strong a").first()
      : $el.find("a").first();
    const href = a.attr("href") || "";
    const title = $el.find("strong a").first().text().trim() || a.text().trim();
    const img = $el.find("img").first();
    push(title, href, img.attr("src") || img.attr("data-src") || "");
  });

  return posts;
}

async function fetchList(
  url: string,
  signal: AbortSignal | undefined,
  providerContext: ProviderContext,
  timeout = 15000,
): Promise<Post[]> {
  const res = await providerContext.axios.get(url, {
    headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
    signal,
    timeout,
  });
  const $ = providerContext.cheerio.load(res.data);
  return parseCards($);
}

function searchUrl(q: string, page: number): string {
  // The site's search form submits the field "search_api_views_fulltext" to
  // /search — the old ?query= URL returns an empty page.
  return page > 1
    ? `${BASE_URL}/search?search_api_views_fulltext=${encodeURIComponent(q)}&page=${page - 1}`
    : `${BASE_URL}/search?search_api_views_fulltext=${encodeURIComponent(q)}`;
}

// /comics and /hentai_manga are A-Z series indexes, not comic lists. Open every
// series page on the index and merge the real comics inside (parallel, capped).
async function fetchIndexComics(
  indexPath: string,
  page: number,
  signal: AbortSignal | undefined,
  providerContext: ProviderContext,
): Promise<Post[]> {
  const indexUrl =
    page > 1 ? `${BASE_URL}${indexPath}?page=${page - 1}` : `${BASE_URL}${indexPath}`;
  const indexRes = await providerContext.axios.get(indexUrl, {
    headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
    signal,
    timeout: 15000,
  });
  const $index = providerContext.cheerio.load(indexRes.data);
  const seriesHrefs: string[] = [];
  $index("table.views-view-grid td").each((_, el) => {
    const href = $index(el).find("strong a").first().attr("href")
      || $index(el).find("a").first().attr("href")
      || "";
    if (href) seriesHrefs.push(href);
  });
  const merged: Post[] = [];
  const seen = new Set<string>();
  const results = await Promise.allSettled(
    seriesHrefs.map(async (href) => {
      const url = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
      const res = await providerContext.axios.get(url, {
        headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
        signal,
        timeout: 15000,
      });
      return parseCards(providerContext.cheerio.load(res.data));
    }),
  );
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const post of r.value) {
      if (!seen.has(post.link)) {
        seen.add(post.link);
        merged.push(post);
      }
    }
    if (merged.length >= 60) break;
  }
  return merged.slice(0, 60);
}

export async function getPosts({
  page = 1,
  filter = "/new",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    if (filter.startsWith("search:")) {
      return await fetchList(searchUrl(filter.slice(7).trim(), page), signal, providerContext, 25000);
    }
    // /comics and /hentai_manga are series indexes — expand them into real comics.
    if (filter === "/comics" || filter === "/hentai_manga") {
      return await fetchIndexComics(filter, page, signal, providerContext);
    }
    const url = page > 1
      ? `${BASE_URL}${filter}?page=${page - 1}`
      : `${BASE_URL}${filter}`;
    return await fetchList(url, signal, providerContext);
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
    return await fetchList(searchUrl(searchQuery.trim(), page), signal, providerContext, 25000);
  } catch {
    return [];
  }
}
