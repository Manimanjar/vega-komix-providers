import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://nhentai.net";
export const API_V2 = "https://nhentai.net/api/v2";
// Tag ids resolved from the v2 API (GET /api/v2/galleries/{id} -> tags[]).
export const TAG_INCEST = 22942;

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "application/json, text/html, */*",
  Referer: "https://nhentai.net/",
};

export const THUMB_HOST = "https://t3.nhentai.net";

function formatGallery(g: any): Post {
  const thumbPath =
    typeof g.thumbnail === "string" ? g.thumbnail : g.thumbnail?.path || "";
  const cover = thumbPath
    ? `${THUMB_HOST}/${thumbPath.replace(/^\/+/, "")}`
    : "";
  const title =
    g.title?.english || g.english_title || g.title?.pretty || g.title?.japanese || `Gallery #${g.id}`;
  return {
    title,
    link: `${BASE_URL}/g/${g.id}/`,
    image: cover,
    poster: cover,
    cover,
    tag: g.num_pages ? `${g.num_pages}P` : undefined,
    provider: "nhentai",
    // Each gallery is a single gallery = 1 chapter. nHentai shows no
    // star rating or view count, so those stay unset (user, 2026-11-18).
    chapterCount: 1,
  };
}

async function fetchV2(
  path: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<any> {
  const res = await providerContext.axios.get(`${API_V2}${path}`, {
    headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
    signal,
    timeout: 20000,
  });
  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  if (data?.error) throw new Error(`nhentai v2: ${data.error}`);
  return data;
}

function resultList(data: any): any[] {
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.galleries)) return data.galleries;
  if (Array.isArray(data)) return data;
  return [];
}

export async function getPosts({
  page = 1,
  filter = "recent",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const f = (filter || "recent").trim();
  let path: string;
  if (f === "popular" || f === "sort=popular") {
    // /galleries/popular returns only the top 5; the search endpoint with
    // sort=popular returns a full 25-row page of the most-favorited galleries.
    path = `/search?query=${encodeURIComponent("*")}&sort=popular&page=${page}`;
  } else if (f.startsWith("tag:")) {
    const tagId = f.slice(4).trim();
    path = `/galleries/tagged?tag_id=${encodeURIComponent(tagId)}&page=${page}&per_page=25`;
  } else if (f.startsWith("search:")) {
    const q = f.slice(7).trim();
    path = `/search?query=${encodeURIComponent(q)}&page=${page}`;
  } else if (f === "recent" || f === "sort=recent" || f === "") {
    path = `/galleries?page=${page}&per_page=25`;
  } else if (f.includes(":")) {
    // Legacy filters such as "language:english" / "tag:doujinshi" become v2 searches.
    path = `/search?query=${encodeURIComponent(f)}&page=${page}`;
  } else {
    path = `/search?query=${encodeURIComponent(f)}&page=${page}`;
  }
  const data = await fetchV2(path, providerContext, signal);
  return resultList(data).map(formatGallery);
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
  const data = await fetchV2(
    `/search?query=${encodeURIComponent(searchQuery.trim())}&page=${page}`,
    providerContext,
    signal,
  );
  return resultList(data).map(formatGallery);
}
