import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://hentaifox.com";

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

export function parseHentaiFoxCards(
  html: string,
  providerValue: string,
  cheerio: ProviderContext["cheerio"]
): Post[] {
  const $ = cheerio.load(html);
  const posts: Post[] = [];

  $(".lc_galleries .thumb, .gallery-item, .thumb").each((_, el) => {
    const card = $(el);
    const linkEl = card
      .find(".inner_thumb a, .g_title a, a[href*='/gallery/']")
      .first();
    const href = linkEl.attr("href");
    if (!href || href === "#" || !href.includes("/gallery/")) return;

    const fullLink = href.startsWith("http")
      ? href
      : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const title =
      card.find(".g_title a, .caption, h2").first().text().trim() ||
      linkEl.attr("title") ||
      "Untitled Doujinshi";

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
      card.find(".t_cat, .tag, .badge").first().text().trim() || "Doujinshi";

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
  providerValue = "hentaifox",
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
    endpoint = page > 1 ? `${BASE_URL}/popular/pag/${page}/` : `${BASE_URL}/popular/`;
  } else if (filter?.startsWith("category:")) {
    const cat = filter.replace("category:", "");
    endpoint = page > 1 ? `${BASE_URL}/category/${cat}/pag/${page}/` : `${BASE_URL}/category/${cat}/`;
  } else if (filter?.startsWith("language:")) {
    const lang = filter.replace("language:", "");
    endpoint = page > 1 ? `${BASE_URL}/language/${lang}/pag/${page}/` : `${BASE_URL}/language/${lang}/`;
  } else if (filter?.startsWith("parody:")) {
    const p = filter.replace("parody:", "");
    endpoint = page > 1 ? `${BASE_URL}/parody/${p}/pag/${page}/` : `${BASE_URL}/parody/${p}/`;
  } else if (filter?.startsWith("artist:")) {
    const a = filter.replace("artist:", "");
    endpoint = page > 1 ? `${BASE_URL}/artist/${a}/pag/${page}/` : `${BASE_URL}/artist/${a}/`;
  } else {
    endpoint = page > 1 ? `${BASE_URL}/pag/${page}/` : `${BASE_URL}/`;
  }

  const html = await fetchHtml(endpoint, providerContext, signal);
  return parseHentaiFoxCards(html, providerValue, providerContext.cheerio);
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  providerValue = "hentaifox",
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
  return parseHentaiFoxCards(html, providerValue, providerContext.cheerio);
}
