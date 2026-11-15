import { PageImage, ProviderContext } from "../types";
import { BASE_URL, cleanThumbnailUrl, fetchWithWafFallback } from "./posts";

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
  const seenUrls = new Set<string>();

  const imageSelectors = [
    ".reading-content img",
    ".page-break img",
    ".entry-content img",
    "div.text-left img",
    ".wp-manga-chapter-img",
  ].join(", ");

  $(imageSelectors).each((_, el) => {
    const rawSrc = (
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("data-full-url") ||
      $(el).attr("data-original") ||
      $(el).attr("src") ||
      ""
    ).trim();

    if (!rawSrc) return;

    // Filter out tiny icons, logos, tracking pixels and placeholders
    const lower = rawSrc.toLowerCase();
    if (
      lower.includes("1x1") ||
      lower.includes("gravatar") ||
      lower.includes("logo") ||
      lower.includes("dflazy.jpg") ||
      lower.endsWith(".svg") ||
      lower.includes("spinner") ||
      lower.includes("loading")
    ) {
      return;
    }

    const cleanSrc = cleanThumbnailUrl(rawSrc);
    if (!cleanSrc || seenUrls.has(cleanSrc)) return;
    seenUrls.add(cleanSrc);

    const fullUrl = cleanSrc.startsWith("//")
      ? `https:${cleanSrc}`
      : cleanSrc.startsWith("http")
      ? cleanSrc
      : `${BASE_URL}${cleanSrc.startsWith("/") ? "" : "/"}${cleanSrc}`;

    pages.push({
      index: pages.length,
      imageUrl: fullUrl,
      headers: {
        Referer: `${BASE_URL}/`,
        Origin: BASE_URL,
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      },
    });
  });

  return pages.map((page, index) => ({
    index,
    server: `AllPornComic Page ${index + 1}`,
    link: page.imageUrl,
    imageUrl: page.imageUrl,
    type: "image",
    headers: page.headers,
  }));
}

export const getPages = getStream;
