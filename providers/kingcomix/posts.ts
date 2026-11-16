import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://kingcomix.com";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://kingcomix.com/",
};

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
    ? (filter.includes("?") ? `${BASE_URL}${filter}&page=${page}` : `${BASE_URL}${filter}page/${page}/`)
    : `${BASE_URL}${filter}`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $("article, .post, .entry-card, .type-post").each((_, el) => {
      const a = $(el).find("h2 a, .entry-title a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = a.text().trim() || $(el).find("h2, .entry-title").text().trim() || "Untitled Comic";
      const img = $(el).find("img").first();
      let cover = img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = `${BASE_URL}${cover}`;

      posts.push({
        title,
        link: href,
        image: cover,
        poster: cover,
        cover,
        provider: "kingcomix",
      });
    });

    return posts;
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
  const url = `${BASE_URL}/?s=${encodeURIComponent(searchQuery.trim())}&page=${page}`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $("article, .post, .entry-card, .type-post").each((_, el) => {
      const a = $(el).find("h2 a, .entry-title a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = a.text().trim() || $(el).find("h2, .entry-title").text().trim() || "Untitled Comic";
      const img = $(el).find("img").first();
      let cover = img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = `${BASE_URL}${cover}`;

      posts.push({
        title,
        link: href,
        image: cover,
        poster: cover,
        cover,
        provider: "kingcomix",
      });
    });

    return posts;
  } catch {
    return [];
  }
}
