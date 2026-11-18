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
  // "multi:tags=mother|tags=sister" fetches several queries and merges them
  // (used for Family: the API's comma syntax is AND, so a single
  // tags=mother,sister,brother,father query returns only ~12 books that carry
  // all four tags; merging the four single-tag lists gives a full row).
  if ((filter || "").startsWith("multi:")) {
    const parts = filter.slice(6).split("|").map((s) => s.trim()).filter(Boolean);
    const seen = new Set<string>();
    const merged: Post[] = [];
    for (const part of parts) {
      const posts = await getPosts({ page, filter: part, signal, providerContext });
      for (const post of posts) {
        if (!seen.has(post.link)) {
          seen.add(post.link);
          merged.push(post);
        }
      }
      if (merged.length >= 72) break;
    }
    return merged.slice(0, 72);
  }
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
      rating: (() => {
        const r = typeof b.rates === "number" ? b.rates : parseFloat(String(b.rates ?? ""));
        return Number.isFinite(r) && r > 0 ? Math.round(r * 10) / 10 : undefined;
      })(),
      views: typeof b.views === "number" ? b.views : undefined,
      // Each book is a single gallery = 1 chapter.
      chapterCount: 1,
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
      rating: (() => {
        const r = typeof b.rates === "number" ? b.rates : parseFloat(String(b.rates ?? ""));
        return Number.isFinite(r) && r > 0 ? Math.round(r * 10) / 10 : undefined;
      })(),
      views: typeof b.views === "number" ? b.views : undefined,
      // Each book is a single gallery = 1 chapter.
      chapterCount: 1,
    };
  });
}
