import { PageImage, ProviderContext } from "../types";
import { BASE_URL, fetchWithWafFallback } from "./posts";

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
  const html = await fetchWithWafFallback(link, providerContext, signal);
  const $ = providerContext.cheerio.load(html);

  const pages: PageImage[] = [];

  // Match all vertical strip image containers
  const imgElements = $(
    "#readerarea img, .reading-content img, .ts-main-image img, .entry-content img, .page-break img",
  );

  imgElements.each((idx, el) => {
    const img = $(el);
    const rawSrc =
      img.attr("data-src") ||
      img.attr("data-lazy-src") ||
      img.attr("data-original") ||
      img.attr("src") ||
      "";

    if (!rawSrc) return;

    const fullUrl = rawSrc.startsWith("//")
      ? `https:${rawSrc}`
      : rawSrc.startsWith("http")
      ? rawSrc
      : `${BASE_URL}${rawSrc.startsWith("/") ? "" : "/"}${rawSrc}`;

    // Filter out banners or UI icons
    if (
      fullUrl.includes("logo") ||
      fullUrl.includes("banner") ||
      fullUrl.includes("discord") ||
      fullUrl.includes("patreon")
    ) {
      return;
    }

    pages.push({
      index: pages.length,
      imageUrl: fullUrl,
      headers: {
        Referer: `${BASE_URL}/`,
        Origin: BASE_URL,
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      },
    });
  });

  return pages.map((page, index) => ({
    index,
    server: `Webtoon Strip ${index + 1}`,
    link: page.imageUrl,
    imageUrl: page.imageUrl,
    type: "image",
    headers: page.headers,
  }));
}

export const getPages = getStream;
