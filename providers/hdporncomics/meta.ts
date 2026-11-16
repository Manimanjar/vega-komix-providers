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
  const title = $("h1.entry-title, h1").first().text().trim() || "Comic";
  const imgEl = $(".post-thumbnail img, .entry-content img, article img").first();
  let image = imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || imgEl.attr("src") || "";
  if (image.startsWith("//")) image = "https:" + image;
  else if (image.startsWith("/")) image = `${BASE_URL}${image}`;

  const synopsis = $(".entry-content p, .synopsis").first().text().trim() || `Read ${title} online.`;

  const tags: string[] = [];
  $('a[rel="tag"], .post-tags a').each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  // Check multi-chapter listing if any
  const chapterLinks: any[] = [];
  $(".chapter-list a, .listing-chapters_sub a, .wp-manga-chapter a").each((i, el) => {
    const chHref = $(el).attr("href");
    const chTitle = $(el).text().trim() || `Chapter ${i + 1}`;
    if (chHref) {
      chapterLinks.push({
        id: String(i + 1),
        title: chTitle,
        chapterNumber: i + 1,
        link: chHref,
        type: "comic",
      });
    }
  });

  const directLinks = chapterLinks.length > 0 ? chapterLinks : [
    {
      id: "1",
      title: title,
      chapterNumber: 1,
      link: fullUrl,
      type: "comic",
    },
  ];

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis,
    imdbId: fullUrl,
    type: "comic",
    tags: tags.length > 0 ? tags : ["Western", "Comics"],
    totalChapters: directLinks.length,
    linkList: [
      {
        title: "Chapters",
        directLinks,
      },
    ],
    chapters: directLinks,
    episodes: directLinks,
  };
}
