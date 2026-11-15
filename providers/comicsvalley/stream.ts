import { PageImage, ProviderContext } from "../types";
import { BASE_URL, BROWSER_HEADERS, cleanThumbnailUrl, fetchWithResilientRetry, preloadedPosts } from "./posts";

function extractLargestFromSrcset(srcset: string): string {
  if (!srcset) return "";
  const parts = srcset.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  // The last candidate in WordPress srcset is usually the largest resolution
  const lastCandidate = parts[parts.length - 1];
  const url = lastCandidate.split(/\s+/)[0]?.trim();
  return url || "";
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
  const pages: PageImage[] = [];
  const seenUrls = new Set<string>();

  try {
    const html = await fetchWithResilientRetry(link, providerContext, signal);
    const $ = providerContext.cheerio.load(html || "");

    const selectors = [
      ".entry-content img",
      ".wp-block-image img",
      ".post-content img",
      ".single-content img",
      "figure img",
      "p img",
      "article img",
      ".page-break img",
      ".reading-content img",
      ".separator a img",
      "img.size-full",
    ].join(", ");

    $(selectors).each((_, el) => {
      const srcset = $(el).attr("srcset") || $(el).attr("data-srcset") || "";
      const largestFromSrcset = extractLargestFromSrcset(srcset);

      const rawSrc = (
        largestFromSrcset ||
        $(el).attr("data-orig-file") ||
        $(el).attr("data-full-url") ||
        $(el).attr("data-src") ||
        $(el).attr("data-lazy-src") ||
        $(el).attr("data-original") ||
        $(el).attr("src") ||
        ""
      ).trim();

      if (!rawSrc) return;

      const lower = rawSrc.toLowerCase();
      // Filter out site logos, avatars, ads, banners, placeholders, and tracking pixels
      if (
        lower.includes("logo") ||
        lower.includes("avatar") ||
        lower.includes("gravatar") ||
        lower.includes("banner") ||
        lower.includes("ad-") ||
        lower.includes("advertisement") ||
        lower.includes("1x1") ||
        lower.includes("spinner") ||
        lower.includes("loading") ||
        lower.includes("dflazy.jpg") ||
        lower.endsWith(".svg")
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
          "User-Agent": BROWSER_HEADERS["User-Agent"],
        },
      });
    });
  } catch (err) {
    console.warn("ComicsValley stream scraping error:", err);
  }

  // Fallback: If page had 0 extracted images, check if preloaded card has an image
  if (pages.length === 0) {
    const preloaded = preloadedPosts.get(link);
    if (preloaded?.image) {
      pages.push({
        index: 0,
        imageUrl: preloaded.image,
        headers: {
          Referer: `${BASE_URL}/`,
          Origin: BASE_URL,
          "User-Agent": BROWSER_HEADERS["User-Agent"],
        },
      });
    }
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
