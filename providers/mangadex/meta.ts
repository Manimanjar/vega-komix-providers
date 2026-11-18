import { Info, ProviderContext } from "../types";

const BASE_API = "https://api.mangadex.org";
const COVERS_BASE = "https://uploads.mangadex.org/covers";

function parseMangaId(link: string): string {
  if (!link) return "";
  const cleaned = link.trim().replace(/\/$/, "");
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    return parts[parts.length - 1];
  }
  return cleaned;
}

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

async function fetchMangaDexJson(
  url: string,
  providerContext: ProviderContext
): Promise<any> {
  const headers = {
    ...providerContext.commonHeaders,
    "User-Agent": "VegaKomix/1.0.0 (https://github.com/vegakomix)",
    Accept: "application/json",
  };

  let res;
  try {
    res = await providerContext.axios.get(url, { headers });
  } catch (err: any) {
    if ((err.response?.status === 403 || err.response?.status === 503) && providerContext.openWebView) {
      await providerContext.openWebView(url);
      res = await providerContext.axios.get(url, { headers });
    } else {
      throw err;
    }
  }

  if (typeof res.data === "string" && res.data.trim().startsWith("<")) {
    if (providerContext.openWebView) {
      await providerContext.openWebView(url);
      res = await providerContext.axios.get(url, { headers });
    }
  }

  return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
}

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  provider?: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const mangaId = parseMangaId(link);
  const url = `${BASE_API}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist&includes[]=tag`;

  const resData = await fetchMangaDexJson(url, providerContext);
  const item = resData?.data;
  if (!item) {
    throw new Error(`Manga with ID ${mangaId} not found`);
  }

  const attrs = item.attributes || {};
  const rels = item.relationships || [];

  const title = extractTitle(attrs);
  const image = extractCover(mangaId, rels);

  const authorRel = rels.find((r: any) => r.type === "author");
  const artistRel = rels.find((r: any) => r.type === "artist");
  const author = authorRel?.attributes?.name || undefined;
  const artist = artistRel?.attributes?.name || author;

  const synopsis =
    attrs.description?.en ||
    Object.values(attrs.description || {})[0] ||
    "No synopsis provided.";

  const tags = Array.isArray(attrs.tags)
    ? attrs.tags
        .map((t: any) => t.attributes?.name?.en)
        .filter((t: any): t is string => Boolean(t))
    : [];

  const status = attrs.status ? String(attrs.status).toUpperCase() : "ONGOING";
  const contentRating = attrs.contentRating ? String(attrs.contentRating) : "safe";

  // Real star rating & chapter count (user, 2026-11-18): the manga
  // response has no rating — the bayesian average (out of 10, as
  // MangaDex shows it) lives on /statistics/manga. The old code put
  // the content classification ("safe"/"erotica") in `rating`, which
  // the app shows as a star badge — that was wrong, so it is now the
  // real star rating. lastChapter is the total chapter count.
  // Best-effort: a failed statistics call leaves rating unset.
  let rating: string | undefined;
  try {
    const statsData = await fetchMangaDexJson(
      `${BASE_API}/statistics/manga/${mangaId}`,
      providerContext
    );
    const bayesian = statsData?.statistics?.[mangaId]?.rating?.bayesian;
    if (typeof bayesian === "number" && bayesian > 0) {
      rating = String(Math.round(bayesian * 10) / 10);
    }
  } catch {}

  const lastChapterRaw = attrs.lastChapter;
  const lastChapterNum =
    typeof lastChapterRaw === "string" && lastChapterRaw.trim() !== ""
      ? parseInt(lastChapterRaw.trim(), 10)
      : NaN;
  const totalChapters =
    Number.isFinite(lastChapterNum) && lastChapterNum > 0
      ? lastChapterNum
      : 1;

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis,
    imdbId: mangaId,
    type: "comic",
    author,
    artist,
    status,
    rating,
    totalChapters,
    tags,
    linkList: [
      {
        title: "Chapters",
        episodesLink: mangaId,
      },
    ],
    webUrl: `https://mangadex.org/title/${mangaId}`,
  };
}
