import { Info, ProviderContext } from "../types";
import { BASE_URL, fetchWithWafFallback } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  provider?: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const html = await fetchWithWafFallback(link, providerContext);
  const $ = providerContext.cheerio.load(html);

  // Extract Titles
  const mainTitle =
    $("h1.title, #info h1, .gallery-info h1").first().text().trim() ||
    $("title").text().replace(/ - .*$/, "").trim() ||
    "Untitled Gallery";

  const subTitle =
    $("h2.title, #info h2, .gallery-info h2").first().text().trim() || undefined;

  // Extract Cover Image
  const coverEl = $("#cover img, .cover img, .gallery-cover img").first();
  const coverSrc =
    coverEl.attr("data-src") ||
    coverEl.attr("data-original") ||
    coverEl.attr("src") ||
    "";

  const image = coverSrc.startsWith("//")
    ? `https:${coverSrc}`
    : coverSrc.startsWith("http")
    ? coverSrc
    : `${BASE_URL}${coverSrc.startsWith("/") ? "" : "/"}${coverSrc}`;

  // Helper to extract tag pills from labeled containers
  const extractTagsByLabel = (label: string): string[] => {
    const results: string[] = [];
    const containers = $(".tag-container, .tags, .meta-row, .field");

    containers.each((_, el) => {
      const container = $(el);
      const text = container.text().toLowerCase();
      if (text.includes(label.toLowerCase())) {
        container.find("a.tag, .name, a").each((__, tagEl) => {
          const tagName = $(tagEl).find(".name").text().trim() || $(tagEl).text().trim();
          if (tagName && !tagName.toLowerCase().includes(label.toLowerCase())) {
            results.push(tagName);
          }
        });
      }
    });

    return Array.from(new Set(results));
  };

  const tags = extractTagsByLabel("Tags");
  const parodies = extractTagsByLabel("Parodies");
  const artists = extractTagsByLabel("Artists");
  const characters = extractTagsByLabel("Characters");
  const languages = extractTagsByLabel("Languages");
  const pageCountText = extractTagsByLabel("Pages")[0] || "";
  const pageCount = parseInt(pageCountText.replace(/\D/g, ""), 10) || undefined;

  const artist = artists.length > 0 ? artists.join(", ") : undefined;
  const author = artist;

  // Build combined tag list including parodies and characters
  const allTags = [
    ...tags,
    ...parodies.map(p => `Parody: ${p}`),
    ...characters.map(c => `Char: ${c}`),
  ];

  const synopsis =
    subTitle ||
    `Gallery containing ${pageCount ? `${pageCount} pages` : "complete set"}${
      languages.length > 0 ? ` in ${languages.join(", ")}` : ""
    }.`;

  // Support single-room series collection: check if multiple chapters or single gallery
  const chapterElements = $(".chapters a, .chapter-list a, .volume-list a");
  const directLinks = [];

  if (chapterElements.length > 0) {
    chapterElements.each((idx, el) => {
      const chEl = $(el);
      const chHref = chEl.attr("href") || "";
      const chTitle = chEl.text().trim() || `Chapter ${idx + 1}`;
      const fullChLink = chHref.startsWith("http")
        ? chHref
        : `${BASE_URL}${chHref.startsWith("/") ? "" : "/"}${chHref}`;

      directLinks.push({
        title: chTitle,
        link: fullChLink,
      });
    });
  }

  if (directLinks.length === 0) {
    directLinks.push({
      title: `Read Gallery${pageCount ? ` (${pageCount} pages)` : ""}`,
      link,
    });
  }

  return {
    title: mainTitle,
    image,
    poster: image,
    cover: image,
    synopsis,
    imdbId: link,
    type: "comic",
    author,
    artist,
    status: "COMPLETED",
    totalChapters: directLinks.length,
    tags: allTags.length > 0 ? allTags : ["Doujinshi", "Manga"],
    linkList: [
      {
        title: "Gallery Reader",
        directLinks,
      },
    ],
  };
}
