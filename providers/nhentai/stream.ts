import { ProviderContext } from "../types";
import { BASE_URL, fetchHtml } from "./posts";

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
  const fullLink = link.startsWith("http")
    ? link
    : `${BASE_URL}${link.startsWith("/") ? "" : "/"}${link}`;

  const html = await fetchHtml(fullLink, providerContext, signal);
  const $ = providerContext.cheerio.load(html);

  // 1. Determine media base directory from cover or first thumbnail
  const coverImg = $(
    "img[src*='cover.jpg'], img[data-src*='cover.jpg'], #cover img, .cover img"
  ).first();
  const coverSrc = coverImg.attr("src") || coverImg.attr("data-src") || "";

  let baseDir = "";
  if (coverSrc.includes("/cover.")) {
    baseDir = coverSrc.substring(0, coverSrc.lastIndexOf("/") + 1);
  } else {
    const firstThumb = $("img[src*='t.jpg'], img[data-src*='t.jpg']").first();
    const thumbSrc = firstThumb.attr("src") || firstThumb.attr("data-src") || "";
    if (thumbSrc.includes("/")) {
      baseDir = thumbSrc.substring(0, thumbSrc.lastIndexOf("/") + 1);
    }
  }

  const headers = {
    Referer: `${BASE_URL}/`,
    Origin: BASE_URL,
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  };

  const pages: any[] = [];
  const thumbs = $("img[src*='t.jpg'], img[data-src*='t.jpg'], img[src*='t.webp'], img[data-src*='t.webp']");

  if (thumbs.length > 0) {
    thumbs.each((idx, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (!src) return;

      const pageNum = idx + 1;
      // High-res webp format on modern nhentai CDN
      const fullResUrl = baseDir
        ? `${baseDir}${pageNum}.webp`
        : src.replace(/(\d+)t\.([a-zA-Z0-9]+)$/, "$1.webp");

      pages.push({
        index: idx,
        server: `Page ${pageNum}`,
        link: fullResUrl,
        imageUrl: fullResUrl,
        type: "image",
        quality: "Original",
        headers,
      });
    });
  } else if (baseDir) {
    // If thumbnails are lazy-loaded via JS, default to 20 pages
    for (let p = 1; p <= 20; p++) {
      const fullResUrl = `${baseDir}${p}.webp`;
      pages.push({
        index: p - 1,
        server: `Page ${p}`,
        link: fullResUrl,
        imageUrl: fullResUrl,
        type: "image",
        quality: "Original",
        headers,
      });
    }
  }

  return pages;
}

export const getPages = getStream;
