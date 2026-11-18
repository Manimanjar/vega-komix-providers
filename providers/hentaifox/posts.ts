import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://hentaifox.com";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://hentaifox.com/",
};

// The site added a category badge link (<a class="t_cat" href="/category/...">)
// as the FIRST anchor inside every .thumb, so taking the first <a> returns a
// category page instead of the gallery. The gallery link is always the anchor
// whose href starts with /gallery/.
function parseThumbs($: any): Post[] {
  const posts: Post[] = [];
  $(".lc_galleries .thumb, .overview .thumb").each((_, el) => {
    const $el = $(el);
    const a =
      $el.find('a[href^="/gallery/"]').first().length > 0
        ? $el.find('a[href^="/gallery/"]').first()
        : $el.find(".inner_thumb a").first();
    const href = a.attr("href");
    if (!href) return;
    const title =
      $el.find(".caption .g_title a").first().text().trim() ||
      $el.find("h2 a").first().text().trim() ||
      "Untitled";
    const img = $el.find("img").first();
    let cover = img.attr("data-src") || img.attr("src") || "";
    if (cover.startsWith("//")) cover = "https:" + cover;
    else if (cover.startsWith("/")) cover = `${BASE_URL}${cover}`;

    const fullLink = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    posts.push({
      title,
      link: fullLink,
      image: cover,
      poster: cover,
      cover,
      provider: "hentaifox",
      // Each gallery is a single gallery = 1 chapter. HentaiFox shows
      // no star rating or view count, so those stay unset (2026-11-18).
      chapterCount: 1,
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
  return parseThumbs($);
}

function listUrl(pathPart: string, page: number): string {
  const p = pathPart.endsWith("/") ? pathPart : `${pathPart}/`;
  return page > 1 ? `${BASE_URL}${p}pag/${page}/` : `${BASE_URL}${p}`;
}

export async function getPosts({
  page = 1,
  filter = "/",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    // "multi:/tag/mother/|/tag/sister/" merges several tag pages (used for
    // Family: the site has no single "family" tag, only mother/sister/brother/father).
    if (filter.startsWith("multi:")) {
      const parts = filter.slice(6).split("|").map((s) => s.trim()).filter(Boolean);
      const seen = new Set<string>();
      const merged: Post[] = [];
      for (const part of parts) {
        const posts = await fetchList(listUrl(part, page), signal, providerContext);
        for (const post of posts) {
          if (!seen.has(post.link)) {
            seen.add(post.link);
            merged.push(post);
          }
        }
        if (merged.length >= 60) break;
      }
      return merged.slice(0, 60);
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
  const url = page > 1
    ? `${BASE_URL}/search/pag/${page}/?q=${encodeURIComponent(searchQuery.trim())}`
    : `${BASE_URL}/search/?q=${encodeURIComponent(searchQuery.trim())}`;
  try {
    return await fetchList(url, signal, providerContext);
  } catch {
    return [];
  }
}
