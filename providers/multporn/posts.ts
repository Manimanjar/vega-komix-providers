import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://multporn.net";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://multporn.net/",
};

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
  const url = page > 1
    ? `${BASE_URL}${filter}?page=${page - 1}`
    : `${BASE_URL}${filter}`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".view-content .views-row, .masonry-item, .node-teaser").each((_, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".views-field-title a, h2 a, a").first().text().trim() || "Untitled";
      const img = $(el).find("img").first();
      let cover = img.attr("src") || img.attr("data-src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = `${BASE_URL}${cover}`;

      const fullLink = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
      posts.push({
        title,
        link: fullLink,
        image: cover,
        poster: cover,
        cover,
        provider: "multporn",
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
  const url = `${BASE_URL}/search?query=${encodeURIComponent(searchQuery.trim())}&page=${page - 1}`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".view-content .views-row, .search-result, .masonry-item").each((_, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = a.text().trim() || "Comic";
      const img = $(el).find("img").first();
      let cover = img.attr("src") || img.attr("data-src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = `${BASE_URL}${cover}`;

      const fullLink = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
      posts.push({
        title,
        link: fullLink,
        image: cover,
        poster: cover,
        cover,
        provider: "multporn",
      });
    });

    return posts;
  } catch {
    return [];
  }
}
