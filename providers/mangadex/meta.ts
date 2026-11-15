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
    rating: contentRating,
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
