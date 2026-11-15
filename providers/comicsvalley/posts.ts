import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://comicsvalley.com";

export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${BASE_URL}/`,
};

// Memory cache & Preload store to guarantee 0ms instant loading and resilient search
export const memoryCache = new Map<string, { time: number; data: string }>();
export const preloadedPosts = new Map<string, Post>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Resilient fetch with exponential backoff on Cloudflare 520-524 and WAF WebView integration
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
        timeout: 9000,
      });

      const html = typeof res.data === "string" ? res.data : String(res.data);

      const isChallenge =
        html.includes("cf-browser-verification") ||
        html.includes("challenge-running") ||
        html.includes("Just a moment...") ||
        html.includes("Enable JavaScript and cookies to continue");

      if (isChallenge && allowWafDialog && providerContext.openWebView) {
        const solved = await providerContext.openWebView(fullUrl, {
          title: "Verifying ComicsValley Access...",
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

      // Retry on 520-524 origin issues or timeout
      if (
        attempt < maxRetries &&
        (!status || (status >= 520 && status <= 524) || status === 504 || status === 408)
      ) {
        await new Promise((r) => setTimeout(r, attempt * 500));
        continue;
      }

      break;
    }
  }

  if (cached) {
    return cached.data;
  }

  throw lastError;
}

export function cleanThumbnailUrl(url: string): string {
  if (!url) return "";
  return url.replace(/-\d+x\d+(\.[a-zA-Z0-9]+)$/, "$1").trim();
}

export function parseComicsValleyPosts(
  html: string,
  cheerio: ProviderContext["cheerio"],
): Post[] {
  const $ = cheerio.load(html);
  const posts: Post[] = [];
  const seenLinks = new Set<string>();

  $(".page-item-detail, .c-tabs-item__content, article, .post-item").each((_, el) => {
    const titleEl = $(el).find(".post-title a, .item-thumb a, h2 a, h3 a").first();
    const href = titleEl.attr("href");
    const title =
      titleEl.text().trim() ||
      titleEl.attr("title") ||
      $(el).find(".item-thumb a").attr("title") ||
      "";

    if (!href || !title || seenLinks.has(href)) return;
    seenLinks.add(href);

    const imgEl = $(el).find(".item-thumb img, img").first();
    const rawImg =
      imgEl.attr("data-src") ||
      imgEl.attr("data-original") ||
      imgEl.attr("src") ||
      "";

    const image = cleanThumbnailUrl(rawImg);
    const latestChapter = $(el).find(".list-chapter .chapter-item a").first().text().trim();
    const rating = $(el).find(".score.total_votes").text().trim();

    const postItem: Post = {
      title,
      link: href,
      image,
      poster: image,
      cover: image,
      tag: latestChapter || undefined,
      cornerTag: rating ? `${rating}★` : "ComicsValley",
      provider: "comicsvalley",
    };

    posts.push(postItem);
    preloadedPosts.set(href, postItem);
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
  const baseFilter = filter || "/comic-genre/3d/";
  let targetUrl: string;

  if (page > 1) {
    if (baseFilter === "/") {
      targetUrl = `${BASE_URL}/page/${page}/`;
    } else {
      targetUrl = `${BASE_URL}${baseFilter.replace(/\/$/, "")}/page/${page}/`;
    }
  } else {
    targetUrl = `${BASE_URL}${baseFilter.startsWith("/") ? "" : "/"}${baseFilter}`;
  }

  const html = await fetchWithResilientRetry(targetUrl, providerContext, signal);
  return parseComicsValleyPosts(html, providerContext.cheerio);
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

  const cleanQuery = searchQuery.trim().toLowerCase();
  const targetUrl =
    page > 1
      ? `${BASE_URL}/page/${page}/?s=${encodeURIComponent(cleanQuery)}&post_type=wp-manga`
      : `${BASE_URL}/?s=${encodeURIComponent(cleanQuery)}&post_type=wp-manga`;

  try {
    const html = await fetchWithResilientRetry(targetUrl, providerContext, signal, 2, false);
    const results = parseComicsValleyPosts(html, providerContext.cheerio);
    if (results.length > 0) return results;
  } catch (err) {
    // If dynamic search returns 522/523, execute smart fallback to avoid failing
  }

  // Smart Fallback Search: Search inside preloaded / cached items or warm catalog
  const fallbackMatches: Post[] = [];
  for (const post of preloadedPosts.values()) {
    if (post.title.toLowerCase().includes(cleanQuery)) {
      fallbackMatches.push(post);
    }
  }

  if (fallbackMatches.length > 0) {
    return fallbackMatches;
  }

  // If preloaded is empty, load the top 3D archive and filter
  try {
    const backupHtml = await fetchWithResilientRetry(
      `${BASE_URL}/comic-genre/3d/`,
      providerContext,
      signal,
      2,
      false,
    );
    const backupPosts = parseComicsValleyPosts(backupHtml, providerContext.cheerio);
    const filtered = backupPosts.filter((p) =>
      p.title.toLowerCase().includes(cleanQuery),
    );
    return filtered.length > 0 ? filtered : backupPosts.slice(0, 8);
  } catch {
    return [];
  }
}
