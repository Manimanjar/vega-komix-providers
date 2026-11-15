import { PageImage, ProviderContext } from "../types";
import { BASE_URL, BROWSER_HEADERS, cleanThumbnailUrl, fetchWithResilientRetry, preloadedPosts } from "./posts";

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
  const pages: PageImage[] = [];
  const seenUrls = new Set<string>();

  try {
    const html = await fetchWithResilientRetry(link, providerContext, signal);
    const $ = providerContext.cheerio.load(html || "");

    $(
      ".page-break img, .reading-content img, .entry-content img, .wp-manga-chapter-img, .separator a img, img.size-full",
    ).each((_, el) => {
      const rawSrc =
        $(el).attr("data-src") ||
        $(el).attr("data-lazy-src") ||
        $(el).attr("data-original") ||
        $(el).attr("src") ||
        "";

      const cleanSrc = cleanThumbnailUrl(rawSrc);
      if (!cleanSrc || seenUrls.has(cleanSrc) || cleanSrc.includes("dflazy.jpg"))
        return;
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
          "User-Agent": BROWSER_HEADERS["User-Agent"],
        },
      });
    });
  } catch {}

  // Fallback: If chapter page 523'd or had no page-break images, use preloaded cover
  if (pages.length === 0) {
    const preloaded = preloadedPosts.get(link);
    const fallbackImage =
      preloaded?.image ||
      "https://comicsvalley.com/wp-content/uploads/2025/09/While-She-Is-Waiting-For-You-WFNPaO.jpg";

    pages.push({
      index: 0,
      imageUrl: fallbackImage,
      headers: {
        Referer: `${BASE_URL}/`,
        Origin: BASE_URL,
        "User-Agent": BROWSER_HEADERS["User-Agent"],
      },
    });
  }

  return pages.map((page, index) => ({
    index,
    server: `ComicsValley Page ${index + 1}`,
    link: page.imageUrl,
    imageUrl: page.imageUrl,
    type: "image",
    headers: page.headers,
  }));
}

export const getPages = getStream;
