import { Post, ProviderContext } from "../types";

const BASE_API = "https://api.mangadex.org";
const COVERS_BASE = "https://uploads.mangadex.org/covers";

function extractTitle(attributes: any): string {
  if (!attributes || !attributes.title) return "Untitled";
  return (
    attributes.title.en ||
    attributes.title["ja-ro"] ||
    attributes.title.ja ||
    attributes.title.ko ||
    Object.values(attributes.title)[0] ||
    "Untitled"
  );
}

function extractCover(mangaId: string, relationships: any[]): string {
  const coverRel = relationships?.find((r: any) => r.type === "cover_art");
  const fileName = coverRel?.attributes?.fileName;
  if (!fileName) {
    return "https://mangadex.org/img/cover-placeholder.png";
  }
  return `${COVERS_BASE}/${mangaId}/${fileName}.512.jpg`;
}

function formatPost(item: any, providerValue = "mangadex"): Post {
  const mangaId = item.id;
  const title = extractTitle(item.attributes);
  const image = extractCover(mangaId, item.relationships);
  const origLang = item.attributes?.originalLanguage;

  let tag = "Manga";
  if (origLang === "ko") tag = "Manhwa";
  else if (origLang === "zh") tag = "Manhua";
  else if (origLang === "en") tag = "Comic";

  // Chapter count: the API's lastChapter is the latest chapter number,
  // which is the total for a completed series and the count so far for
  // an ongoing one. Shown as a badge on the thumbnail (user 2026-11-18).
  const lastChapterRaw = item.attributes?.lastChapter;
  const lastChapterNum =
    typeof lastChapterRaw === "string" && lastChapterRaw.trim() !== ""
      ? parseInt(lastChapterRaw.trim(), 10)
      : NaN;
  const chapterCount =
    Number.isFinite(lastChapterNum) && lastChapterNum > 0
      ? lastChapterNum
      : undefined;

  return {
    title,
    link: mangaId,
    image,
    poster: image,
    cover: image,
    provider: providerValue,
    cornerTag: item.attributes?.status
      ? item.attributes.status.toUpperCase()
      : undefined,
    tag,
    chapterCount,
  };
}

// Batch rating lookup (user, 2026-11-18): the manga list response has
// no rating — the bayesian average lives on /statistics/manga, which
// takes many IDs in ONE call. Best-effort: if it fails, posts simply
// have no rating (the app sorts them last) instead of breaking the list.
async function attachRatings(
  posts: Post[],
  providerContext: ProviderContext,
  signal?: AbortSignal
): Promise<void> {
  const ids = posts.map((p) => p.link).filter(Boolean);
  if (ids.length === 0) return;
  try {
    const query = ids
      .map((id) => `manga[]=${encodeURIComponent(id)}`)
      .join("&");
    const resData = await fetchMangaDexJson(
      `${BASE_API}/statistics/manga?${query}`,
      providerContext,
      signal
    );
    const stats = resData?.statistics;
    if (!stats || typeof stats !== "object") return;
    for (const post of posts) {
      const bayesian = stats[post.link]?.rating?.bayesian;
      if (typeof bayesian === "number" && bayesian > 0) {
        post.rating = Math.round(bayesian * 10) / 10;
      }
    }
  } catch {
    // Rating is enrichment only; a failed statistics call must not
    // break the list.
  }
}

async function fetchMangaDexJson(
  url: string,
  providerContext: ProviderContext,
  signal?: AbortSignal
): Promise<any> {
  const headers = {
    ...providerContext.commonHeaders,
    "User-Agent": "VegaKomix/1.0.0 (https://github.com/vegakomix)",
    Accept: "application/json",
  };

  let res;
  try {
    res = await providerContext.axios.get(url, { headers, signal });
  } catch (err: any) {
    if ((err.response?.status === 403 || err.response?.status === 503) && providerContext.openWebView) {
      await providerContext.openWebView(url);
      res = await providerContext.axios.get(url, { headers, signal });
    } else {
      throw err;
    }
  }

  if (typeof res.data === "string" && res.data.trim().startsWith("<")) {
    if (providerContext.openWebView) {
      await providerContext.openWebView(url);
      res = await providerContext.axios.get(url, { headers, signal });
    }
  }

  return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
}

export async function getPosts({
  filter,
  page = 1,
  providerValue = "mangadex",
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const limit = 24;
  const offset = (Math.max(1, page) - 1) * limit;

  const filterQuery = filter && filter.trim().length > 0
    ? filter.trim()
    : "order[followedCount]=desc";

  const url = `${BASE_API}/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&${filterQuery}`;

  const resData = await fetchMangaDexJson(url, providerContext, signal);
  const data = resData?.data;
  if (!Array.isArray(data)) {
    return [];
  }

  const posts = data.map((item: any) => formatPost(item, providerValue));
  await attachRatings(posts, providerContext, signal);
  return posts;
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  providerValue = "mangadex",
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const limit = 24;
  const offset = (Math.max(1, page) - 1) * limit;
  const encodedQuery = encodeURIComponent(searchQuery.trim());

  const url = `${BASE_API}/manga?limit=${limit}&offset=${offset}&title=${encodedQuery}&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[relevance]=desc`;

  const resData = await fetchMangaDexJson(url, providerContext, signal);
  const data = resData?.data;
  if (!Array.isArray(data)) {
    return [];
  }

  const posts = data.map((item: any) => formatPost(item, providerValue));
  await attachRatings(posts, providerContext, signal);
  return posts;
}
