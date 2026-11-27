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
    // Cloudflare also just drops connections (socket hang up / reset, no
    // response at all) for blocked networks — treat a response-less failure
    // as a possible WAF block too, so the WebView gets a chance to solve it.
    const noResponse = !err?.response;
    if ((status === 403 || status === 503 || noResponse) && allowWafDialog && providerContext.openWebView) {
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

import { cleanHighResImageUrl, cleanThumbnailUrl } from "../cleanImage";
export { cleanHighResImageUrl, cleanThumbnailUrl };

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
    // Rating & chapter count as proper fields (user, 2026-11-18): the
    // rating is the site's score (e.g. "4.5"), the chapter count is
    // the number in the latest-chapter label (e.g. "Chapter 12" -> 12).
    // cornerTag keeps showing the star so the card looks the same.
    const ratingNum = rating ? parseFloat(rating) : NaN;
    const chapterMatch = latestChapter.match(/(\d+)/);
    const chapterCount = chapterMatch
      ? parseInt(chapterMatch[1], 10)
      : undefined;

    posts.push({
      title,
      link: href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`,
      image,
      poster: image,
      cover: image,
      tag: latestChapter || undefined,
      cornerTag: rating ? `${rating}★` : "HD",
      provider: providerValue,
      rating: Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum : undefined,
      chapterCount,
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
      const queryPart = baseFilter.includes("?")
        ? baseFilter.substring(baseFilter.indexOf("?"))
        : "";
      targetUrl = `${BASE_URL}/porncomic/page/${page}/${queryPart}`;
    } else if (baseFilter.includes("?")) {
      targetUrl = `${BASE_URL}${baseFilter}&page=${page}`;
    } else {
      targetUrl = `${BASE_URL}${baseFilter.replace(/\/$/, "")}/page/${page}/`;
    }
  } else {
    targetUrl = `${BASE_URL}${baseFilter.startsWith("/") ? "" : "/"}${baseFilter}`;
  }

  // Cloudflare blocks this site's API for many networks (403 on every
  // request). The app's WAF WebView solves the challenge once (with the
  // user's consent) and the cookies persist, so listings load after that.
  // allowWafDialog was false here (and in meta/stream) which left the
  // provider permanently dead whenever Cloudflare challenged.
  const html = await fetchWithWafFallback(targetUrl, providerContext, signal, true);
  const posts = parseMadaraPosts(html, providerContext.cheerio, "allporncomic");
  if (posts.length > 0) return posts;

  // Genre/category fallback (user, 2026-11-18): the site's taxonomy is
  // /porncomic-category/<slug>/, NOT /porncomic-genre/<slug>/ — the
  // genre URLs redirect to the site's 404 page and the tag URLs
  // redirect to the homepage, both returning 0 cards. Verified live
  // 2026-11-18: Incest lives at /porncomic-category/inceste/ (1,701
  // comics) and Family at /porncomic-category/familya/ (73 comics).
  // The catalog now uses those URLs directly; this fallback catches
  // any other genre filter that still comes back empty by retrying it
  // under the category taxonomy, then by the site's own search.
  const genreMatch = baseFilter.match(/^\/porncomic-genre\/([^/]+)\/?$/);
  if (genreMatch && page <= 1) {
    const catUrl = `${BASE_URL}/porncomic-category/${genreMatch[1]}/`;
    try {
      const catHtml = await fetchWithWafFallback(catUrl, providerContext, signal, true);
      const catPosts = parseMadaraPosts(catHtml, providerContext.cheerio, "allporncomic");
      if (catPosts.length > 0) return catPosts;
    } catch {
      // fall through to the search fallback below
    }
    // Last resort: the site's own search for the slug — it matches
    // titles, tags and descriptions, so incest/family comics surface
    // even if neither archive URL exists.
    try {
      const searchHtml = await fetchWithWafFallback(
        `${BASE_URL}/?s=${encodeURIComponent(genreMatch[1])}&post_type=wp-manga`,
        providerContext,
        signal,
        true,
      );
      return parseMadaraPosts(searchHtml, providerContext.cheerio, "allporncomic");
    } catch {
      return posts;
    }
  }
  return posts;
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
    const html = await fetchWithWafFallback(targetUrl, providerContext, signal, true);
    return parseMadaraPosts(html, providerContext.cheerio, "allporncomic");
  } catch (err) {
    console.warn("[AllPornComic] Non-fatal search error (silenced background popup):", err);
    return [];
  }
}
