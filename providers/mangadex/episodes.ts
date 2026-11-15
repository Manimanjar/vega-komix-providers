import { ChapterLink, ProviderContext } from "../types";

const BASE_API = "https://api.mangadex.org";

function parseMangaId(url: string): string {
  if (!url) return "";
  const cleaned = url.trim().replace(/\/$/, "");
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    return parts[parts.length - 1];
  }
  return cleaned;
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

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<ChapterLink[]> {
  const mangaId = parseMangaId(url);
  const chapters: ChapterLink[] = [];

  const limit = 100;
  let offset = 0;
  let total = 1;

  // Fetch up to 300 chapters (3 pages of 100)
  const maxPages = 3;
  let pageCount = 0;

  while (offset < total && pageCount < maxPages) {
    pageCount++;
    const feedUrl = `${BASE_API}/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&includes[]=scanlation_group&includes[]=user&order[chapter]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`;

    const body = await fetchMangaDexJson(feedUrl, providerContext);
    if (!body || !Array.isArray(body.data)) {
      break;
    }

    total = typeof body.total === "number" ? body.total : 0;
    const items = body.data;

    for (const ch of items) {
      const attrs = ch.attributes || {};
      const rels = ch.relationships || [];

      // Skip external links (e.g. MangaPlus) and empty page chapters
      if (attrs.externalUrl || (typeof attrs.pages === "number" && attrs.pages <= 0)) {
        continue;
      }

      const chNumberRaw = attrs.chapter;
      const chNumber = chNumberRaw ? parseFloat(chNumberRaw) : undefined;
      const volNumber = attrs.volume ? parseFloat(attrs.volume) : undefined;

      const groupRel = rels.find((r: any) => r.type === "scanlation_group");
      const scanlator = groupRel?.attributes?.name || undefined;

      const releaseDate = attrs.publishAt
        ? new Date(attrs.publishAt).toLocaleDateString()
        : undefined;

      const lang = attrs.translatedLanguage
        ? attrs.translatedLanguage.toUpperCase()
        : "EN";

      const chTitle = attrs.title ? `: ${attrs.title}` : "";
      const displayTitle = chNumber !== undefined
        ? `Chapter ${chNumber}${chTitle}`
        : attrs.title || "Oneshot";

      chapters.push({
        id: ch.id,
        title: displayTitle,
        chapterNumber: chNumber,
        volume: volNumber,
        scanlator,
        releaseDate,
        language: lang,
        link: ch.id,
      });
    }

    offset += limit;
    if (items.length < limit) {
      break;
    }
  }

  // Sort descending by chapter number
  chapters.sort((a, b) => (b.chapterNumber ?? 0) - (a.chapterNumber ?? 0));
  return chapters;
}
