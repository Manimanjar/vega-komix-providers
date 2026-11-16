import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://nhentai.net";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "application/json, text/html, */*",
  Referer: "https://nhentai.net/",
};

export async function getPosts({
  page = 1,
  filter = "sort=recent",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const query = filter.includes("=") || filter.includes(":") ? filter : "sort=recent";
  let url = `${BASE_URL}/api/galleries/all?page=${page}`;
  if (query.includes("sort=popular")) {
    url = `${BASE_URL}/api/galleries/search?query=pages:>0&sort=popular&page=${page}`;
  } else if (query.includes(":")) {
    url = `${BASE_URL}/api/galleries/search?query=${encodeURIComponent(query)}&page=${page}`;
  }

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    const resultList = data?.result || data?.galleries || (Array.isArray(data) ? data : []);

    return resultList.map((g: any) => {
      const ext = g.images?.cover?.t === "p" ? "png" : g.images?.cover?.t === "w" ? "webp" : "jpg";
      const cover = g.media_id ? `https://t3.nhentai.net/galleries/${g.media_id}/cover.${ext}` : "";
      const title = g.title?.pretty || g.title?.english || g.title?.japanese || `Gallery #${g.id}`;
      return {
        title,
        link: `${BASE_URL}/g/${g.id}/`,
        image: cover,
        poster: cover,
        cover,
        tag: g.num_pages ? `${g.num_pages}P` : undefined,
        provider: "nhentai",
      };
    });
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
  const url = `${BASE_URL}/api/galleries/search?query=${encodeURIComponent(searchQuery.trim())}&page=${page}`;
  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    const resultList = data?.result || [];
    return resultList.map((g: any) => {
      const ext = g.images?.cover?.t === "p" ? "png" : g.images?.cover?.t === "w" ? "webp" : "jpg";
      const cover = g.media_id ? `https://t3.nhentai.net/galleries/${g.media_id}/cover.${ext}` : "";
      const title = g.title?.pretty || g.title?.english || g.title?.japanese || `Gallery #${g.id}`;
      return {
        title,
        link: `${BASE_URL}/g/${g.id}/`,
        image: cover,
        poster: cover,
        cover,
        tag: g.num_pages ? `${g.num_pages}P` : undefined,
        provider: "nhentai",
      };
    });
  } catch {
    return [];
  }
}
