import { PageImage, ProviderContext } from "../types";
import { BASE_URL, fetchWithWafFallback } from "./posts";

/**
 * Convert a thumbnail CDN URL into its full-resolution image URL.
 * Example patterns supported:
 * 1. https://t.gallery.org/galleries/123/1t.jpg -> https://i.gallery.org/galleries/123/1.jpg
 * 2. https://domain.com/thumbs/123/1_thumb.jpg -> https://domain.com/images/123/1.jpg
 */
function thumbnailToFullRes(thumbUrl: string): string {
  let url = thumbUrl;

  // Pattern 1: t.cdn.com -> i.cdn.com and {n}t.{ext} -> {n}.{ext}
  if (url.includes("/galleries/")) {
    url = url
      .replace(/\/\/t(\d*)\./, "//i$1.")
      .replace(/\/t\./, "/i.")
      .replace(/(\d+)t\.([a-zA-Z0-9]+)$/, "$1.$2");
  }

  // Pattern 2: _thumb / -thumb / .thumb
  url = url.replace(/[-_.]thumb\./i, ".");

  // Pattern 3: /thumbs/ -> /images/ or /files/
  url = url.replace(/\/thumbs\//i, "/images/");

  return url;
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
  const html = await fetchWithWafFallback(link, providerContext, signal);
  const $ = providerContext.cheerio.load(html);

  const pages: PageImage[] = [];

  // Match all thumbnail image elements in gallery containers
  const thumbElements = $(
    "#thumbnail-container .thumb-container img, .thumbs img, .gallery-thumbs img, .page-thumb img",
  );

  if (thumbElements.length > 0) {
    thumbElements.each((idx, el) => {
      const img = $(el);
      const rawSrc =
        img.attr("data-src") ||
        img.attr("data-original") ||
        img.attr("src") ||
        "";

      if (!rawSrc) return;

      const thumbUrl = rawSrc.startsWith("//")
        ? `https:${rawSrc}`
        : rawSrc.startsWith("http")
        ? rawSrc
        : `${BASE_URL}${rawSrc.startsWith("/") ? "" : "/"}${rawSrc}`;

      const fullResUrl = thumbnailToFullRes(thumbUrl);

      pages.push({
        index: idx,
        imageUrl: fullResUrl,
        headers: {
          Referer: `${BASE_URL}/`,
          Origin: BASE_URL,
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        },
      });
    });
  }

  // Fallback: If no thumbnails found, check for reader full-page images (.reader img, #image-container img)
  if (pages.length === 0) {
    const readerImages = $(
      "#image-container img, .reader img, .pages img, .carousel-item img",
    );
    readerImages.each((idx, el) => {
      const img = $(el);
      const rawSrc =
        img.attr("data-src") ||
        img.attr("data-original") ||
        img.attr("src") ||
        "";

      if (!rawSrc) return;

      const fullUrl = rawSrc.startsWith("//")
        ? `https:${rawSrc}`
        : rawSrc.startsWith("http")
        ? rawSrc
        : `${BASE_URL}${rawSrc.startsWith("/") ? "" : "/"}${rawSrc}`;

      pages.push({
        index: idx,
        imageUrl: fullUrl,
        headers: {
          Referer: `${BASE_URL}/`,
          Origin: BASE_URL,
        },
      });
    });
  }

  // Format array compatible with both PageImage[] and Stream[]
  return pages.map((p, idx) => ({
    index: p.index ?? idx,
    server: `Gallery Page ${idx + 1}`,
    link: p.imageUrl,
    imageUrl: p.imageUrl,
    type: "image",
    quality: "Original",
    headers: p.headers,
  }));
}

// Export getPages alias for direct reader use
export const getPages = getStream;
