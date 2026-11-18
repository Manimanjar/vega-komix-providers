import { Info, ProviderContext } from "../types";
import { BASE_URL, API_URL, decodeEntities } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullUrl = link.startsWith("http") ? link : `${BASE_URL}${link.startsWith("/") ? "" : "/"}${link}`;
  const m = fullUrl.match(/\/g\/(\d+)\/([a-f0-9]+)/i);

  let title = "Gallery";
  let image = "";
  let tags: string[] = ["Western Comics", "Doujinshi"];
  let filecount = 1;
  // Real star rating from the gdata API (set below); E-Hentai shows no
  // public view count, so `views` stays unset.
  let rating: string | undefined;

  if (m) {
    const gid = parseInt(m[1], 10);
    const token = m[2];
    try {
      const apiRes = await providerContext.axios.post(API_URL, {
        method: "gdata",
        gidlist: [[gid, token]],
        namespace: 1,
      }, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          Accept: "application/json, */*",
        },
        timeout: 15000,
      });

      const gdata = apiRes.data?.gmetadata?.[0];
      if (gdata) {
        title = decodeEntities(gdata.title || gdata.title_jpn || title);
        image = gdata.thumb || image;
        if (Array.isArray(gdata.tags) && gdata.tags.length > 0) {
          tags = gdata.tags;
        }
        if (gdata.filecount) {
          filecount = parseInt(gdata.filecount, 10);
        }
        // Real star rating from the official API (user, 2026-11-18).
        if (typeof gdata.rating === "number" && gdata.rating > 0) {
          rating = String(Math.round(gdata.rating * 10) / 10);
        } else if (typeof gdata.rating === "string") {
          const r = parseFloat(gdata.rating);
          if (Number.isFinite(r) && r > 0) rating = String(Math.round(r * 10) / 10);
        }
      }
    } catch {}
  }

  if (!image) {
    try {
      const htmlRes = await providerContext.axios.get(fullUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          Referer: `${BASE_URL}/`,
        },
        timeout: 15000,
      });
      const $ = providerContext.cheerio.load(htmlRes.data);
      title = decodeEntities($("#gn").text().trim() || $("#gj").text().trim() || title);
      const imgStyle = $("#gd1 div").attr("style") || "";
      const bgMatch = imgStyle.match(/url\(([^)]+)\)/);
      if (bgMatch) image = bgMatch[1].replace(/['"]/g, "");
    } catch {}
  }

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis: `Read ${title} with ${filecount} pages.`,
    imdbId: fullUrl,
    type: "comic",
    tags,
    rating,
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
