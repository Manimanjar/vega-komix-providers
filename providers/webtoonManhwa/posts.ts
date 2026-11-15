import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://asuracomic.net";

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

    const isChallenge =
      html.includes("cf-browser-verification") ||
      html.includes("challenge-running") ||
      html.includes("Just a moment...") ||
      html.includes("Enable JavaScript and cookies to continue");

    if (isChallenge && providerContext.openWebView) {
      const solved = await providerContext.openWebView(fullUrl, {
        title: "Verifying Webtoon Access...",
        description: "Cloudflare challenge detected. Please wait while verification completes.",
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
 * Parse manhwa cards from HTML
 */
function parseManhwaCards(
  html: string,
  providerValue: string,
  cheerio: ProviderContext["cheerio"],
): Post[] {
  const $ = cheerio.load(html);
  const posts: Post[] = [];

  const items = $(".listupd .bsx, .manga-item, .page-item-detail, .col-6, article.bs");

  items.each((_, el) => {
    const card = $(el);
    const linkEl = card.find("a").first();
    const href = linkEl.attr("href");
    if (!href) return;

    const fullLink = href.startsWith("http")
      ? href
      : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const title =
      card.find(".tt, .title, h4, h3, .bigor .tt").first().text().trim() ||
      linkEl.attr("title") ||
      "Untitled Manhwa";

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

    const tag =
      card.find(".epxs, .chapter, .adds .epx").first().text().trim() ||
      card.find(".numscore").first().text().trim() ||
      undefined;

    posts.push({
      title,
      link: fullLink,
      image,
      poster: image,
      cover: image,
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
  let endpoint = `${BASE_URL}/series?page=${page}`;

  if (filter?.includes("order=")) {
    endpoint = `${BASE_URL}/series?${filter}&page=${page}`;
  } else if (filter?.includes("genre=")) {
    endpoint = `${BASE_URL}/series?${filter}&page=${page}`;
  }

  try {
    const html = await fetchWithWafFallback(endpoint, providerContext, signal);
    return parseManhwaCards(html, providerValue, providerContext.cheerio);
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
  const endpoint = `${BASE_URL}/series?name=${query}&page=${page}`;

  try {
    const html = await fetchWithWafFallback(endpoint, providerContext, signal);
    return parseManhwaCards(html, providerValue, providerContext.cheerio);
  } catch {
    return [];
  }
}
