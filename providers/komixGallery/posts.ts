import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://komixgallery.com";

/**
 * Fetch HTML with automatic Cloudflare WAF WebView challenge fallback
 */
export async function fetchWithWafFallback(
  targetUrl: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<string> {
  const fullUrl = targetUrl.startsWith("http")
    ? targetUrl
    : `${BASE_URL}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;

  try {
    const res = await providerContext.axios.get(fullUrl, {
      headers: {
        ...providerContext.commonHeaders,
        Referer: `${BASE_URL}/`,
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      },
      signal,
      timeout: 10000,
    });

    const html = typeof res.data === "string" ? res.data : String(res.data);

    // Check for Cloudflare challenge signature in HTML
    const isChallenge =
      html.includes("cf-browser-verification") ||
      html.includes("challenge-running") ||
      html.includes("Just a moment...") ||
      html.includes("Enable JavaScript and cookies to continue");

    if (isChallenge && providerContext.openWebView) {
      const solved = await providerContext.openWebView(fullUrl, {
        title: "Verifying Gallery Access...",
        description: "Please complete the verification challenge to continue.",
        timeoutMs: 45000,
      });
      return solved.data;
    }

    return html;
  } catch (err: any) {
    const status = err?.response?.status;
    if ((status === 403 || status === 503) && providerContext.openWebView) {
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
 * Parse gallery cards from HTML using Cheerio
 */
function parseGalleryCards(
  html: string,
  providerValue: string,
  cheerio: ProviderContext["cheerio"],
): Post[] {
  const $ = cheerio.load(html);
  const posts: Post[] = [];

  const items = $(".gallery, .thumb, .gallery-card, .book-item, article.item");

  items.each((_, el) => {
    const card = $(el);
    const linkEl = card.is("a") ? card : card.find("a").first();
    const href = linkEl.attr("href");
    if (!href) return;

    const fullLink = href.startsWith("http")
      ? href
      : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const title =
      card.find(".caption, .title, .gallery-title, h2, h3").first().text().trim() ||
      linkEl.attr("title") ||
      "Untitled Gallery";

    const imgEl = card.find("img").first();
    const imageSrc =
      imgEl.attr("data-src") ||
      imgEl.attr("data-original") ||
      imgEl.attr("src") ||
      "";

    const image = imageSrc.startsWith("//")
      ? `https:${imageSrc}`
      : imageSrc.startsWith("http")
      ? imageSrc
      : `${BASE_URL}${imageSrc.startsWith("/") ? "" : "/"}${imageSrc}`;

    const tag = card.find(".tag, .badge, .language").first().text().trim() || undefined;

    posts.push({
      title,
      link: fullLink,
      image,
      provider: providerValue,
      tag,
      aspectRatio: 2 / 3,
    });
  });

  return posts;
}

export async function getPosts({
  filter,
  page = 1,
  providerValue,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  providerValue: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  let endpoint = `${BASE_URL}/`;

  if (filter === "popular") {
    endpoint = `${BASE_URL}/popular?page=${page}`;
  } else if (filter === "top-rated") {
    endpoint = `${BASE_URL}/top?page=${page}`;
  } else if (filter?.startsWith("language:")) {
    const lang = filter.replace("language:", "");
    endpoint = `${BASE_URL}/language/${lang}/?page=${page}`;
  } else if (filter?.startsWith("category:")) {
    const cat = filter.replace("category:", "");
    endpoint = `${BASE_URL}/category/${cat}/?page=${page}`;
  } else if (filter?.startsWith("tag:")) {
    const tag = filter.replace("tag:", "");
    endpoint = `${BASE_URL}/tag/${tag}/?page=${page}`;
  } else {
    endpoint = `${BASE_URL}/?page=${page}`;
  }

  try {
    const html = await fetchWithWafFallback(endpoint, providerContext, signal);
    return parseGalleryCards(html, providerValue, providerContext.cheerio);
  } catch {
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerValue: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const query = encodeURIComponent(searchQuery.trim());
  const endpoint = `${BASE_URL}/search/?q=${query}&page=${page}`;

  try {
    const html = await fetchWithWafFallback(endpoint, providerContext, signal);
    return parseGalleryCards(html, providerValue, providerContext.cheerio);
  } catch {
    return [];
  }
}
