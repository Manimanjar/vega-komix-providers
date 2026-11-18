import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://8muses.io";

export const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${BASE_URL}/`,
};

/**
 * Extract items from 8muses HTML using both Next.js JSON state and DOM selectors
 */
export function parse8MusesHtml(
  html: string,
  cheerio: ProviderContext["cheerio"],
): Post[] {
  const posts: Post[] = [];
  const seenIds = new Set<string>();

  // 1. Primary Strategy: Extract Next.js embedded state JSON objects
  const jsonRegex = /\{"id":"(\d+)","slug":"([^"]+)","title":"([^"]+)"[^}]*\}/g;
  let match: RegExpExecArray | null;
  while ((match = jsonRegex.exec(html)) !== null) {
    try {
      const item = JSON.parse(match[0]);
      if (item && item.id && !seenIds.has(String(item.id))) {
        seenIds.add(String(item.id));

        let cover = item.coverUrl || "";
        if (cover.startsWith("/")) {
          cover = `${BASE_URL}${cover}`;
        }

        const postImg = cover || `${BASE_URL}/api/legacy-media/${item.id}/cover`;
        posts.push({
          title: item.title,
          link: `${BASE_URL}/g/${item.id}`,
          image: postImg,
          poster: postImg,
          cover: postImg,
          tag: item.pages ? `${item.pages}P` : undefined,
          cornerTag: item.author || "8Muses",
          provider: "eightMuses",
          // Each album is a single album = 1 chapter. 8Muses shows no
          // star rating or view count, so those stay unset (2026-11-18).
          chapterCount: 1,
        });
      }
    } catch {}
  }

  // 2. Secondary Strategy: Cheerio DOM fallback (used by tag pages and
  // search, which embed no Next.js JSON state). A card is
  // <a class="grid-card" href="/g/{id}"> with the clean title in a <strong>
  // and the cover in <img class="cover__image">. Do NOT use the anchor's
  // full text: it includes decorative badge letters ("T" + "NEW") from the
  // cover spans.
  if (posts.length === 0) {
    const $ = cheerio.load(html);
    $('a[href^="/g/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const idMatch = href.match(/\/g\/(\d+)/);
      const id = idMatch ? idMatch[1] : "";
      if (!id || seenIds.has(id)) return;
      seenIds.add(id);

      const title =
        $(el).find("strong").first().text().trim() ||
        ($(el).find(".cover").attr("aria-label") || "").replace(/\s+cover\s*$/i, "").trim() ||
        $(el).find("img").first().attr("alt") ||
        $(el).attr("title") ||
        `Comic #${id}`;

      const rawImg =
        $(el).find("img").attr("data-src") ||
        $(el).find("img").attr("src") ||
        "";

      let cover = rawImg;
      if (cover.startsWith("/")) {
        cover = `${BASE_URL}${cover}`;
      } else if (!cover) {
        cover = `${BASE_URL}/api/legacy-media/${id}/cover`;
      }

      posts.push({
        title,
        link: `${BASE_URL}/g/${id}`,
        image: cover,
        poster: cover,
        cover: cover,
        provider: "eightMuses",
        cornerTag: "8Muses",
        chapterCount: 1,
      });
    });
  }

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
  const path = filter || "/popular";
  const separator = path.includes("?") ? "&" : "?";
  const targetUrl = `${BASE_URL}${path}${separator}page=${page}`;

  const res = await providerContext.axios.get(targetUrl, {
    headers: {
      ...COMMON_HEADERS,
      ...providerContext.commonHeaders,
    },
    signal,
    timeout: 15000,
  });

  const html = typeof res.data === "string" ? res.data : String(res.data);
  return parse8MusesHtml(html, providerContext.cheerio);
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

  const targetUrl = `${BASE_URL}/search?q=${encodeURIComponent(
    searchQuery.trim(),
  )}&page=${page}`;

  const res = await providerContext.axios.get(targetUrl, {
    headers: {
      ...COMMON_HEADERS,
      ...providerContext.commonHeaders,
    },
    signal,
    timeout: 15000,
  });

  const html = typeof res.data === "string" ? res.data : String(res.data);
  return parse8MusesHtml(html, providerContext.cheerio);
}
