import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://nhentai.xxx";

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

export function parseNHentaiCards(
  html: string,
  providerValue: string,
  cheerio: ProviderContext["cheerio"]
): Post[] {
  const $ = cheerio.load(html);
  const posts: Post[] = [];
  const seenHrefs = new Set<string>();

  $("a[href^='/g/'], .gallery a, .thumb a").each((_, el) => {
    const linkEl = $(el);
    const href = linkEl.attr("href");
    if (!href || seenHrefs.has(href)) return;
    seenHrefs.add(href);

    const fullLink = href.startsWith("http")
      ? href
      : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const title =
      linkEl
        .text()
        .replace(/NEW/g, "")
        .replace(/\s+/g, " ")
        .trim() ||
      linkEl.attr("title") ||
      "Untitled Doujinshi";

    if (!title || title.length < 3) return;

    const imgEl = linkEl.find("img").first();
    const imageSrc =
      imgEl.attr("data-src") ||
      imgEl.attr("data-original") ||
      imgEl.attr("src") ||
      "";

    if (!imageSrc) return;

    const image = imageSrc.startsWith("//")
      ? `https:${imageSrc}`
      : imageSrc.startsWith("http")
      ? imageSrc
      : `${BASE_URL}${imageSrc.startsWith("/") ? "" : "/"}${imageSrc}`;

    let tag = "Doujinshi";
    if (title.toLowerCase().includes("[english]")) tag = "English";
    else if (title.toLowerCase().includes("[chinese]")) tag = "Chinese";
    else if (title.toLowerCase().includes("[japanese]")) tag = "Japanese";

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
  providerValue = "nhentai",
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  let endpoint = BASE_URL;

  if (filter === "popular") {
    endpoint = `${BASE_URL}/?sort=popular&page=${page}`;
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
    endpoint = page > 1 ? `${BASE_URL}/?page=${page}` : `${BASE_URL}/`;
  }

  const html = await fetchHtml(endpoint, providerContext, signal);
  return parseNHentaiCards(html, providerValue, providerContext.cheerio);
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  providerValue = "nhentai",
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
  const endpoint = `${BASE_URL}/search/?q=${query}&page=${page}`;
  const html = await fetchHtml(endpoint, providerContext, signal);
  return parseNHentaiCards(html, providerValue, providerContext.cheerio);
}
