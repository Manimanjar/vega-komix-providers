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

  // 1. Extract cover image to determine media CDN base directory
  const coverImg = $(
    ".gallery_left .cover img, .cover img, img[src*='cover.jpg']"
  ).first();
  const coverSrc =
    coverImg.attr("src") ||
    coverImg.attr("data-src") ||
    coverImg.attr("data-original") ||
    "";

  // Cover URL format: https://i3.hentaifox.com/005/4329966/cover.jpg
  let baseDir = "";
  if (coverSrc.includes("/cover.")) {
    baseDir = coverSrc.substring(0, coverSrc.lastIndexOf("/") + 1);
  } else {
    // Check first thumbnail: e.g. https://i3.hentaifox.com/005/4329966/1t.jpg
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

  // 2. Try parsing `g_th` JSON object directly from page script
  const gthMatch = html.match(/g_th\s*=\s*\$\.parseJSON\(([^)]+)\)/);
  if (gthMatch) {
    try {
      const gthRaw = gthMatch[1].trim();
      // Remove enclosing quotes if present
      const cleanJson = gthRaw.startsWith("'") && gthRaw.endsWith("'")
        ? gthRaw.slice(1, -1)
        : gthRaw;
      const gth = JSON.parse(cleanJson);

      const keys = Object.keys(gth).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

      keys.forEach((pageStr, idx) => {
        const val = gth[pageStr]; // e.g. "w,1280,2287"
        const [fmt, wStr, hStr] = (typeof val === "string" ? val : "").split(",");
        const ext = fmt === "w" ? "webp" : fmt === "p" ? "png" : "jpg";
        const pageNum = parseInt(pageStr, 10);
        const imageUrl = `${baseDir}${pageNum}.${ext}`;

        pages.push({
          index: idx,
          server: `Page ${pageNum}`,
          link: imageUrl,
          imageUrl,
          type: "image",
          quality: "Original",
          width: parseInt(wStr, 10) || undefined,
          height: parseInt(hStr, 10) || undefined,
          headers,
        });
      });
    } catch (e) {
      // Fallback below
    }
  }

  // 3. Fallback: Parse thumbnail images in DOM if g_th was unavailable
  if (pages.length === 0) {
    const thumbs = $("img[src*='t.'], img[data-src*='t.']");
    thumbs.each((idx, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (!src || !src.includes("t.")) return;

      const fullRes = src.replace(/(\d+)t\.([a-zA-Z0-9]+)$/, "$1.webp");
      pages.push({
        index: idx,
        server: `Page ${idx + 1}`,
        link: fullRes,
        imageUrl: fullRes,
        type: "image",
        quality: "Original",
        headers,
      });
    });
  }

  return pages;
}

export const getPages = getStream;
