import { PageImage, ProviderContext, Stream } from "../types";

const BASE_API = "https://api.mangadex.org";

function parseChapterId(link: string): string {
  if (!link) return "";
  const withoutQuery = link.trim().split("?")[0].split("#")[0].replace(/\/$/, "");
  if (withoutQuery.includes("/")) {
    const parts = withoutQuery.split("/");
    return parts[parts.length - 1];
  }
  return withoutQuery;
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

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<any[]> {
  const chapterId = parseChapterId(link);
  const url = `${BASE_API}/at-home/server/${chapterId}`;

  const body = await fetchMangaDexJson(url, providerContext, signal);
  if (!body || body.result !== "ok" || !body.baseUrl || !body.chapter) {
    throw new Error(`Failed to retrieve pages from MangaDex At-Home server for chapter ${chapterId}`);
  }

  const { baseUrl, chapter } = body;
  const hash = chapter.hash;

  // Prefer uncompressed high-res data array; fallback to dataSaver if empty
  const isHighRes = Array.isArray(chapter.data) && chapter.data.length > 0;
  const filenames: string[] = isHighRes ? chapter.data : chapter.dataSaver || [];
  const folder = isHighRes ? "data" : "data-saver";

  const headers = {
    Referer: "https://mangadex.org/",
    Origin: "https://mangadex.org",
  };

  return filenames.map((file: string, index: number) => {
    const pageUrl = `${baseUrl}/${folder}/${hash}/${file}`;
    return {
      index,
      server: `MangaDex High-Res Page ${index + 1}`,
      link: pageUrl,
      imageUrl: pageUrl,
      type: "image",
      quality: isHighRes ? "Original" : "Data-Saver",
      headers,
    };
  });
}

// Direct reader alias
export const getPages = getStream;
