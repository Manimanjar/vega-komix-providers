import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://novelcrow.com";

export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${BASE_URL}/`,
};

// In-memory cache to guarantee zero-latency instant loading
const memoryCache = new Map<string, { time: number; data: string }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Resilient HTTP fetch with automatic retry (up to 3 times) on 520-524 or timeout.
 * WAF WebView is strictly disallowed on background searches (allowWafDialog = false)
 * to prevent annoying website popups during series chapter collection.
 */
export async function fetchWithResilientRetry(
  targetUrl: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
  maxRetries = 3,
  allowWafDialog = false,
): Promise<string> {
  const fullUrl = targetUrl.startsWith("http")
    ? targetUrl
    : `${BASE_URL}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;

  // Check cache first
  const cached = memoryCache.get(fullUrl);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await providerContext.axios.get(fullUrl, {
        headers: {
          ...BROWSER_HEADERS,
          ...providerContext.commonHeaders,
        },
        signal,
        timeout: 10000,
      });

      const html = typeof res.data === "string" ? res.data : String(res.data);

      const isChallenge =
        html.includes("cf-browser-verification") ||
        html.includes("challenge-running") ||
        html.includes("Just a moment...") ||
        html.includes("Enable JavaScript and cookies to continue");

      if (isChallenge && allowWafDialog && providerContext.openWebView) {
        const solved = await providerContext.openWebView(fullUrl, {
          title: "Verifying NovelCrow Access...",
          description: "Please complete the verification challenge to continue.",
          timeoutMs: 45000,
        });
        memoryCache.set(fullUrl, { time: Date.now(), data: solved.data });
        return solved.data;
      }

      memoryCache.set(fullUrl, { time: Date.now(), data: html });
      return html;
    } catch (err: any) {
      lastError = err;
      const status = err?.response?.status;

      if ((status === 403 || status === 503) && allowWafDialog && providerContext.openWebView) {
        const solved = await providerContext.openWebView(fullUrl, {
          title: "Solving Cloudflare Verification...",
          description: "Cloudflare challenge detected. Please wait while verification completes.",
          timeoutMs: 45000,
        });
        memoryCache.set(fullUrl, { time: Date.now(), data: solved.data });
        return solved.data;
      }

      // Retry on 520-524 or network timeout
      if (
        attempt < maxRetries &&
        (!status || (status >= 520 && status <= 524) || status === 504 || status === 408)
      ) {
        await new Promise((r) => setTimeout(r, attempt * 600));
        continue;
      }

      break;
    }
  }

  // Fallback to expired cache if available instead of failing
  if (cached) {
    return cached.data;
  }

  throw lastError;
}

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

export function parseNovelCrowPosts(
  html: string,
  cheerio: ProviderContext["cheerio"],
): Post[] {
  const $ = cheerio.load(html || "");
  const posts: Post[] = [];
  const seenLinks = new Set<string>();

  $(".page-item-detail, .badge-pos-1, .c-tabs-item__content, .manga-item").each((_, el) => {
    const titleEl = $(el).find(".post-title a, .item-thumb a, h3 a, h4 a").first();
    const href = titleEl.attr("href")?.trim();
    const title =
      titleEl.text().trim() ||
      titleEl.attr("title")?.trim() ||
      $(el).find(".item-thumb a").attr("title")?.trim() ||
      "";

    if (!href || !title || seenLinks.has(href)) return;
    seenLinks.add(href);

    const imgEl = $(el).find(".item-thumb img, img").first();
    const rawImg = (
      imgEl.attr("data-src") ||
      imgEl.attr("data-lazy-src") ||
      imgEl.attr("data-original") ||
      imgEl.attr("data-full-url") ||
      imgEl.attr("src") ||
      ""
    ).trim();

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
      cornerTag: rating ? `${rating}★` : "NovelCrow",
      provider: "novelcrow",
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
  const baseFilter = filter || "/?m_orderby=views";
  let targetUrl: string;

  if (page > 1) {
    if (baseFilter.includes("?")) {
      targetUrl = `${BASE_URL}/page/${page}/${baseFilter}`;
    } else {
      targetUrl = `${BASE_URL}${baseFilter.replace(/\/$/, "")}/page/${page}/`;
    }
  } else {
    targetUrl = `${BASE_URL}${baseFilter.startsWith("/") ? "" : "/"}${baseFilter}`;
  }

  const html = await fetchWithResilientRetry(targetUrl, providerContext, signal, 3, false);
  return parseNovelCrowPosts(html, providerContext.cheerio);
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
    // Explicitly disallow WAF WebView dialog during search: never interrupt user with search popups!
    const html = await fetchWithResilientRetry(targetUrl, providerContext, signal, 2, false);
    return parseNovelCrowPosts(html, providerContext.cheerio);
  } catch (err) {
    console.warn("[NovelCrow] Non-fatal search error (silenced background popup):", err);
    return [];
  }
}
