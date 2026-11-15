import { Post, ProviderContext } from "../types";

export const BASE_API = "https://api.hentaiser.app/v1";
export const APP_URL = "https://app.hentaiser.app";

const COMMON_HEADERS = {
  Accept: "application/json, text/plain, */*",
  Origin: APP_URL,
  Referer: `${APP_URL}/`,
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
};

export async function getPosts({
  page = 1,
  filter = "sort=views",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const queryParam = filter || "sort=views";
  const url = `${BASE_API}/books?${queryParam}&page=${page}`;

  const res = await providerContext.axios.get(url, {
    headers: {
      ...providerContext.commonHeaders,
      ...COMMON_HEADERS,
    },
    signal,
  });

  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  const books = Array.isArray(data?.books) ? data.books : [];

  return books.map((b: any) => {
    const host = b.host || "https://media.hentaiser.app";
    const imageUrl = b.cover ? `${host}${b.cover}` : "";

    return {
      title: b.title || "Untitled",
      link: `${BASE_API}/books/${b.gid}`,
      image: imageUrl,
      poster: imageUrl,
      cover: imageUrl,
      rating: b.rates ? String(b.rates) : undefined,
      views: typeof b.views === "number" ? b.views : undefined,
    };
  });
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
  if (!searchQuery || searchQuery.trim().length === 0) {
    return [];
  }

  const cleanQuery = searchQuery.trim();
  const url = `${BASE_API}/books?field=title&query=${encodeURIComponent(cleanQuery)}&page=${page}`;

  const res = await providerContext.axios.get(url, {
    headers: {
      ...providerContext.commonHeaders,
      ...COMMON_HEADERS,
    },
    signal,
  });

  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  const books = Array.isArray(data?.books) ? data.books : [];

  return books.map((b: any) => {
    const host = b.host || "https://media.hentaiser.app";
    const imageUrl = b.cover ? `${host}${b.cover}` : "";

    return {
      title: b.title || "Untitled",
      link: `${BASE_API}/books/${b.gid}`,
      image: imageUrl,
      poster: imageUrl,
      cover: imageUrl,
      rating: b.rates ? String(b.rates) : undefined,
      views: typeof b.views === "number" ? b.views : undefined,
    };
  });
}
