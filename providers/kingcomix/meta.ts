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
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: `${BASE_URL}/`,
    },
    timeout: 15000,
  });

  const $ = providerContext.cheerio.load(res.data);
  const title = $("h1.entry-title, h1").first().text().trim() || "Western Comic";
  const imgEl = $(".entry-content img, .post-thumbnail img, article img").first();
  let image = imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || imgEl.attr("src") || "";
  if (image.startsWith("//")) image = "https:" + image;
  else if (image.startsWith("/")) image = `${BASE_URL}${image}`;

  const tags: string[] = [];
  $('a[rel="category tag"], a[rel="tag"]').each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis: `Read complete comic of ${title}.`,
    imdbId: fullUrl,
    type: "comic",
    tags: tags.length > 0 ? tags : ["Western", "3D Comics"],
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
