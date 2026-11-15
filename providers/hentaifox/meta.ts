import { Info, ProviderContext } from "../types";
import { BASE_URL, fetchHtml } from "./posts";

export async function getMeta({
  link,
  provider = "hentaifox",
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
    $(".gallery_right .info h1, .gallery_info h1, h1").first().text().trim() ||
    $("title").text().replace(/ - .*$/, "").trim() ||
    "Untitled Gallery";

  // Extract Cover Image
  const coverImg =
    $(".gallery_left .cover img, .cover img, img[src*='cover.jpg']").first();
  const coverSrc =
    coverImg.attr("src") ||
    coverImg.attr("data-src") ||
    coverImg.attr("data-original") ||
    "";

  const image = coverSrc.startsWith("//")
    ? `https:${coverSrc}`
    : coverSrc.startsWith("http")
    ? coverSrc
    : `${BASE_URL}${coverSrc.startsWith("/") ? "" : "/"}${coverSrc}`;

  // Extract Metadata Tags
  const extractTags = (selector: string): string[] => {
    const list: string[] = [];
    $(selector).each((_, el) => {
      const text = $(el).text().replace(/\(\d+\)/g, "").trim();
      if (text) list.push(text);
    });
    return Array.from(new Set(list));
  };

  const artists = extractTags(".artists a.tag_btn, .artists a");
  const parodies = extractTags(".parodies a.tag_btn, .parodies a");
  const tags = extractTags(".tags a.tag_btn, .tags a");
  const characters = extractTags(".characters a.tag_btn, .characters a");
  const languages = extractTags(".languages a.tag_btn, .languages a");

  const pageCountText =
    $(".pages a.tag_btn, .pages, .total_pages").first().text() || "";
  const totalPages = parseInt(pageCountText.replace(/\D/g, ""), 10) || 1;

  const artist = artists.length > 0 ? artists.join(", ") : undefined;
  const author = artist;

  const combinedTags = [
    ...tags,
    ...parodies.map((p) => `Parody: ${p}`),
    ...characters.map((c) => `Char: ${c}`),
    ...languages,
  ];

  const galleryIdMatch = fullLink.match(/\/gallery\/(\d+)/);
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
    imdbId: `hentaifox-${galleryId}`,
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
