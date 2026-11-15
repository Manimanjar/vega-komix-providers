import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://allporncomic.com";

export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${BASE_URL}/`,
};

/**
 * Fetch HTML with automatic Cloudflare WAF challenge fallback via WebView
 */
export async function fetchWithWafFallback(
  targetUrl: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
  allowWafDialog = false,
): Promise<string> {
  const fullUrl = targetUrl.startsWith("http")
    ? targetUrl
    : `${BASE_URL}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;

  try {
    const res = await providerContext.axios.get(fullUrl, {
      headers: {
        ...BROWSER_HEADERS,
        ...providerContext.commonHeaders,
      },
      signal,
      timeout: 15000,
    });

    const html = typeof res.data === "string" ? res.data : String(res.data);

    const isChallenge =
      html.includes("cf-browser-verification") ||
      html.includes("challenge-running") ||
      html.includes("Just a moment...") ||
      html.includes("Enable JavaScript and cookies to continue");

    if (isChallenge && allowWafDialog && providerContext.openWebView) {
      const solved = await providerContext.openWebView(fullUrl, {
        title: "Verifying AllPornComic Access...",
        description: "Please complete the verification challenge to continue.",
        timeoutMs: 45000,
      });
      return solved.data;
    }

    return html;
  } catch (err: any) {
    const status = err?.response?.status;
    if ((status === 403 || status === 503) && allowWafDialog && providerContext.openWebView) {
      const solved = await providerContext.openWebView(fullUrl, {
        title: "Solving Cloudflare Verification...",
        description: "Cloudflare challenge detected. Please wait while verification completes.",
        timeoutMs: 45000,
      });
      return solved.data;
    }
    throw err;
  }
}

/**
 * Strip thumbnail dimension resize suffixes (-350x476, -193x278) to get maximum original resolution
 */
export function cleanThumbnailUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (
    trimmed.includes("dflazy") ||
    trimmed.includes("1x1") ||
    trimmed.endsWith(".svg") ||
    trimmed.includes("spinner") ||
    trimmed.includes("loading")
  ) {
    return "";
  }
  return trimmed.replace(/-\d+x\d+(\.[a-zA-Z0-9]+)$/, "$1").trim();
}

/**
 * Parse Madara WordPress comic cards
 */
export function parseMadaraPosts(
  html: string,
  cheerio: ProviderContext["cheerio"],
  providerValue = "allporncomic",
): Post[] {
  const $ = cheerio.load(html || "");
  const posts: Post[] = [];
  const seenLinks = new Set<string>();

  $(".page-item-detail, .c-tabs-item__content, .badge-pos-1").each((_, el) => {
    const titleEl = $(el).find(".post-title a, .item-thumb a").first();
    const href = titleEl.attr("href")?.trim();
    const title =
      titleEl.text().trim() ||
      titleEl.attr("title")?.trim() ||
      $(el).find(".item-thumb a").attr("title")?.trim() ||
      "";

    if (!href || !title || seenLinks.has(href)) return;
    seenLinks.add(href);

    const imgEl = $(el).find(".item-thumb img, img").first();
    let rawImg = (
      imgEl.attr("data-src") ||
      imgEl.attr("data-lazy-src") ||
      imgEl.attr("data-original") ||
      imgEl.attr("data-full-url") ||
      ""
    ).trim();

    // Check srcset or data-srcset fallback if data-src missing
    if (!rawImg || rawImg.includes("dflazy")) {
      const srcset = (imgEl.attr("data-srcset") || imgEl.attr("srcset") || "").trim();
      if (srcset) {
        const firstCandidate = srcset.split(",")[0]?.trim()?.split(" ")[0]?.trim();
        if (firstCandidate && !firstCandidate.includes("dflazy")) {
          rawImg = firstCandidate;
        }
      }
    }
    if (!rawImg || rawImg.includes("dflazy")) {
      const src = (imgEl.attr("src") || "").trim();
      if (src && !src.includes("dflazy")) rawImg = src;
    }

    if (rawImg.startsWith("//")) rawImg = `https:${rawImg}`;
    else if (rawImg.startsWith("/")) rawImg = `${BASE_URL}${rawImg}`;

    const image = cleanThumbnailUrl(rawImg);
    const latestChapter = $(el).find(".list-chapter .chapter-item a").first().text().trim();
    const rating = $(el).find(".score.total_votes").text().trim();

    posts.push({
      title,
      link: href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`,
      image,
      poster: image,
      cover: image,
      tag: latestChapter || undefined,
      cornerTag: rating ? `${rating}★` : "HD",
      provider: providerValue,
    });
  });

  return posts;
}

export async function getPosts({
  filter,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const baseFilter = filter || "/porncomic/?m_orderby=views";
  let targetUrl: string;

  if (page > 1) {
    if (baseFilter.includes("/porncomic/")) {
      targetUrl = `${BASE_URL}/porncomic/page/${page}/${baseFilter.substring(baseFilter.indexOf("?"))}`;
    } else if (baseFilter.includes("?")) {
      targetUrl = `${BASE_URL}${baseFilter}&page=${page}`;
    } else {
      targetUrl = `${BASE_URL}${baseFilter.replace(/\/$/, "")}/page/${page}/`;
    }
  } else {
    targetUrl = `${BASE_URL}${baseFilter.startsWith("/") ? "" : "/"}${baseFilter}`;
  }

  const html = await fetchWithWafFallback(targetUrl, providerContext, signal, false);
  return parseMadaraPosts(html, providerContext.cheerio, "allporncomic");
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery || !searchQuery.trim()) return [];

  const targetUrl =
    page > 1
      ? `${BASE_URL}/page/${page}/?s=${encodeURIComponent(
          searchQuery.trim(),
        )}&post_type=wp-manga`
      : `${BASE_URL}/?s=${encodeURIComponent(
          searchQuery.trim(),
        )}&post_type=wp-manga`;

  try {
    const html = await fetchWithWafFallback(targetUrl, providerContext, signal, false);
    return parseMadaraPosts(html, providerContext.cheerio, "allporncomic");
  } catch (err) {
    console.warn("[AllPornComic] Non-fatal search error (silenced background popup):", err);
    return [];
  }
}
