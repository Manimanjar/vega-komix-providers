import { Info, ProviderContext } from "../types";
import { BASE_URL, fetchHtml } from "./posts";

export async function getMeta({
  link,
  provider = "nhentai",
  providerContext,
}: {
  link: string;
  provider?: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullLink = link.startsWith("http")
    ? link
    : `${BASE_URL}${link.startsWith("/") ? "" : "/"}${link}`;

  const html = await fetchHtml(fullLink, providerContext);
  const $ = providerContext.cheerio.load(html);

  // Extract Title
  const title =
    $("h1").first().text().replace(/Report gallery/gi, "").trim() ||
    $("title").text().replace(/ - .*$/, "").trim() ||
    "Untitled Doujinshi";

  // Extract Cover Image
  const coverImg = $(
    "img[src*='cover.jpg'], img[data-src*='cover.jpg'], #cover img, .cover img"
  ).first();
  const coverSrc = coverImg.attr("src") || coverImg.attr("data-src") || "";

  const image = coverSrc.startsWith("//")
    ? `https:${coverSrc}`
    : coverSrc.startsWith("http")
    ? coverSrc
    : `${BASE_URL}${coverSrc.startsWith("/") ? "" : "/"}${coverSrc}`;

  // Extract tags, artists, parodies
  const extractTags = (pattern: string): string[] => {
    const list: string[] = [];
    $(`a[href*='${pattern}']`).each((_, el) => {
      const text = $(el).find(".name").text().trim() || $(el).text().replace(/\(\d+\)/g, "").trim();
      if (text && text.length > 1 && !text.includes("Report")) list.push(text);
    });
    return Array.from(new Set(list));
  };

  const artists = extractTags("/artist/");
  const parodies = extractTags("/parody/");
  const tags = extractTags("/tag/");
  const characters = extractTags("/character/");
  const languages = extractTags("/language/");

  const thumbsCount = $("img[src*='t.jpg'], img[src*='t.webp']").length;
  const totalPages = Math.max(1, thumbsCount);

  const artist = artists.length > 0 ? artists.join(", ") : undefined;
  const author = artist;

  const combinedTags = [
    ...tags,
    ...parodies.map((p) => `Parody: ${p}`),
    ...characters.map((c) => `Char: ${c}`),
    ...languages,
  ];

  const galleryIdMatch = fullLink.match(/\/g\/(\d+)/);
  const galleryId = galleryIdMatch ? galleryIdMatch[1] : "gallery";

  const directList = [
    {
      title: `Full Gallery (${totalPages} Pages)`,
      link: fullLink,
    },
  ];

  return {
    title,
    image,
    poster: image,
    synopsis: `${title}\n\nArtist: ${artist || "Unknown"}\nParody: ${
      parodies.join(", ") || "Original"
    }\nPages: ${totalPages}\nLanguage: ${languages.join(", ") || "Japanese"}`,
    imdbId: `nhentai-${galleryId}`,
    type: "comic",
    author,
    artist,
    status: "Completed",
    totalChapters: 1,
    tags: combinedTags,
    linkList: [
      {
        title: "Chapters",
        link: fullLink,
        directLinks: directList,
        episodes: directList,
      },
    ],
  };
}
