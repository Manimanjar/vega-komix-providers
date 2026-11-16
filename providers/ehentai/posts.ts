import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://e-hentai.org";
export const API_URL = "https://api.e-hentai.org/api.php";

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://e-hentai.org/",
};

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
  const url = filter.startsWith("/")
    ? `${BASE_URL}${filter}?page=${page - 1}`
    : `${BASE_URL}/${filter}&page=${page - 1}`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".itg tr, .gl1t, .gl2t, .itg .gl1c").each((_, el) => {
      const a = $(el).find("a[href*='/g/']").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".glink, .glname, h2, a").first().text().trim() || "Gallery";
      const img = $(el).find("img").first();
      let cover = img.attr("src") || img.attr("data-src") || "";

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
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".itg tr, .gl1t, .gl2t, .itg .gl1c").each((_, el) => {
      const a = $(el).find("a[href*='/g/']").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".glink, .glname, h2, a").first().text().trim() || "Gallery";
      const img = $(el).find("img").first();
      let cover = img.attr("src") || img.attr("data-src") || "";

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
  } catch {
    return [];
  }
}
