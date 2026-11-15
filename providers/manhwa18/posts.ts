import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://manhwa18.com";

export async function fetchHtml(
  targetUrl: string,
  providerContext: ProviderContext,
  signal?: AbortSignal
): Promise<string> {
  const fullUrl = targetUrl.startsWith("http")
    ? targetUrl
    : `${BASE_URL}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;

  const headers = {
    ...providerContext.commonHeaders,
    Referer: `${BASE_URL}/`,
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  };

  try {
    const res = await providerContext.axios.get(fullUrl, {
      headers,
      signal,
      timeout: 12000,
    });
    const html = typeof res.data === "string" ? res.data : String(res.data);

    if (
      (html.includes("cf-browser-verification") ||
        html.includes("challenge-running") ||
        html.includes("Just a moment...")) &&
      providerContext.openWebView
    ) {
      const solved = await providerContext.openWebView(fullUrl);
      return solved.data;
    }

    return html;
  } catch (err: any) {
    if (
      (err.response?.status === 403 || err.response?.status === 503) &&
      providerContext.openWebView
    ) {
      const solved = await providerContext.openWebView(fullUrl);
      return solved.data;
    }
    throw err;
  }
}

export function parseManhwa18Cards(
  html: string,
  providerValue: string,
  cheerio: ProviderContext["cheerio"]
): Post[] {
  const $ = cheerio.load(html);
  const posts: Post[] = [];
  const seenLinks = new Set<string>();

  $(".thumb-item-flow, .manga-item, .story-item").each((_, el) => {
    const card = $(el);
    const linkEl = card.find(".series-title a, a[href*='/manga/'], a").first();
    const href = linkEl.attr("href");
    if (!href || href === "#" || seenLinks.has(href)) return;
    seenLinks.add(href);

    const fullLink = href.startsWith("http")
      ? href
      : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const title =
      card.find(".series-title a").first().attr("title") ||
      card.find(".series-title a, .story-name, h3, a").first().text().trim() ||
      linkEl.attr("title") ||
      "Untitled Manhwa";

    const bgEl = card.find(".lazy-bg, .content").first();
    const imgEl = card.find("img").first();
    const imageSrc =
      bgEl.attr("data-bg") ||
      imgEl.attr("data-src") ||
      imgEl.attr("data-original") ||
      imgEl.attr("src") ||
      "";

    const image = imageSrc.startsWith("//")
      ? `https:${imageSrc}`
      : imageSrc.startsWith("http")
      ? imageSrc
      : `${BASE_URL}${imageSrc.startsWith("/") ? "" : "/"}${imageSrc}`;

    const latestChapter =
      card.find(".chapter-title a").first().text().trim() || undefined;

    posts.push({
      title,
      link: fullLink,
      image,
      provider: providerValue,
      tag: latestChapter || "18+ Manhwa",
      cornerTag: "18+",
      aspectRatio: 2 / 3,
    });
  });

  return posts;
}

export async function getPosts({
  filter,
  page = 1,
  providerValue = "manhwa18",
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  let endpoint = `${BASE_URL}/manga-list?sort=new&page=${page}`;

  if (filter === "popular") {
    endpoint = `${BASE_URL}/ranking?page=${page}`;
  } else if (filter?.startsWith("genre:")) {
    const genre = filter.replace("genre:", "");
    endpoint = `${BASE_URL}/genre/${genre}?page=${page}`;
  } else if (filter === "latest") {
    endpoint = `${BASE_URL}/manga-list?sort=new&page=${page}`;
  }

  const html = await fetchHtml(endpoint, providerContext, signal);
  return parseManhwa18Cards(html, providerValue, providerContext.cheerio);
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  providerValue = "manhwa18",
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const query = encodeURIComponent(searchQuery.trim());
  const endpoint = `${BASE_URL}/tim-kiem?q=${query}&page=${page}`;
  const html = await fetchHtml(endpoint, providerContext, signal);
  return parseManhwa18Cards(html, providerValue, providerContext.cheerio);
}
