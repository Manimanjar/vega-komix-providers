import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://hdporncomics.com";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://hdporncomics.com/",
};

// The site was redesigned (2026): listings are now grids of .comic-image cards
// (tag/category/search pages) plus .slider-item cards on the homepage. The old
// selectors (.post-list article, .item-box, article) match whole sections, not
// comics. A card is <div class="comic-image"><a href="..."><picture><img
// alt="Porn Comics - Title">. The img alt carries the title.
function parseCards($: any): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();
  const push = (href: string, title: string, cover: string) => {
    if (!href || seen.has(href)) return;
    seen.add(href);
    posts.push({
      title: title || "Untitled",
      link: href,
      image: cover,
      poster: cover,
      cover,
      provider: "hdporncomics",
    });
  };
  const readCard = (card: any) => {
    const $card = $(card);
    const a = $card.find("a").first();
    const href = a.attr("href") || "";
    const img = $card.find("img").first();
    let cover =
      img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || "";
    if (cover.startsWith("//")) cover = "https:" + cover;
    else if (cover.startsWith("/")) cover = `${BASE_URL}${cover}`;
    // <source srcset> sometimes holds the thumb when img src is lazy.
    if (!cover) {
      const srcset = $card.find("source").first().attr("srcset") || "";
      cover = srcset.split(" ")[0];
      if (cover.startsWith("//")) cover = "https:" + cover;
    }
    let title = (img.attr("alt") || "").replace(/^Porn Comics\s*-\s*/i, "").trim();
    if (!title) {
      title =
        $card.find("h4, h3, h2").first().text().trim() ||
        $card.parent().find("h4, h3, h2").first().text().trim();
    }
    if (href && href.includes("hdporncomics.com/") && !href.includes("/tag/") && !href.includes("/category/")) {
      push(href, title, cover);
    }
  };
  $(".comic-image").each((_, el) => readCard(el));
  if (posts.length === 0) {
    $(".slider-item").each((_, el) => readCard(el));
  }
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
  const url = page > 1
    ? (filter.includes("?") ? `${BASE_URL}${filter}&paged=${page}` : `${BASE_URL}${filter}page/${page}/`)
    : `${BASE_URL}${filter}`;
  try {
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
  const q = searchQuery.trim();
  try {
    // The site's own /?s= search is broken site-wide ("Sorry, no posts matched
    // your criteria" for every query, even words in titles). Tag pages are the
    // working search: most queries are tags (incest, family, ahegao, ...).
    const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (slug) {
      const tagUrl = page > 1 ? `${BASE_URL}/tag/${slug}/page/${page}/` : `${BASE_URL}/tag/${slug}/`;
      const tagged = await fetchList(tagUrl, signal, providerContext);
      if (tagged.length > 0) return tagged;
    }
    const url = `${BASE_URL}/?s=${encodeURIComponent(q)}&paged=${page}`;
    return await fetchList(url, signal, providerContext);
  } catch {
    return [];
  }
}
