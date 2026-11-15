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

  const headers = {
    Referer: `${BASE_URL}/`,
    Origin: BASE_URL,
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  };

  const pages: any[] = [];
  const seenSrcs = new Set<string>();

  const imageElements = $(
    ".chapter-content img, #chapter-content img, .read-content img, .page-chapter img, img.lazy"
  );

  imageElements.each((_, el) => {
    const rawSrc =
      $(el).attr("data-src") ||
      $(el).attr("data-original") ||
      $(el).attr("src") ||
      "";

    if (!rawSrc || rawSrc.includes("favicon") || rawSrc.includes("logo") || seenSrcs.has(rawSrc)) {
      return;
    }
    seenSrcs.add(rawSrc);

    const imageUrl = rawSrc.startsWith("//")
      ? `https:${rawSrc}`
      : rawSrc.startsWith("http")
      ? rawSrc
      : `${BASE_URL}${rawSrc.startsWith("/") ? "" : "/"}${rawSrc}`;

    const idx = pages.length;
    pages.push({
      index: idx,
      server: `Page ${idx + 1}`,
      link: imageUrl,
      imageUrl,
      type: "image",
      quality: "Original",
      headers,
    });
  });

  return pages;
}

export const getPages = getStream;
