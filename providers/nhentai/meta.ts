import { Info, ProviderContext } from "../types";
import { API_V2, BASE_URL, THUMB_HOST } from "./posts";

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "application/json, text/html, */*",
  Referer: "https://nhentai.net/",
};

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

  const res = await providerContext.axios.get(`${API_V2}/galleries/${id}`, {
    headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
    timeout: 20000,
  });
  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  if (data?.error) throw new Error(`nhentai v2: ${data.error}`);

  const title =
    data.title?.pretty || data.title?.english || data.title?.japanese || `Gallery #${id}`;
  const coverPath =
    typeof data.cover === "string" ? data.cover : data.cover?.path || data.thumbnail?.path || "";
  const image = coverPath ? `${THUMB_HOST}/${coverPath.replace(/^\/+/, "")}` : "";

  const tags: string[] = Array.isArray(data.tags)
    ? data.tags.map((t: any) => t.name).filter(Boolean)
    : [];
  const artists: string[] = Array.isArray(data.tags)
    ? data.tags.filter((t: any) => t.type === "artist").map((t: any) => t.name)
    : [];
  const parodies: string[] = Array.isArray(data.tags)
    ? data.tags.filter((t: any) => t.type === "parody").map((t: any) => t.name)
    : [];
  const numPages = data.num_pages || (Array.isArray(data.pages) ? data.pages.length : 1);

  const synopsisParts = [`Doujinshi gallery containing ${numPages} pages.`];
  if (artists.length) synopsisParts.push(`Artist: ${artists.join(", ")}.`);
  if (parodies.length) synopsisParts.push(`Parody: ${parodies.join(", ")}.`);

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis: synopsisParts.join(" "),
    imdbId: id,
    type: "comic",
    tags,
    cast: artists,
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
