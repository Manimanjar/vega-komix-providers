import { EpisodeLink, Info, ProviderContext } from "../types";
import { BASE_URL, fetchHtml } from "./posts";

export async function getMeta({
  link,
  provider = "manhwa18",
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
    $(".series-name, .story-name, h1").first().text().trim() ||
    $("title").text().replace(/ - .*$/, "").trim() ||
    "Untitled Manhwa";

  // Extract Cover Image
  const coverImg = $(
    ".series-cover img, .story-info-left img, img[src*='storage/images'], img[src*='covers'], .img-in-ratio"
  ).first();
  const coverSrc =
    coverImg.attr("src") ||
    coverImg.attr("data-src") ||
    coverImg.attr("data-bg") ||
    "";

  const image = coverSrc.startsWith("//")
    ? `https:${coverSrc}`
    : coverSrc.startsWith("http")
    ? coverSrc
    : `${BASE_URL}${coverSrc.startsWith("/") ? "" : "/"}${coverSrc}`;

  // Extract Synopsis
  const synopsis =
    $(".series-summary, .story-info-right-detail, .summary__content, .description-summary")
      .first()
      .text()
      .trim() || `${title} - 18+ Adult Webtoon & Manhwa`;

  // Extract Genres / Tags
  const tags: string[] = [];
  $(".series-genre a, .story-genre a, a[href*='/the-loai/']").each((_, el) => {
    const t = $(el).text().trim();
    if (t && !tags.includes(t)) tags.push(t);
  });
  if (tags.length === 0) tags.push("18+ Manhwa", "Webtoon");

  // Extract Chapters
  const chapters: EpisodeLink[] = [];
  const seenLinks = new Set<string>();

  $("ul.list-chapters a, .chapter-name a, a[href*='/chapter-']").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || seenLinks.has(href)) return;
    seenLinks.add(href);

    const fullHref = href.startsWith("http")
      ? href
      : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const rawTitle =
      $(el).text().replace(/\d+\s+view.*$/i, "").trim() ||
      $(el).attr("title") ||
      "Chapter";

    chapters.push({
      title: rawTitle,
      link: fullHref,
    });
  });

  // Reverse chapters so Chapter 1 is at index 0 if listed descending
  if (chapters.length > 1) {
    const firstTitle = chapters[0].title.toLowerCase();
    const lastTitle = chapters[chapters.length - 1].title.toLowerCase();
    if (firstTitle.includes("chapter") && lastTitle.includes("chapter 1")) {
      chapters.reverse();
    }
  }

  const mangaSlugMatch = fullLink.match(/\/manga\/([^/?#]+)/);
  const mangaSlug = mangaSlugMatch ? mangaSlugMatch[1] : "manhwa";

  return {
    title,
    image,
    poster: image,
    synopsis,
    imdbId: `manhwa18-${mangaSlug}`,
    type: "comic",
    status: "Ongoing",
    totalChapters: chapters.length,
    tags,
    linkList: [
      {
        title: "Chapters",
        link: fullLink,
        directLinks: chapters,
        episodes: chapters,
      },
    ],
  };
}
