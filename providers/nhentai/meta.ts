import { Info, ProviderContext } from "../types";
import { BASE_URL } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullUrl = link.startsWith("http") ? link : `${BASE_URL}${link.startsWith("/") ? "" : "/"}${link}`;
  const idMatch = fullUrl.match(/\/g\/(\d+)/);
  const id = idMatch ? idMatch[1] : "";
  const apiUrl = `${BASE_URL}/api/gallery/${id}`;

  const res = await providerContext.axios.get(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/html, */*",
      Referer: `${BASE_URL}/`,
    },
    timeout: 15000,
  });

  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  const title = data.title?.pretty || data.title?.english || data.title?.japanese || `Gallery #${id}`;
  const ext = data.images?.cover?.t === "p" ? "png" : data.images?.cover?.t === "w" ? "webp" : "jpg";
  const image = data.media_id ? `https://t3.nhentai.net/galleries/${data.media_id}/cover.${ext}` : "";

  const tags: string[] = Array.isArray(data.tags)
    ? data.tags.map((t: any) => t.name).filter(Boolean)
    : ["Doujinshi", "Manga"];

  const numPages = data.num_pages || (Array.isArray(data.images?.pages) ? data.images.pages.length : 1);

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis: `Doujinshi gallery containing ${numPages} pages.`,
    imdbId: id,
    type: "comic",
    tags,
    totalChapters: 1,
    linkList: [
      {
        title: "Chapters",
        directLinks: [
          {
            id: "1",
            title: title,
            chapterNumber: 1,
            link: fullUrl,
            type: "comic",
          },
        ],
      },
    ],
    chapters: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
    episodes: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
  };
}
