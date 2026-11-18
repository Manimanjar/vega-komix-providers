import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://kingcomix.com";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://kingcomix.com/",
};

// The site has no <article>/<post> cards on browse pages: posts are
// <div class="entry"> blocks with a cover <img> and an <h2 class="information">
// title link. Search results are <article class="thumb-block"> cards whose
// title lives in the anchor's title attribute (no h2 at all). Both are parsed
// here, with titles never left as "Untitled".
function parseCards($: any): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();
  const push = (title: string, href: string, cover: string) => {
    if (!href || seen.has(href)) return;
    const fullLink = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    if (fullLink.includes("/category/") || fullLink.includes("/tag/")) return;
    seen.add(fullLink);
    let img = cover;
    if (img.startsWith("//")) img = "https:" + img;
    else if (img.startsWith("/")) img = `${BASE_URL}${img}`;
    posts.push({
      title: title || "Untitled Comic",
      link: fullLink,
      image: img,
      poster: img,
      cover: img,
      provider: "kingcomix",
      // Each comic is a single comic = 1 chapter. KingComix shows no
      // star rating or view count on list cards, so those stay unset
      // (2026-11-18).
      chapterCount: 1,
    });
  };

  $(".entry").each((_, el) => {
    const $el = $(el);
    const a = $el.find("h2.information a").first();
    const href = a.attr("href") || $el.find("a").first().attr("href") || "";
    const title =
      a.text().trim() ||
      $el.find("a").first().attr("title") ||
      $el.find("img").first().attr("alt") ||
      "";
    const cover = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";
    push(title, href, cover);
  });

  $("article.thumb-block").each((_, el) => {
    const $el = $(el);
    const a = $el.find("a").first();
    const href = a.attr("href") || "";
    const title =
      a.attr("title") || $el.find("img").first().attr("alt") || a.text().trim() || "";
    const cover = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";
    push(title, href, cover);
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
  return parseCards($);
}

function searchUrl(q: string, page: number): string {
  // WordPress pagination is `paged=`, NOT `page=` — `page=` is ignored
  // and the site returns page 1 every time (proved live 2026-11-18:
  // &page=2 returned the same first comic as page 1, &paged=2 a new one).
  return page > 1
    ? `${BASE_URL}/?s=${encodeURIComponent(q)}&paged=${page}`
    : `${BASE_URL}/?s=${encodeURIComponent(q)}`;
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
    // "search:mother|sister" merges several site searches (used for Incest:
    // the site has no incest tag and /?s=incest returns nothing, while mother
    // and sister searches return real family-themed comics).
    if (filter.startsWith("search:")) {
      const terms = filter.slice(7).split("|").map((s) => s.trim()).filter(Boolean);
      const seen = new Set<string>();
      const merged: Post[] = [];
      for (const term of terms) {
        const posts = await fetchList(searchUrl(term, page), signal, providerContext);
        for (const post of posts) {
          if (!seen.has(post.link)) {
            seen.add(post.link);
            merged.push(post);
          }
        }
        if (merged.length >= 48) break;
      }
      return merged.slice(0, 48);
    }
    const url = page > 1
      ? (filter.includes("?") ? `${BASE_URL}${filter}&paged=${page}` : `${BASE_URL}${filter}page/${page}/`)
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
    return await fetchList(searchUrl(searchQuery.trim(), page), signal, providerContext);
  } catch {
    return [];
  }
}
