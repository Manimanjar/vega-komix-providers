import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://hentaifox.com";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://hentaifox.com/",
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
  const pathPart = filter.endsWith("/") ? filter : `${filter}/`;
  const url = page > 1 ? `${BASE_URL}${pathPart}pag/${page}/` : `${BASE_URL}${pathPart}`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".lc_galleries .thumb, .overview .thumb").each((_, el) => {
      const a = $(el).find(".inner_thumb a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".caption .g_title a, h2 a, .caption a").first().text().trim() || "Untitled";
      const img = $(el).find("img").first();
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
  const url = page > 1
    ? `${BASE_URL}/search/pag/${page}/?q=${encodeURIComponent(searchQuery.trim())}`
    : `${BASE_URL}/search/?q=${encodeURIComponent(searchQuery.trim())}`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".lc_galleries .thumb, .overview .thumb").each((_, el) => {
      const a = $(el).find(".inner_thumb a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".caption .g_title a, h2 a, .caption a").first().text().trim() || "Untitled";
      const img = $(el).find("img").first();
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
      });
    });

    return posts;
  } catch {
    return [];
  }
}
